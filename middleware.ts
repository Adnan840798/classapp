import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

// ─── Rate limit tiers ────────────────────────────────────────────────────────
//  auth    → 10 req / 60 s  — brute-force & credential-stuffing protection
//  webhook → 30 req / 60 s  — Telegram webhook abuse
//  api     → 60 req / 60 s  — general API callers
//  page    → 200 req / 60 s — authenticated users browsing normally
// ─────────────────────────────────────────────────────────────────────────────
const LIMITS = {
  auth:    { limit: 10,  windowMs: 60_000 },
  webhook: { limit: 30,  windowMs: 60_000 },
  api:     { limit: 60,  windowMs: 60_000 },
  page:    { limit: 200, windowMs: 60_000 },
} as const;

function getClientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for; fall back to a sentinel so the limiter still works
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // ── 1. Apply rate limiting before anything else ───────────────────────────
  let bucket: keyof typeof LIMITS = 'page';

  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    bucket = 'auth';
  } else if (pathname.startsWith('/api/telegram')) {
    bucket = 'webhook';
  } else if (pathname.startsWith('/api/')) {
    bucket = 'api';
  }

  const { limit, windowMs } = LIMITS[bucket];
  const rl = rateLimit(bucket, ip, limit, windowMs);

  if (!rl.success) {
    return rateLimitResponse(rl, pathname);
  }

  // ── 2. Session cookie management (Supabase SSR requires a mutable response) ─
  let supabaseResponse = NextResponse.next({ request });

  // ── 3. Root path → auto-redirect authenticated users to their dashboard ────
  if (pathname === '/') {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        const url = request.nextUrl.clone();
        url.pathname = profile.role === 'cr' || profile.role === 'admin'
          ? '/cr/timeline'
          : '/student/timeline';
        return NextResponse.redirect(url);
      }
    }
  }

  // ── 4. Public & API paths pass through without auth check ─────────────────
  const isPublic = pathname === '/' || pathname === '/login';
  const isApi    = pathname.startsWith('/api/');

  if (isPublic || isApi) {
    return supabaseResponse;
  }

  // ── 5. Protected routes — verify session ──────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() must be called to refresh the session token.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sounds|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
