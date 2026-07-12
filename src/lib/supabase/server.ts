import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { cache } from 'react';

// Server-side Supabase client — for RSC (React Server Components) and Server Actions
// Memoized with React's cache() to ensure a single instance is built per request thread.
export const getSupabaseServerClient = cache(async () => {
  const cookieStore = await cookies();
  const tenantUrl = cookieStore.get('tenant_supabase_url')?.value;
  const tenantAnonKey = cookieStore.get('tenant_supabase_anon_key')?.value;

  return createServerClient(
    tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    tenantAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: 'sb-classapp-auth-token',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
});

/**
 * Returns the currently authenticated user, memoized for the duration of the
 * current request via React cache(). Calling this multiple times in the same
 * request (layout + child pages) only makes ONE network round-trip to Supabase Auth.
 */
export const getAuthUser = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user: error ? null : user };
});

/**
 * Returns the authenticated user AND their full profile row, memoized for the
 * duration of the current request via React cache().
 *
 * WHY: DashboardLayout, StudentLayout, and CRLayout all need the profile.
 * Without this, each layout independently queries `profiles`, causing duplicate
 * DB round-trips in the same render tree. With React.cache(), only the FIRST
 * call hits the DB (~50ms). Every subsequent call within the same request is
 * free (returns the cached object instantly).
 *
 * SECURITY: Still reads live data from the DB on every request — no stale
 * profile data is ever served. React.cache() is request-scoped, not global.
 */
export const getAuthProfile = cache(async () => {
  const { user } = await getAuthUser();
  if (!user) return { user: null, profile: null };

  const supabase = await getSupabaseServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, profile_pic_url, university_id, phone, whatsapp, telegram_handle, batch, department, notif_enabled, password_reset_required, cr_last_read_at, fcm_token, created_at, updated_at')
    .eq('id', user.id)
    .single();

  return { user, profile };
});


/**
 * Administrative Supabase client using service role key (only for server actions).
 */
export async function getSupabaseAdminClient() {
  const cookieStore = await cookies();
  const tenantUrl = cookieStore.get('tenant_supabase_url')?.value || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  return createClient(tenantUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

