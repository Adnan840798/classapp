import { redirect } from 'next/navigation';
import { getAuthProfile } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * CR layout — guards CR routes.
 *
 * getAuthProfile() is memoized via React.cache(). DashboardLayout always
 * runs before this and already fetched user + profile from the DB.
 * This call costs ~0ms — returns the cached object instantly.
 */
export default async function CRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getAuthProfile();

  if (!user) redirect('/login');
  if (!profile) redirect('/login?error=profile_missing');

  // Role guard: redirect students who land on /cr/* back to /student/*.
  if (profile.role === 'student') {
    const headerStore = await headers();
    const activePath = headerStore.get('x-pathname') || '';
    if (activePath.startsWith('/cr/')) {
      redirect(activePath.replace(/^\/cr\//, '/student/'));
    }
    redirect('/student/timeline');
  }

  return <>{children}</>;
}
