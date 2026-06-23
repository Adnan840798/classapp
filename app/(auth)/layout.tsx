import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export const metadata: Metadata = {
  title: 'Sign In — ClassApp',
  description: 'Sign in to your ClassApp account to access announcements, deadlines, results, and more.',
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  // Only redirect already-logged-in users away from /login.
  // /reset-password must NOT redirect authenticated users — it IS their destination
  // after logging in with a temp password (middleware sends them here).
  if (pathname !== '/reset-password') {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Only redirect if their profile actually exists.
      // If the profile is missing (e.g. after a DB wipe/reset), we must let them
      // reach /login?error=profile_missing so the client-side signOut can run.
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        redirect('/');
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Background decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, hsl(220 91% 58% / 0.12), transparent)',
        }}
      />
      <div
        className="absolute top-1/4 -left-32 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'hsl(220 91% 58%)' }}
      />
      <div
        className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'hsl(260 91% 65%)' }}
      />
      {children}
    </div>
  );
}
