'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import crypto from 'crypto';

function decrypt(text: string): string {
  try {
    const parts = text.split(':');
    if (parts.length !== 3) {
      // Fallback for unencrypted keys (e.g. legacy local developer database setups)
      return text;
    }
    const [ivHex, encryptedHex, authTagHex] = parts;
    const masterKey = process.env.MASTER_ENCRYPTION_KEY;
    if (!masterKey || masterKey.length !== 64) {
      throw new Error('MASTER_ENCRYPTION_KEY must be a 32-byte hex string (64 characters).');
    }
    const key = Buffer.from(masterKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.error('Decryption failed:', err.message);
    return text;
  }
}

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
  const decryptedKey = decrypt(tenantData.supabase_anon_key);

  const isSecure = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_APP_URL?.startsWith('https');

  const cookieStore = await cookies();
  cookieStore.set('tenant_supabase_url', tenantData.supabase_url, {
    httpOnly: false, // Non-secret — browser client reads this to detect active class
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days — persist across browser restarts
  });
  cookieStore.set('tenant_supabase_anon_key', decryptedKey, {
    httpOnly: true, // BUG-02 fix: anon key is now httpOnly — proxy injects it server-side
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  // Store class name as a readable cookie so the login page can show the correct
  // class name even if the browser's localStorage is cleared (e.g. app reinstall).
  cookieStore.set('tenant_class_name', data.class_name, {
    httpOnly: false,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return { success: true, className: data.class_name };
}

/**
 * Clears both tenant routing cookies server-side.
 * Required because tenant_supabase_anon_key is httpOnly and cannot be deleted from JS.
 * Call this instead of document.cookie manipulation when switching / signing out.
 */
export async function clearTenantCookies() {
  const cookieStore = await cookies();
  const isSecure = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_APP_URL?.startsWith('https');

  cookieStore.set('tenant_supabase_url', '', {
    httpOnly: false,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  cookieStore.set('tenant_supabase_anon_key', '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  cookieStore.set('tenant_class_name', '', {
    httpOnly: false,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return { success: true };
}
