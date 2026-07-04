'use client';

/**
 * HubDeadlines — zero-prop, self-sufficient deadlines view.
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
import { StudentDeadlinesList } from '@/components/features/StudentDeadlinesList';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { getCachedDeadlines } from '@/lib/cache/queries';
import type { Deadline } from '@/types';

export function HubDeadlines() {
  const { deadlines, isHydrated } = useStudentHub();
  const [fetched, setFetched] = useState<Deadline[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Self-fetch only when context has no data (direct URL access)
    if (!isHydrated && fetched === null && !loading) {
      setLoading(true);
      getCachedDeadlines()
        .then((data) => setFetched(data || []))
        .catch(() => setFetched([]))
        .finally(() => setLoading(false));
    }
  }, [isHydrated, fetched, loading]);

  // Hub hydrated → instant render from context (most common path)
  if (isHydrated) {
    return <StudentDeadlinesList deadlines={deadlines} />;
  }

  // Direct URL access → show skeleton while fetching
  if (fetched === null) {
    return (
      <div className="flex flex-col gap-4">
        <div className="shimmer h-7 w-28 rounded-lg mb-2" />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  return <StudentDeadlinesList deadlines={fetched} />;
}
