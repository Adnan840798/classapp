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
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // ── 1. Rate limiting ──────────────────────────────────────────────────────
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
  if (!rl.success) return rateLimitResponse(rl, pathname);

  // Inject x-pathname so Server Components can read the route
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const tenantUrl     = request.cookies.get('tenant_supabase_url')?.value;
  const tenantAnonKey = request.cookies.get('tenant_supabase_anon_key')?.value;

  // Route classification
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname.startsWith('/api/');
  const isResetPage  = pathname === '/reset-password';
  const isAsset      = pathname.includes('.') || pathname.startsWith('/_next/');
  const isDashboard  = !isPublicPage && !isResetPage && !isAsset;

  // Both dashboard and reset-password require a tenant config + session
  const needsAuth = isDashboard || isResetPage;

  const hasSessionCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-'));

  // ── 2. No tenant config → send to /login for any auth-required route ──────
  if (!tenantUrl && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ── Fast-path: no session cookie → skip DB call, redirect immediately ─────
  if (!hasSessionCookie && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ── 3. Root path: always allow through so landing page can render ────────
  // (Authenticated users see "Go to Dashboard" button on the landing page itself)
  // Still redirect if password reset is required
  if (pathname === '/' && tenantUrl && tenantAnonKey && hasSessionCookie) {
    const supabase = createServerClient(tenantUrl, tenantAnonKey, {
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
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('password_reset_required')
        .eq('id', user.id)
        .single();

      // Only redirect away if the user still needs to reset their password
      if (profile?.password_reset_required === true) {
        const url = request.nextUrl.clone();
        url.pathname = '/reset-password';
        return NextResponse.redirect(url);
      }
    }
  }

  // ── 4. Public & API paths pass through ────────────────────────────────────
  if (isPublicPage) return supabaseResponse;

  // ── 5. Auth-required routes (dashboard + /reset-password) — verify session ─
  if (tenantUrl && tenantAnonKey) {
    const supabase = createServerClient(tenantUrl, tenantAnonKey, {
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
    });

    // Verify session — also refreshes the token if close to expiry
    const { data: { user }, error } = await supabase.auth.getUser();

    // Bad/expired session → wipe stale cookies and send to login
    if (error || !user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      const failResponse = NextResponse.redirect(url);
      failResponse.cookies.set('tenant_supabase_url', '', { maxAge: 0, path: '/' });
      failResponse.cookies.set('tenant_supabase_anon_key', '', { maxAge: 0, path: '/' });
      return failResponse;
    }

    // ── 6. Password-reset gate ──────────────────────────────────────────────
    // Block ALL dashboard routes for accounts that still have a temporary
    // password. /reset-password itself is excluded to avoid an infinite loop.
    if (isDashboard) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('password_reset_required')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.password_reset_required === true) {
        const url = request.nextUrl.clone();
        url.pathname = '/reset-password';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sounds|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
