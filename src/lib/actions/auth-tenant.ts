'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// High-speed in-memory cache to prevent master database scanning and minimize reads
const JOIN_CODE_CACHE = new Map<string, { className: string; supabaseUrl: string; supabaseAnonKey: string }>();

export async function verifyAndConnectClass(joinCode: string) {
  const normalizedCode = joinCode.trim().toUpperCase();

  // 1. Check local cache (Instant lookup, 0 DB calls)
  if (JOIN_CODE_CACHE.has(normalizedCode)) {
    const cached = JOIN_CODE_CACHE.get(normalizedCode)!;
    const cookieStore = await cookies();
    cookieStore.set('tenant_supabase_url', cached.supabaseUrl, {
      httpOnly: false, // Read by getSupabaseBrowserClient
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days — persist across browser restarts
    });
    cookieStore.set('tenant_supabase_anon_key', cached.supabaseAnonKey, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return { success: true, className: cached.className };
  }

  // 2. Cache miss -> query Master Database using Service Role client
  const masterAdmin = createClient(
    process.env.MASTER_SUPABASE_URL!,
    process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await masterAdmin
    .from('class_connections')
    .select('class_name, tenants (supabase_url, supabase_anon_key)')
    .eq('join_code', normalizedCode)
    .single();

  if (error || !data?.tenants) {
    return { success: false, error: 'Invalid class join code or closed registration.' };
  }

  const tenantData = data.tenants as any;

  // 3. Store in memory cache
  JOIN_CODE_CACHE.set(normalizedCode, {
    className: data.class_name,
    supabaseUrl: tenantData.supabase_url,
    supabaseAnonKey: tenantData.supabase_anon_key,
  });

  const cookieStore = await cookies();
  cookieStore.set('tenant_supabase_url', tenantData.supabase_url, {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days — persist across browser restarts
  });
  cookieStore.set('tenant_supabase_anon_key', tenantData.supabase_anon_key, {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return { success: true, className: data.class_name };
}
