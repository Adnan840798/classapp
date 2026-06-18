'use server';

/**
 * Tenant-scoped query cache using Next.js unstable_cache.
 *
 * WHY THIS FILE EXISTS:
 * Pages that call cookies() are forced dynamic — `export const revalidate` is
 * ignored for data-fetching. unstable_cache wraps the DB query itself, not the
 * page render, so we get cached results while still reading cookies for auth.
 *
 * SECURITY: Every cached function takes `tenantUrl` as the first cache-key
 * segment. This guarantees Class A's cached data is NEVER served to Class B.
 *
 * CACHE INVALIDATION: Server actions that mutate data must call
 * `revalidateTag('announcements', { expire: 0 })` etc. so the cache is busted
 * immediately when content changes, regardless of the TTL.
 */

import { unstable_cache } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { Announcement, Deadline, ExamResult } from '@/types';

/** Read the active tenant URL from cookies — used as the cache key discriminator. */
async function getTenantKey(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get('tenant_supabase_url')?.value ?? 'default';
}

// ─── Announcements ──────────────────────────────────────────────────────────

/**
 * Fetch all announcements, ordered importance-first then newest-first.
 * Cached 60 seconds per tenant. Bust with revalidateTag('announcements', { expire: 0 }).
 */
export async function getCachedAnnouncements(): Promise<Announcement[]> {
  const tenantKey = await getTenantKey();

  return unstable_cache(
    async () => {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, body, is_important, attachment_url, attachment_type, telegram_posted, created_by, created_at, creator:profiles!created_by(full_name, profile_pic_url)')
        .order('is_important', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) console.error('[cache] getCachedAnnouncements error:', error);
      // Cast: Supabase TS infers joined relation as array; the !fk notation guarantees a single row.
      return (data ?? []) as unknown as Announcement[];
    },
    [`announcements:${tenantKey}`],
    { revalidate: 60, tags: ['announcements'] }
  )();
}

// ─── Deadlines ───────────────────────────────────────────────────────────────

/**
 * Fetch all deadlines ordered by due date ascending.
 * Cached 120 seconds per tenant. Bust with revalidateTag('deadlines', { expire: 0 }).
 */
export async function getCachedDeadlines(): Promise<Deadline[]> {
  const tenantKey = await getTenantKey();

  return unstable_cache(
    async () => {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase
        .from('deadlines')
        .select('id, title, subject, description, due_date, color, created_by, created_at')
        .order('due_date', { ascending: true });

      if (error) console.error('[cache] getCachedDeadlines error:', error);
      return (data ?? []) as unknown as Deadline[];
    },
    [`deadlines:${tenantKey}`],
    { revalidate: 120, tags: ['deadlines'] }
  )();
}

// ─── Exam Results ─────────────────────────────────────────────────────────────

/**
 * Fetch all published exam results ordered newest-first.
 * Cached 300 seconds per tenant. Bust with revalidateTag('results', { expire: 0 }).
 */
export async function getCachedResults(): Promise<ExamResult[]> {
  const tenantKey = await getTenantKey();

  return unstable_cache(
    async () => {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase
        .from('exam_results')
        .select('id, exam_name, published_at, result_sheet_url')
        .order('published_at', { ascending: false });

      if (error) console.error('[cache] getCachedResults error:', error);
      return (data ?? []) as unknown as ExamResult[];
    },
    [`results:${tenantKey}`],
    { revalidate: 300, tags: ['results'] }
  )();
}
