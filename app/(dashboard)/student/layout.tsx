import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
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
import { getMyPrivateNotes } from '@/lib/actions/notes';
import { StudentHubProvider } from '@/context/StudentHubContext';

/**
 * Student layout — guards student routes AND preloads ALL hub data.
 *
 * WHY HERE: Next.js App Router keeps layouts mounted while navigating
 * between child pages. By placing StudentHubProvider here, the context
 * persists across ALL /student/* navigations — so going from Timeline
 * to Announcements to Deadlines to Results to Notes to Profile is instant.
 *
 * CACHING: Seven of the eight queries use unstable_cache. With 60 concurrent
 * students, the DB sees at most 7 queries per cache window regardless of
 * student count. Only getMyPrivateNotes() is user-specific and runs fresh
 * (it's a lightweight index lookup on user_id).
 *
 * DATA FLOW: After this layout runs once, ALL child pages have zero extra
 * DB calls on navigation. Timeline reads semesterConfig + holidayDays +
 * classRoutine from context. Notes reads privateNotes from context.
 * Profile reads from ProfileContext (DashboardLayout). Zero spinners.
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

  // Preload ALL hub data in parallel. Seven of eight are cache-backed
  // (unstable_cache) — at most 7 DB queries for all 60 concurrent students.
  // getMyPrivateNotes() is user-specific, always fresh, fast (indexed by user_id).
  const [
    announcements,
    deadlines,
    results,
    publicResources,
    semesterConfig,
    holidayDays,
    classRoutine,
    privateNotesResult,
  ] = await Promise.all([
    getCachedAnnouncements(),
    getCachedDeadlines(),
    getCachedResults(),
    getCachedResources(),
    getCachedSemesterConfig(),
    getCachedHolidayDays(),
    getCachedClassRoutine(),
    getMyPrivateNotes(),
  ]);

  return (
    <StudentHubProvider
      announcements={(announcements || []) as any}
      deadlines={deadlines || []}
      results={results || []}
      publicResources={(publicResources || []) as any}
      semesterConfig={semesterConfig ?? null}
      holidayDays={holidayDays || []}
      classRoutine={classRoutine ?? null}
      privateNotes={(privateNotesResult.data || []) as any}
    >
      {children}
    </StudentHubProvider>
  );
}
