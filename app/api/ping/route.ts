/**
 * Keep-warm ping endpoint — Node.js runtime (intentional).
 *
 * Warms TWO runtimes in one call:
 *   1. This API route's own Node.js function (by being called).
 *   2. The main Next.js page-rendering runtime (by self-fetching /login).
 *
 * WHY self-fetch /login:
 *   /api/ping alone is a tiny function. The full Next.js runtime that handles
 *   layouts, middleware, Supabase clients, and Server Components is a separate
 *   Vercel serverless instance. Without warming it, new users on cold instances
 *   see "could not connect" errors (15–30 s cold start timeout) before the
 *   page ever loads. Fetching /login forces that runtime to boot.
 *
 * SECURITY: Protected by a secret token in the x-ping-token header.
 * Without it, all requests return 401 — spammers can't abuse this to
 * exhaust Vercel invocation limits.
 *
 * Called by cron-job.org every 5 minutes with the correct token header.
 */
export async function GET(request: Request) {
  const token = request.headers.get('x-ping-token');
  const secret = process.env.PING_SECRET;

  // If PING_SECRET is configured, enforce it. If not set (e.g. local dev), allow.
  if (secret && token !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Self-fetch /login to warm the full Next.js page-rendering runtime.
  // Fire-and-forget — we don't await this so the ping responds instantly.
  // The /login page is public (no auth needed) so it's safe to hit without cookies.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    fetch(`${appUrl}/login`, { method: 'GET' }).catch(() => {
      // Ignore errors — this is best-effort warm-up only
    });
  }

  return Response.json({ ok: true, ts: Date.now() });
}

