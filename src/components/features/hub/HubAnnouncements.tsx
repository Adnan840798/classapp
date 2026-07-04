'use client';

/**
 * HubAnnouncements — zero-prop, self-sufficient announcements view.
 *
 * FAST PATH (within-app navigation): hub context is hydrated from the layout
 * preload → renders immediately from in-memory data, no network call at all.
 *
 * FALLBACK PATH (direct URL access): hub is not hydrated on first render,
 * so a client-side server-action call fetches the data and shows a skeleton
 * while loading.
 */

import { useState, useEffect } from 'react';
import { useStudentHub } from '@/context/StudentHubContext';
import { StudentAnnouncementsList } from '@/components/features/StudentAnnouncementsList';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { getCachedAnnouncements } from '@/lib/cache/queries';
import type { Announcement } from '@/types';

export function HubAnnouncements() {
  const { announcements, isHydrated } = useStudentHub();
  const [fetched, setFetched] = useState<Announcement[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Self-fetch only when context has no data (direct URL access)
    if (!isHydrated && fetched === null && !loading) {
      setLoading(true);
      getCachedAnnouncements()
        .then((data) => setFetched((data || []) as Announcement[]))
        .catch(() => setFetched([]))
        .finally(() => setLoading(false));
    }
  }, [isHydrated, fetched, loading]);

  // Hub hydrated → instant render from context (most common path)
  if (isHydrated) {
    return <StudentAnnouncementsList announcements={announcements as any} />;
  }

  // Direct URL access → show skeleton while fetching
  if (fetched === null) {
    return (
      <div className="flex flex-col gap-4">
        <div className="shimmer h-7 w-40 rounded-lg mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    );
  }

  return <StudentAnnouncementsList announcements={fetched as any} />;
}
