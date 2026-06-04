import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Student layout — guards student routes.
 * CRs who somehow bypass middleware get redirected here.
 */
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role === 'cr' || profile.role === 'admin') {
    redirect('/cr/dashboard');
  }

  return <>{children}</>;
}
