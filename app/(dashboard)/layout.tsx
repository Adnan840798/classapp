import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ProfileProvider } from '@/context/ProfileContext';
import { Profile } from '@/types';
import { Header } from './Header';
import { Footer } from '@/components/layout/Footer';
import PushEnrollmentInitializer from '@/components/layout/PushEnrollmentInitializer';

export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session — send to login.
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Auth user exists but profile row is missing (e.g. after a DB reset).
  // DO NOT redirect to /login — that would loop back here via the root page.
  // Show a clear error with a sign-out option instead.
  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121214] px-6">
        <div className="glass-card p-10 max-w-sm w-full flex flex-col items-center gap-5 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'linear-gradient(135deg, hsl(160 84% 45%), hsl(170 80% 38%))' }}
          >
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-foreground">Profile Not Found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your account exists but your profile hasn&apos;t been set up. This usually happens after
            a database reset. Please sign out and register again.
          </p>
          {/* Client-side sign-out via supabase-js — no server route needed */}
          <SignOutButton />
        </div>
      </div>
    );
  }

  return (
    <ProfileProvider initialProfile={profile as Profile}>
      <PushEnrollmentInitializer />
      <div className="flex flex-col h-screen overflow-hidden bg-[#121214]">
        <Header />
        <div className="flex-1 overflow-y-auto bg-[#121214] flex flex-col">
          <main className="px-4 lg:px-8 py-4 sm:py-6 flex-1">{children}</main>
          <Footer />
        </div>
      </div>
    </ProfileProvider>
  );
}

// Tiny client component — just calls supabase.auth.signOut() and reloads to /login
import SignOutButton from '@/components/ui/SignOutButton';
