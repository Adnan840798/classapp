import { HubAnnouncements } from '@/components/features/hub/HubAnnouncements';

// Static shell — all data comes from StudentHubContext (preloaded in layout).
// No server-side data = Next.js can prefetch this page and serve it instantly.
export default function StudentAnnouncementsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      <HubAnnouncements />
    </div>
  );
}
