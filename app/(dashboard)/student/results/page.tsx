import { HubResults } from '@/components/features/hub/HubResults';

export const revalidate = 0; // force dynamic rendering

export default async function StudentResultsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Exam Results</h1>
            <p className="page-subtitle">Class exam results and answer sheets published by your CR</p>
          </div>
        </div>
      </div>

      <HubResults />
    </div>
  );
}
