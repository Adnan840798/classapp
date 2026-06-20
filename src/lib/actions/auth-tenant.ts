'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function verifyAndConnectClass(joinCode: string) {
  const normalizedCode = joinCode.trim().toUpperCase();

  // Query Master Database using Service Role client
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
