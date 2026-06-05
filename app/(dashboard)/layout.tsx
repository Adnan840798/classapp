import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ProfileProvider } from '@/context/ProfileContext';
import { Profile } from '@/types';
import { Header } from './Header';

export const revalidate = 0; // force dynamic rendering

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
      <div className="flex flex-col h-screen overflow-hidden bg-[#060813]">
        {/* Horizontal Navigation Header */}
        <Header />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#060813]">
          <main className="px-4 lg:px-8 py-6">
            {children}
          </main>
        </div>
      </div>
    </ProfileProvider>
  );
}
