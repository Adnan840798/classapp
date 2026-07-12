/**
 * Keep-warm ping endpoint — Node.js runtime (intentional).
 *
 * Must run on Node.js (not Edge) because the cold-start problem is with
 * Vercel's Node.js serverless functions (layouts, server actions).
 *
 * SECURITY: Protected by a secret token in the x-ping-token header.
 * Without it, all requests return 401 — spammers can't abuse this to
 * exhaust Vercel invocation limits.
 *
 * Called by cron-job.org every 5 minutes with the correct token header.
 */
export function GET(request: Request) {
  const token = request.headers.get('x-ping-token');
  const secret = process.env.PING_SECRET;

  // If PING_SECRET is configured, enforce it. If not set (e.g. local dev), allow.
  if (secret && token !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  return Response.json({ ok: true, ts: Date.now() });
}
