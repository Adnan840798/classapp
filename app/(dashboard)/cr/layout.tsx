import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * CR layout — guards CR routes.
 * Students who somehow bypass middleware get redirected here.
 */
export default async function CRLayout({
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

  if (profile.role === 'student') {
    const headerStore = await headers();
    const activePath = headerStore.get('x-pathname') || '';
    if (activePath.startsWith('/cr/')) {
      const redirectPath = activePath.replace(/^\/cr\//, '/student/');
      redirect(redirectPath);
    }
    redirect('/student/timeline');
  }

  return <>{children}</>;
}
