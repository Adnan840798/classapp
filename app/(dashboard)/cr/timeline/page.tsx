import { getCachedSemesterConfig, getCachedHolidayDays, getCachedClassRoutine } from '@/lib/cache/queries';
import { SemesterTimeline } from '@/components/timeline/SemesterTimeline';

export const revalidate = 0; // force dynamic rendering

/**
 * CRTimelinePage — preloads semesterConfig, holidayDays, classRoutine server-side
 * using the cached query functions. CR has no StudentHubProvider (it's student-only),
 * so this page fetches its own initial data and passes as props to SemesterTimeline.
 *
 * All three are cached (unstable_cache, 300s TTL), so subsequent navigations
 * to the CR timeline are served from the in-memory cache — no DB roundtrip.
 */
export default async function CRTimelinePage() {
  const [semesterConfig, holidayDays, classRoutine] = await Promise.all([
    getCachedSemesterConfig(),
    getCachedHolidayDays(),
    getCachedClassRoutine(),
  ]);

  return (
    <div className="w-full animate-fade-in">
      <SemesterTimeline
        initialRoutineUrl={classRoutine?.image_url ?? null}
        isCR={true}
        initialSemesterConfig={semesterConfig}
        initialHolidayDays={holidayDays}
      />
    </div>
  );
}
