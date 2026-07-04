import { HubDeadlines } from '@/components/features/hub/HubDeadlines';

export const revalidate = 0; // force dynamic rendering

export default async function StudentDeadlinesPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Deadlines &amp; Submissions</h1>
            <p className="page-subtitle">Track academic schedules, project turn-ins, and homework deadlines</p>
          </div>
        </div>
      </div>

      <HubDeadlines />
    </div>
  );
}
