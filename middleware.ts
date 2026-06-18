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

  // Inject x-pathname so Server Components / Layouts can read the active route
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // Base response — always created with the enriched headers so every response
  // (including token-refresh ones from setAll) preserves x-pathname.
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const tenantUrl     = request.cookies.get('tenant_supabase_url')?.value;
  const tenantAnonKey = request.cookies.get('tenant_supabase_anon_key')?.value;

  // Route classification
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname.startsWith('/api/');
  const isResetPage  = pathname === '/reset-password';
  const isAsset      = pathname.includes('.') || pathname.startsWith('/_next/');
  const isDashboard  = !isPublicPage && !isResetPage && !isAsset;
  const needsAuth    = isDashboard || isResetPage;

  const hasSessionCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));

  // ── 2. No tenant config → redirect auth-required routes to /login ─────────
  if (!tenantUrl && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ── 3. Fast-path: no session cookie → skip DB call ────────────────────────
  if (!hasSessionCookie && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
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

    // Verify session — also refreshes the token if it is close to expiry.
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // Session is invalid or expired.
      // We do NOT wipe tenant cookies here — the user still belongs to the
      // same class; they just need to re-authenticate with their password.
      // Wiping tenant cookies would force them to re-enter their join code.
      const url = request.nextUrl.clone();
      url.pathname = '/login';
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
