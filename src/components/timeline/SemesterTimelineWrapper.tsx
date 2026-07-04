'use client';

/**
 * SemesterTimelineWrapper — thin Client Component bridge.
 *
 * Reads preloaded semesterConfig, holidayDays, and classRoutine from
 * StudentHubContext (populated by student/layout.tsx) and passes them
 * to SemesterTimeline as initial props.
 *
 * This eliminates all three mount-time DB fetches that previously caused
 * the timeline to show a loading skeleton after the page painted.
 *
 * FALLBACK: If hub is not hydrated (direct URL access), the null/empty
 * values are passed — SemesterTimeline falls back to its hardcoded defaults
 * (14 weeks, start_date '2026-05-20'). This is acceptable for direct access.
 */

import { useStudentHub } from '@/context/StudentHubContext';
import { SemesterTimeline } from '@/components/timeline/SemesterTimeline';

interface SemesterTimelineWrapperProps {
  isCR: boolean;
}

export function SemesterTimelineWrapper({ isCR }: SemesterTimelineWrapperProps) {
  const { semesterConfig, holidayDays, classRoutine } = useStudentHub();

  return (
    <SemesterTimeline
      initialRoutineUrl={classRoutine?.image_url ?? null}
      isCR={isCR}
      initialSemesterConfig={semesterConfig}
      initialHolidayDays={holidayDays}
    />
  );
}
