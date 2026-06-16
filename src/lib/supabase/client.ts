import { createBrowserClient } from '@supabase/ssr';

let client: any = null;
let cachedUrl: string | null = null;

export function getSupabaseBrowserClient() {
  let tenantUrl = '';
  let tenantAnonKey = '';

  if (typeof window !== 'undefined') {
    const matchUrl = document.cookie.match(/(^|;)\s*tenant_supabase_url\s*=\s*([^;]+)/);
    const matchKey = document.cookie.match(/(^|;)\s*tenant_supabase_anon_key\s*=\s*([^;]+)/);
    tenantUrl = matchUrl ? decodeURIComponent(matchUrl[2]) : '';
    tenantAnonKey = matchKey ? decodeURIComponent(matchKey[2]) : '';
  }

  const targetUrl = tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const targetKey = tenantAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!client || cachedUrl !== targetUrl) {
    client = createBrowserClient(targetUrl, targetKey);
    cachedUrl = targetUrl;
  }

  return client;
}

