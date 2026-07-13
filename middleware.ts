import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

// ─── Rate limit tiers ────────────────────────────────────────────────────────
//  auth    → 10 req / 60 s  — brute-force & credential-stuffing protection
//  webhook → 30 req / 60 s  — Telegram webhook abuse
//  api     → 60 req / 60 s  — general API callers
//  page    → 600 req / 60 s — authenticated users browsing (in-memory, per-instance)
//                             600 allows ~20-30 students on the same university NAT
//                             IP to browse simultaneously without hitting the limit.
// ─────────────────────────────────────────────────────────────────────────────
const LIMITS = {
  auth:    { limit: 10,  windowMs: 60_000 },
  webhook: { limit: 30,  windowMs: 60_000 },
  proxy:   { limit: 300, windowMs: 60_000 },
  api:     { limit: 60,  windowMs: 60_000 },
  page:    { limit: 600, windowMs: 60_000 },
} as const;


function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Copies all cookies from one response onto another.
 * Used to propagate refreshed auth tokens when we redirect.
 */
function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value, {
      path:     c.path,
      domain:   c.domain,
      expires:  c.expires,
      maxAge:   c.maxAge,
      sameSite: c.sameSite,
      secure:   c.secure,
      httpOnly: c.httpOnly,
    });
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // ── 0. Keep-warm ping — bypass all middleware overhead ───────────────────
  // /api/ping must be unauthenticated and instant. Skip rate limiting, auth,
  // and Upstash Redis entirely so the ping itself doesn't add cold-start risk.
  if (pathname === '/api/ping') {
    return NextResponse.next();
  }

  // ── 1. Rate limiting ──────────────────────────────────────────────────────

  let bucket: keyof typeof LIMITS = 'page';
  if (pathname.startsWith('/api/auth')) {
    bucket = 'auth';
  } else if (pathname.startsWith('/api/telegram')) {
    bucket = 'webhook';
  } else if (pathname.startsWith('/api/supabase-proxy')) {
    bucket = 'proxy';
  } else if (pathname.startsWith('/api/')) {
    bucket = 'api';
  }

  const { limit, windowMs } = LIMITS[bucket];
  const rl = await rateLimit(bucket, ip, limit, windowMs);
  if (!rl.success) return rateLimitResponse(rl, pathname);

  // Inject x-pathname so Server Components / Layouts can read the active route
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // Base response — always created with the enriched headers so every response
  // (including token-refresh ones from setAll) preserves x-pathname.
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const tenantUrl     = request.cookies.get('tenant_supabase_url')?.value;
  const tenantAnonKey = request.cookies.get('tenant_supabase_anon_key')?.value;

  // Route classification
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname.startsWith('/manual') || pathname.startsWith('/api/');
  const isResetPage  = pathname === '/reset-password';
  const isAsset      = pathname.includes('.') || pathname.startsWith('/_next/');
  const isDashboard  = !isPublicPage && !isResetPage && !isAsset;
  const needsAuth    = isDashboard || isResetPage;

  // BUG-10 fix: match exact configured auth cookie name, not just generic 'sb-' prefix
  const hasSessionCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-classapp-auth-token'));

  // ── 2. No tenant config → redirect auth-required routes to /login ─────────
  if (!tenantUrl && needsAuth) {
    const url = request.nextUrl.clone();
    const nextParam = pathname + request.nextUrl.search;
    url.pathname = '/login';
    url.searchParams.set('next', nextParam);
    return NextResponse.redirect(url);
  }

  // ── 3. Fast-path: no session cookie → skip DB call ────────────────────────
  if (!hasSessionCookie && needsAuth) {
    const url = request.nextUrl.clone();
    const nextParam = pathname + request.nextUrl.search;
    url.pathname = '/login';
    url.searchParams.set('next', nextParam);
    return NextResponse.redirect(url);
  }

  // ── 4. Root path "/" handling ─────────────────────────────────────────────
  //
  //  Case A — Fresh/external load (no same-origin Referer):
  //    If the user is authenticated, redirect them straight to their timeline
  //    so they don't have to click through the landing page.
  //
  //  Case B — Internal navigation (Referer is our own host, e.g. clicking the
  //    logo from inside the dashboard):
  //    Allow the landing page to render so logged-in users can still reach it.
  //
  if (pathname === '/') {
    // Determine whether this is an in-app navigation (clicking a link inside
    // the app) vs a fresh browser load / external entry.
    let isInternalNavigation = false;
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refHost = new URL(referer).host;
        const reqHost = request.headers.get('host') ?? '';
        isInternalNavigation = refHost === reqHost;
      } catch {
        // Malformed Referer — treat as external
      }
    }

    // Only do the auth-redirect on fresh/external loads
    if (!isInternalNavigation && tenantUrl && tenantAnonKey && hasSessionCookie) {
      const supabase = createServerClient(tenantUrl, tenantAnonKey, {
        cookieOptions: {
          name: 'sb-classapp-auth-token',
        },
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            // Apply to the mutable request copy first
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            // Rebuild supabaseResponse preserving x-pathname header
            supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      });

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('password_reset_required, role')
          .eq('id', user.id)
          .single();

        const destUrl = request.nextUrl.clone();
        if (profile?.password_reset_required === true) {
          destUrl.pathname = '/reset-password';
        } else {
          const role = profile?.role;
          destUrl.pathname =
            role === 'cr' || role === 'admin' ? '/cr/timeline' : '/student/timeline';
        }

        const redirectRes = NextResponse.redirect(destUrl);
        // ⚠️ CRITICAL: carry any refreshed auth tokens onto the redirect so the
        // browser's next request (to the timeline page) sees a valid session.
        copyCookies(supabaseResponse, redirectRes);
        return redirectRes;
      }
    }

    // Internal nav OR unauthenticated → render the landing page normally
    return supabaseResponse;
  }

  // ── 5. Public & API paths pass through ────────────────────────────────────
  if (isPublicPage) return supabaseResponse;

  // ── 6. Auth-required routes (dashboard + /reset-password) ─────────────────
  if (tenantUrl && tenantAnonKey) {
    const supabase = createServerClient(tenantUrl, tenantAnonKey, {
      cookieOptions: {
        name: 'sb-classapp-auth-token',
      },
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Rebuild supabaseResponse preserving x-pathname header
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    // Use getSession() here instead of getUser() — getSession() verifies the JWT
    // locally from the cookie (~0ms). getUser() makes a live HTTP round-trip to the
    // Supabase Auth server (~100–200ms) which is the primary cause of navigation lag.
    //
    // Security: Supabase docs explicitly permit getSession() in middleware for this
    // reason. The authoritative getUser() check still runs in DashboardLayout via
    // getAuthProfile(), which is the correct server-side security boundary.
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      const url = request.nextUrl.clone();
      const nextParam = pathname + request.nextUrl.search;
      url.pathname = '/login';
      url.searchParams.set('next', nextParam);
      return NextResponse.redirect(url);
    }

  }

  // Return supabaseResponse which carries any refreshed session cookies
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sounds|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
