import { getCachedAnnouncements } from '@/lib/cache/queries';
import { getAuthUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AnnouncementsList } from '@/components/features/AnnouncementsList';

export const revalidate = 0;

export default async function CRAnnouncementsPage() {
  const { user } = await getAuthUser();
  if (!user) redirect('/login');

  const announcements = await getCachedAnnouncements();

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      <AnnouncementsList announcements={(announcements || []) as any} />
    </div>
  );
}
