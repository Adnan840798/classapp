import { headers } from 'next/headers';

/**
 * Server-safe version of the URL resolver.
 * Reads the host header dynamically to rewrite localhost/127.0.0.1 Supabase URLs.
 */
export async function resolveSupabaseUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;

  try {
    const headersList = await headers();
    const host = headersList.get('host'); // e.g. "192.168.1.10:3000" or "localhost:3000"
    if (!host) return url;

    const ipOrHost = host.split(':')[0]; // Get the hostname/IP only
    
    return url
      .replace(/localhost:54321/g, `${ipOrHost}:54321`)
      .replace(/127.0.0.1:54321/g, `${ipOrHost}:54321`);
  } catch {
    return url;
  }
}
