import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ProfileProvider } from '@/context/ProfileContext';
import { Profile } from '@/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

/**
 * Dashboard layout — Server Component.
 * Loads the profile ONCE, passes it to ProfileContext.
 * All child pages and components read from Context. Zero repeat DB calls.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Single DB call — Rule 4: don't check existence then fetch
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  return (
    <ProfileProvider initialProfile={profile as Profile}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <div
          className="hidden lg:flex flex-col flex-shrink-0"
          style={{ width: 'var(--sidebar-width, 260px)' }}
        >
          <Sidebar />
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </ProfileProvider>
  );
}
