import { createServerClient } from '@supabase/ssr';
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

