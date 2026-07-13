import { HubResults } from '@/components/features/hub/HubResults';

// Static shell — all data comes from StudentHubContext (preloaded in layout).
// No server-side data = Next.js can prefetch this page and serve it instantly.
export default function StudentResultsPage() {
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
