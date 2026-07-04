import { SemesterTimelineWrapper } from '@/components/timeline/SemesterTimelineWrapper';

export const revalidate = 0; // force dynamic rendering

/**
 * StudentTimelinePage — serves as a trivially simple shell.
 *
 * All data (semesterConfig, holidayDays, classRoutine, announcements,
 * deadlines, results) is preloaded server-side by student/layout.tsx.
 * SemesterTimelineWrapper reads from StudentHubContext and passes initial
 * props to SemesterTimeline — zero mount-time DB fetches.
 */
export default function StudentTimelinePage() {
  return (
    <div className="w-full animate-fade-in">
      <SemesterTimelineWrapper isCR={false} />
    </div>
  );
}
