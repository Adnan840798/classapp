import { createBrowserClient } from '@supabase/ssr';

let client: any = null;
let cachedUrl: string | null = null;
let cachedKey: string | null = null;

export function getSupabaseBrowserClient() {
  let tenantUrl = '';
  let tenantAnonKey = '';

  if (typeof window !== 'undefined') {
    const matchUrl = document.cookie.match(/(^|;)\s*tenant_supabase_url\s*=\s*([^;]+)/);
    const matchKey = document.cookie.match(/(^|;)\s*tenant_supabase_anon_key\s*=\s*([^;]+)/);
    tenantUrl = matchUrl ? decodeURIComponent(matchUrl[2]) : '';
    tenantAnonKey = matchKey ? decodeURIComponent(matchKey[2]) : '';
  }

  // Use local API proxy in the browser to bypass local DNS blocks/restrictions on *.supabase.co
  const isBrowser = typeof window !== 'undefined';
  const targetUrl = isBrowser
    ? window.location.origin + '/api/supabase-proxy'
    : (tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const targetKey = tenantAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!client || cachedUrl !== targetUrl || cachedKey !== targetKey) {
    client = createBrowserClient(targetUrl, targetKey, {
      cookieOptions: {
        name: 'sb-classapp-auth-token',
      },
    });
    cachedUrl = targetUrl;
    cachedKey = targetKey;
  }

  return client;
}

