import { HubAnnouncements } from '@/components/features/hub/HubAnnouncements';

export const revalidate = 0; // Keep dynamic for layout headers/cookies if any

export default async function StudentAnnouncementsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      <HubAnnouncements />
    </div>
  );
}
