import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Sign In — ClassApp',
  description: 'Sign in to your ClassApp account to access announcements, deadlines, results, and more.',
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // If the user already has an active session, redirect them to the landing page.
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
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
