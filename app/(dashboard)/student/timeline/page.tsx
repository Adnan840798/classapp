import { getClassRoutine } from '@/lib/actions/timeline';
import { SemesterTimeline } from '@/components/timeline/SemesterTimeline';

export const runtime = 'edge';
export const revalidate = 0; // force dynamic rendering

export default async function StudentTimelinePage() {
  const routine = await getClassRoutine();

  return (
    <div className="w-full animate-fade-in">
      <SemesterTimeline
        initialRoutineUrl={routine?.image_url ?? null}
        isCR={false}
      />
    </div>
  );
}
