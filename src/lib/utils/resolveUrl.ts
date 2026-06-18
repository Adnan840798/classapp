/**
 * Synchronous client-safe version of the URL resolver.
 * Safe to import inside Client Components since it does not reference next/headers.
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
