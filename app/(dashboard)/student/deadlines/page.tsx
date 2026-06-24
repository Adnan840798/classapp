import { getCachedDeadlines } from '@/lib/cache/queries';
import { StudentDeadlinesList } from '@/components/features/StudentDeadlinesList';

export const revalidate = 0; // force dynamic rendering

export default async function StudentDeadlinesPage() {
  // Uses tenant-scoped unstable_cache internally — DB query shared across all students for 120s.
  const deadlines = await getCachedDeadlines();

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Deadlines & Submissions</h1>
            <p className="page-subtitle">Track academic schedules, project turn-ins, and homework deadlines</p>
          </div>
        </div>
      </div>

      <StudentDeadlinesList deadlines={deadlines || []} />
    </div>
  );
}
