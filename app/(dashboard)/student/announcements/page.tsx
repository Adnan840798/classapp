import { getCachedAnnouncements } from '@/lib/cache/queries';
import { StudentAnnouncementsList } from '@/components/features/StudentAnnouncementsList';

// revalidate = 0 kept because this page reads cookies for auth context
export const revalidate = 0;

export default async function StudentAnnouncementsPage() {
  // Uses tenant-scoped unstable_cache internally — DB query is shared
  // across all students for 60s instead of 60 individual queries.
  const announcements = await getCachedAnnouncements();

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      <StudentAnnouncementsList announcements={(announcements || []) as any} />
    </div>
  );
}
