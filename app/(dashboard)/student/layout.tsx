import { redirect } from 'next/navigation';
import { getAuthProfile } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import {
  getCachedAnnouncements,
  getCachedDeadlines,
  getCachedResults,
  getCachedResources,
  getCachedSemesterConfig,
  getCachedHolidayDays,
  getCachedClassRoutine,
} from '@/lib/cache/queries';
import { StudentHubProvider } from '@/context/StudentHubContext';

/**
 * Student layout — preloads shared hub data for all /student/* pages.
 *
 * AUTH: getAuthProfile() is memoized via React.cache(). DashboardLayout
 * (which always renders before this) already called getAuthProfile() and
 * fetched user + profile from the DB. This call costs ~0ms — it returns
 * the same object from the request-scoped cache instantly.
 *
 * PERFORMANCE: getAuthProfile() + all 7 data queries fire in a single
 * Promise.all — no sequential waterfall. All 7 data queries are
 * unstable_cache backed, so on a warm cache they resolve from memory.
 *
 * Private notes are intentionally excluded: they are user-specific (uncached)
 * and only needed on the Notes page. HubResources fetches them lazily.
 */
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getAuthProfile() is free here — DashboardLayout already called it.
  // All 7 data queries are cached and run in parallel alongside it.
  const [
    { user, profile },
    announcements,
    deadlines,
    results,
    publicResources,
    semesterConfig,
    holidayDays,
    classRoutine,
  ] = await Promise.all([
    getAuthProfile(),
    getCachedAnnouncements(),
    getCachedDeadlines(),
    getCachedResults(),
    getCachedResources(),
    getCachedSemesterConfig(),
    getCachedHolidayDays(),
    getCachedClassRoutine(),
  ]);

  if (!user) redirect('/login');
  if (!profile) redirect('/login?error=profile_missing');

  // Role guard: redirect CRs/admins who land on /student/* back to /cr/*.
  if (profile.role === 'cr' || profile.role === 'admin') {
    const headerStore = await headers();
    const activePath = headerStore.get('x-pathname') || '';
    if (activePath.startsWith('/student/')) {
      redirect(activePath.replace(/^\/student\//, '/cr/'));
    }
    redirect('/cr/timeline');
  }

  return (
    <StudentHubProvider
      announcements={(announcements || []) as any}
      deadlines={deadlines || []}
      results={results || []}
      publicResources={(publicResources || []) as any}
      semesterConfig={semesterConfig ?? null}
      holidayDays={holidayDays || []}
      classRoutine={classRoutine ?? null}
      privateNotes={[]}
    >
      {children}
    </StudentHubProvider>
  );
}
