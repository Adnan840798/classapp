import { createBrowserClient } from '@supabase/ssr';

let client: any = null;
let cachedUrl: string | null = null;
let cachedKey: string | null = null;

export function getSupabaseBrowserClient() {
  let tenantUrl = '';

  if (typeof window !== 'undefined') {
    // Only read the URL (non-sensitive) from document.cookie.
    // The anon key is now httpOnly and is injected server-side by the proxy —
    // the browser client does not need it directly.
    const matchUrl = document.cookie.match(/(^|;)\s*tenant_supabase_url\s*=\s*([^;]+)/);
    tenantUrl = matchUrl ? decodeURIComponent(matchUrl[2]) : '';
  }

  // In the browser, all traffic routes through /api/supabase-proxy.
  // The proxy reads the httpOnly tenant_supabase_anon_key cookie server-side and
  // injects it as the `apikey` header, so we use a stable placeholder here.
  const isBrowser = typeof window !== 'undefined';
  const targetUrl = isBrowser
    ? window.location.origin + '/api/supabase-proxy'
    : (tenantUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!);
  // Server-side (SSR/SA): use the real anon key read from the httpOnly cookie via server.ts
  // Browser-side: proxy injects the real key; placeholder keeps createBrowserClient happy
  const targetKey = isBrowser
    ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || 'proxy-managed')
    : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // BUG-09 fix: cache key includes the tenant URL so switching classes invalidates the singleton
  const cacheKey = `${targetUrl}::${tenantUrl}`;

  if (!client || cachedUrl !== cacheKey || cachedKey !== targetKey) {
    client = createBrowserClient(targetUrl, targetKey, {
      cookieOptions: {
        name: 'sb-classapp-auth-token',
      },
    });
    cachedUrl = cacheKey;
    cachedKey = targetKey;
  }

  return client;
}
