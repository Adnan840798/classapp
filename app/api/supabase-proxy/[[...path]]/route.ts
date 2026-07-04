import { NextRequest, NextResponse } from 'next/server';

/**
 * Catch-all route to proxy all Supabase requests from client to the tenant instance.
 * Bypasses local ISP blocks on *.supabase.co by routing traffic through Vercel.
 */
function getAllowedOrigin(request: NextRequest): string {
  // Only permit requests from our own origin — the proxy is an internal helper.
  const origin = request.headers.get('origin') ?? '';
  const host = request.headers.get('host') ?? '';
  // Strip port from host for comparison
  const hostWithoutPort = host.split(':')[0];
  try {
    const originHost = new URL(origin).hostname;
    if (originHost === hostWithoutPort) return origin;
  } catch {
    // Malformed origin — fall through to deny
  }
  // Vercel preview / custom domain allow-list kept via env var
  const allowed = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  if (allowed && origin === allowed) return origin;
  return '';
}

async function handleProxy(request: NextRequest) {
  const tenantUrl = request.cookies.get('tenant_supabase_url')?.value || process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!tenantUrl) {
    return NextResponse.json(
      { error: 'Class connection configuration is missing. Please reconnect.' },
      { status: 400 }
    );
  }

  // Extract the target subpath (everything after /api/supabase-proxy)
  const { pathname, search } = request.nextUrl;
  const targetSubpath = pathname.replace(/^\/api\/supabase-proxy/, '');
  const targetUrl = `${tenantUrl.replace(/\/$/, '')}${targetSubpath}${search}`;

  // Clone headers and remove proxy/host headers to prevent Cloudflare conflicts
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!['host', 'origin', 'referer', 'content-length', 'connection'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Inject/override the tenant's anon key if available
  const tenantAnonKey = request.cookies.get('tenant_supabase_anon_key')?.value || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (tenantAnonKey) {
    const originalApiKey = headers.get('apikey');
    headers.set('apikey', tenantAnonKey);

    const authHeader = headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      if (
        !token ||
        token === originalApiKey ||
        token === 'proxy-managed' ||
        token === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        headers.set('authorization', `Bearer ${tenantAnonKey}`);
      }
    } else {
      headers.set('authorization', `Bearer ${tenantAnonKey}`);
    }
  }

  let body: any = null;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    try {
      body = await request.arrayBuffer();
    } catch {
      // Empty or unparseable body
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Remove connection or encoding headers that next/vercel server handles
      if (!['content-encoding', 'transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // Restrict CORS to same-origin only — wildcard would expose JWT traffic to any site
    const allowedOrigin = getAllowedOrigin(request);
    if (allowedOrigin) {
      responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
      responseHeaders.set('Vary', 'Origin');
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error(`Supabase Proxy failed to connect to ${targetUrl}:`, err);
    return NextResponse.json(
      { 
        error: 'connection_failed',
        error_description: `Connection to database server failed: ${err.message}`
      },
      { status: 400 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;

export const OPTIONS = async (request: NextRequest) => {
  const allowedOrigin = getAllowedOrigin(request);
  return new NextResponse(null, {
    status: allowedOrigin ? 200 : 403,
    headers: allowedOrigin ? {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info, prefer',
      'Vary': 'Origin',
    } : {},
  });
};
