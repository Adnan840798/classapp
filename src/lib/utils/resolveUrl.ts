import { headers } from 'next/headers';

/**
 * Rewrites local Supabase URLs (pointing to localhost or 127.0.0.1)
 * to use the current request's hostname. This ensures that assets
 * (images, routines, attachments) load correctly when accessing the
 * application from other devices on the local network (e.g. mobile/tablet).
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
    // Fallback for client-side execution if this runs where headers() throws
    if (typeof window !== 'undefined') {
      const ipOrHost = window.location.hostname;
      return url
        .replace(/localhost:54321/g, `${ipOrHost}:54321`)
        .replace(/127.0.0.1:54321/g, `${ipOrHost}:54321`);
    }
    return url;
  }
}

/**
 * Synchronous client-side version of the URL resolver.
 */
export function resolveSupabaseUrlSync(url: string | null | undefined): string | null {
  if (!url) return null;
  if (typeof window !== 'undefined') {
    const ipOrHost = window.location.hostname;
    return url
      .replace(/localhost:54321/g, `${ipOrHost}:54321`)
      .replace(/127.0.0.1:54321/g, `${ipOrHost}:54321`);
  }
  return url;
}
