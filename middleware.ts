import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Create a mutable response we can attach cookies to.
  // IMPORTANT: We must use a single response object throughout.
  // The setAll handler below MUST NOT replace supabaseResponse — doing so
  // causes a race where session-refresh cookies are written to a discarded
  // object, breaking the session on the very next request and triggering an
  // infinite /login redirect loop (especially visible on mobile Chrome).
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto the incoming request (so subsequent middleware
          // steps in the same pass can read them) AND onto the response (so
          // the browser stores them).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Re-create the response from the now-mutated request so that
          // Next.js propagates the updated request headers downstream,
          // then layer on the Set-Cookie headers.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() must be called here to refresh the session token.
  // Do not remove this call — it is what keeps the session alive.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Public routes ────────────────────────────────────────
  const isPublicPath = pathname === '/login' || pathname === '/';
  const isApiPath = pathname.startsWith('/api/');

  if (!user) {
    // Clear the stale role cookie so it doesn't persist across logouts
    if (request.cookies.has('x-user-role')) {
      supabaseResponse.cookies.delete('x-user-role');
    }
    if (isPublicPath || isApiPath) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ── Role from cookie (cached) or DB ─────────────────────
  // Using a cookie avoids a DB round-trip on every request.
  // The cookie is set after login and cleared on sign-out.
  let role = request.cookies.get('x-user-role')?.value as string | undefined;

  if (!role) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    role = (profile?.role ?? 'student') as string;
    // Attach the role cookie to the SAME supabaseResponse we already have.
    // (setAll may have replaced it above, but at this point it is stable.)
    supabaseResponse.cookies.set('x-user-role', role, {
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  // ── Redirect root ────────────────────────────────────────
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = role === 'cr' || role === 'admin' ? '/cr/timeline' : '/student/timeline';
    return NextResponse.redirect(url);
  }

  // ── Redirect login if already authed ────────────────────
  if (pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = role === 'cr' || role === 'admin' ? '/cr/timeline' : '/student/timeline';
    return NextResponse.redirect(url);
  }

  // ── Guard CR routes ──────────────────────────────────────
  if (pathname.startsWith('/cr') && role === 'student') {
    const url = request.nextUrl.clone();
    url.pathname = '/student/timeline';
    return NextResponse.redirect(url);
  }

  // ── Guard Student routes ─────────────────────────────────
  if (pathname.startsWith('/student') && (role === 'cr' || role === 'admin')) {
    const url = request.nextUrl.clone();
    url.pathname = '/cr/timeline';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sounds|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
