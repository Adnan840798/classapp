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
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Announcement, Deadline, ExamResult, Note } from '@/types';

// ─── Announcements ──────────────────────────────────────────────────────────

/**
 * Fetch all announcements, ordered importance-first then newest-first.
 * Cached 60 seconds per tenant. Bust with revalidateTag('announcements', { expire: 0 }).
 */
export async function getCachedAnnouncements(): Promise<Announcement[]> {
  const cookieStore = await cookies();
  const tenantUrl = cookieStore.get('tenant_supabase_url')?.value;
  const tenantAnonKey = cookieStore.get('tenant_supabase_anon_key')?.value;
  const tenantKey = tenantUrl ?? 'default';
  const allCookies = cookieStore.getAll();

  return unstable_cache(
    async () => {
      const supabase = createServerClient(
        tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
        tenantAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookieOptions: {
            name: 'sb-classapp-auth-token',
          },
          cookies: {
            getAll() {
              return allCookies;
            },
            setAll() {
              // No-op inside caching callbacks
            },
          },
        }
      );

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
  const cookieStore = await cookies();
  const tenantUrl = cookieStore.get('tenant_supabase_url')?.value;
  const tenantAnonKey = cookieStore.get('tenant_supabase_anon_key')?.value;
  const tenantKey = tenantUrl ?? 'default';
  const allCookies = cookieStore.getAll();

  return unstable_cache(
    async () => {
      const supabase = createServerClient(
        tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
        tenantAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookieOptions: {
            name: 'sb-classapp-auth-token',
          },
          cookies: {
            getAll() {
              return allCookies;
            },
            setAll() {
              // No-op inside caching callbacks
            },
          },
        }
      );

      const { data, error } = await supabase
        .from('deadlines')
        .select('id, title, subject, description, due_date, created_by, created_at')
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
  const cookieStore = await cookies();
  const tenantUrl = cookieStore.get('tenant_supabase_url')?.value;
  const tenantAnonKey = cookieStore.get('tenant_supabase_anon_key')?.value;
  const tenantKey = tenantUrl ?? 'default';
  const allCookies = cookieStore.getAll();

  return unstable_cache(
    async () => {
      const supabase = createServerClient(
        tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
        tenantAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookieOptions: {
            name: 'sb-classapp-auth-token',
          },
          cookies: {
            getAll() {
              return allCookies;
            },
            setAll() {
              // No-op inside caching callbacks
            },
          },
        }
      );

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

// ─── Public Resources (Notes) ─────────────────────────────────────────────────

/**
 * Fetch all public, approved notes/resources ordered newest-first.
 * Only is_public=true AND is_pending=false rows are included — never exposes
 * pending or private notes to other students.
 * Cached 120 seconds per tenant. Bust with revalidateTag('resources', { expire: 0 }).
 */
export async function getCachedResources(): Promise<Note[]> {
  const cookieStore = await cookies();
  const tenantUrl = cookieStore.get('tenant_supabase_url')?.value;
  const tenantAnonKey = cookieStore.get('tenant_supabase_anon_key')?.value;
  const tenantKey = tenantUrl ?? 'default';
  const allCookies = cookieStore.getAll();

  return unstable_cache(
    async () => {
      const supabase = createServerClient(
        tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
        tenantAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookieOptions: {
            name: 'sb-classapp-auth-token',
          },
          cookies: {
            getAll() {
              return allCookies;
            },
            setAll() {
              // No-op inside caching callbacks
            },
          },
        }
      );

      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, drive_link, attachment_url, attachment_type, is_public, is_pending, user_id, updated_at, created_at, creator:profiles!user_id(full_name)')
        .eq('is_public', true)
        .eq('is_pending', false) // SECURITY: never expose unapproved pending resources
        .order('updated_at', { ascending: false });

      if (error) console.error('[cache] getCachedResources error:', error);
      return (data ?? []) as unknown as Note[];
    },
    [`resources:${tenantKey}`],
    { revalidate: 120, tags: ['resources'] }
  )();
}

// ─── Semester Config ──────────────────────────────────────────────────────────

/**
 * Fetch the singleton semester_config row (id=1).
 * Contains total_weeks and start_date for the current semester.
 * Cached 300 seconds per tenant. Bust with revalidateTag('semester_config', { expire: 0 }).
 */
export async function getCachedSemesterConfig(): Promise<{ id: number; total_weeks: number; start_date: string } | null> {
  const cookieStore = await cookies();
  const tenantUrl = cookieStore.get('tenant_supabase_url')?.value;
  const tenantAnonKey = cookieStore.get('tenant_supabase_anon_key')?.value;
  const tenantKey = tenantUrl ?? 'default';
  const allCookies = cookieStore.getAll();

  return unstable_cache(
    async () => {
      const supabase = createServerClient(
        tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
        tenantAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookieOptions: { name: 'sb-classapp-auth-token' },
          cookies: {
            getAll() { return allCookies; },
            setAll() {},
          },
        }
      );

      const { data, error } = await supabase
        .from('semester_config')
        .select('id, total_weeks, start_date')
        .eq('id', 1)
        .maybeSingle();

      if (error) console.error('[cache] getCachedSemesterConfig error:', error);
      return data ?? null;
    },
    [`semester_config:${tenantKey}`],
    { revalidate: 300, tags: ['semester_config'] }
  )();
}

// ─── Holiday Days ─────────────────────────────────────────────────────────────

/**
 * Fetch all holiday day slots (week_number + day_index pairs) for the semester.
 * Used by SemesterTimeline to compute non-holiday class day counters.
 * Cached 300 seconds per tenant. Bust with revalidateTag('holiday_days', { expire: 0 }).
 */
export async function getCachedHolidayDays(): Promise<{ week_number: number; day_index: number; note: string | null }[]> {
  const cookieStore = await cookies();
  const tenantUrl = cookieStore.get('tenant_supabase_url')?.value;
  const tenantAnonKey = cookieStore.get('tenant_supabase_anon_key')?.value;
  const tenantKey = tenantUrl ?? 'default';
  const allCookies = cookieStore.getAll();

  return unstable_cache(
    async () => {
      const supabase = createServerClient(
        tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
        tenantAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookieOptions: { name: 'sb-classapp-auth-token' },
          cookies: {
            getAll() { return allCookies; },
            setAll() {},
          },
        }
      );

      const { data, error } = await supabase
        .from('holiday_days')
        .select('week_number, day_index, note')
        .order('week_number', { ascending: true })
        .order('day_index', { ascending: true });

      if (error) console.error('[cache] getCachedHolidayDays error:', error);
      return data ?? [];
    },
    [`holiday_days:${tenantKey}`],
    { revalidate: 300, tags: ['holiday_days'] }
  )();
}

// ─── Class Routine ────────────────────────────────────────────────────────────

/**
 * Fetch the current class routine image row.
 * The routine changes at most once per semester — 300s TTL is appropriate.
 * Cached 300 seconds per tenant. Bust with revalidateTag('class_routine', { expire: 0 }).
 */
export async function getCachedClassRoutine(): Promise<{ id: string; image_url: string; uploaded_at: string } | null> {
  const cookieStore = await cookies();
  const tenantUrl = cookieStore.get('tenant_supabase_url')?.value;
  const tenantAnonKey = cookieStore.get('tenant_supabase_anon_key')?.value;
  const tenantKey = tenantUrl ?? 'default';
  const allCookies = cookieStore.getAll();

  return unstable_cache(
    async () => {
      const supabase = createServerClient(
        tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
        tenantAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookieOptions: { name: 'sb-classapp-auth-token' },
          cookies: {
            getAll() { return allCookies; },
            setAll() {},
          },
        }
      );

      const { data, error } = await supabase
        .from('class_routine')
        .select('id, image_url, uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) console.error('[cache] getCachedClassRoutine error:', error);
      return data ?? null;
    },
    [`class_routine:${tenantKey}`],
    { revalidate: 300, tags: ['class_routine'] }
  )();
}
