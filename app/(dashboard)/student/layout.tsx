import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

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

  if (!profile) {
    redirect('/login?error=profile_missing');
  }

  if (profile.role === 'cr' || profile.role === 'admin') {
    const headerStore = await headers();
    const activePath = headerStore.get('x-pathname') || '';
    if (activePath.startsWith('/student/')) {
      const redirectPath = activePath.replace(/^\/student\//, '/cr/');
      redirect(redirectPath);
    }
    redirect('/cr/timeline');
  }

  return <>{children}</>;
}
