'use client';

/**
 * HubResources — zero-prop, self-sufficient public and private resources view.
 *
 * FAST PATH (within-app navigation): Reads public resources from the hub context
 * instantly, while fetching the user's private notes in the background. Renders
 * instantly.
 *
 * FALLBACK PATH (direct URL access): If hub is not hydrated, fetches both public
 * resources and private notes client-side, showing a loading skeleton.
 *
 * SECURITY:
 *   - Only public approved resources are read from the hub context.
 *   - Private notes are always fetched specifically for the logged-in user.
 */

import { useState, useEffect } from 'react';
import { useStudentHub } from '@/context/StudentHubContext';
import { useProfile } from '@/context/ProfileContext';
import { ResourcesList } from '@/components/features/ResourcesList';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { getCachedResources } from '@/lib/cache/queries';
import { getMyPrivateNotes } from '@/lib/actions/notes';
import type { Note } from '@/types';

export function HubResources() {
  const { publicResources, privateNotes: hubPrivateNotes, isHydrated } = useStudentHub();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const [privateNotes, setPrivateNotes] = useState<Note[] | null>(null);
  const [fallbackPublic, setFallbackPublic] = useState<Note[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fast path: hub is hydrated — private notes already preloaded in layout.
    // Skip the client-side fetch entirely.
    if (isHydrated) {
      setPrivateNotes(hubPrivateNotes as Note[]);
      return;
    }

    // Fallback path: direct URL access, hub not hydrated — fetch client-side.
    if (isProfileLoading || !profile?.id) return;

    const loadResources = async () => {
      setLoading(true);
      try {
        const promises: Promise<any>[] = [getMyPrivateNotes()];
        
        // Only fetch public resources if the hub isn't hydrated
        if (!isHydrated && fallbackPublic === null) {
          promises.push(getCachedResources());
        }

        const results = await Promise.all(promises);
        
        const privateNotesRes = results[0];
        if (privateNotesRes && !privateNotesRes.error) {
          setPrivateNotes(privateNotesRes.data);
        } else {
          setPrivateNotes([]);
        }

        if (results.length > 1) {
          const publicRes = results[1];
          setFallbackPublic(publicRes || []);
        }
      } catch (err) {
        console.error('Error loading resources:', err);
        setPrivateNotes([]);
        if (!isHydrated) setFallbackPublic([]);
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, [profile?.id, isProfileLoading, isHydrated, hubPrivateNotes]);


  // Loading skeleton while initial private notes (or profile) load
  const isInitiallyLoading = isProfileLoading || !profile?.id || privateNotes === null || (!isHydrated && fallbackPublic === null);
  if (isInitiallyLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="shimmer h-7 w-28 rounded-lg mb-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    );
  }

  // Determine public resources source (hub context or client-side fallback)
  const publicData = isHydrated ? (publicResources as Note[]) : (fallbackPublic || []);

  // Dedup: prevent private notes from appearing in public list (shouldn't happen, but safety guard)
  const privateIds = new Set(privateNotes.map((n) => n.id));
  const dedupedPublic = publicData.filter((n) => !privateIds.has(n.id));

  // Merge and sort by updated_at descending
  const allNotes = [...privateNotes, ...dedupedPublic].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return (
    <ResourcesList
      initialNotes={allNotes as any}
      currentUserId={profile.id}
      notesPath="/student/notes"
    />
  );
}
