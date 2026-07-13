import Link from 'next/link';
import { Plus } from 'lucide-react';
import { HubResources } from '@/components/features/hub/HubResources';

// Static shell — all data comes from StudentHubContext (preloaded in layout).
// No server-side data = Next.js can prefetch this page and serve it instantly.
export default function StudentNotesPage() {
  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Class Resources</h1>
          <p className="page-subtitle">Your private study notebook and class-shared external links.</p>
        </div>
        <Link href="/student/notes/new" className="btn-yellow w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4" />
          Create Resource
        </Link>
      </div>

      <HubResources />
    </div>
  );
}
