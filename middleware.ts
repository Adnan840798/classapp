import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // ── Public routes ────────────────────────────────────────
  const isPublicPath = pathname === '/login' || pathname === '/';
  const isApiPath = pathname.startsWith('/api/');

  if (!user) {
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
    url.pathname = role === 'cr' || role === 'admin' ? '/cr/dashboard' : '/student/dashboard';
    return NextResponse.redirect(url);
  }

  // ── Redirect login if already authed ────────────────────
  if (pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = role === 'cr' || role === 'admin' ? '/cr/dashboard' : '/student/dashboard';
    return NextResponse.redirect(url);
  }

  // ── Guard CR routes ──────────────────────────────────────
  if (pathname.startsWith('/cr') && role === 'student') {
    const url = request.nextUrl.clone();
    url.pathname = '/student/dashboard';
    return NextResponse.redirect(url);
  }

  // ── Guard Student routes ─────────────────────────────────
  if (pathname.startsWith('/student') && (role === 'cr' || role === 'admin')) {
    const url = request.nextUrl.clone();
    url.pathname = '/cr/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sounds|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
