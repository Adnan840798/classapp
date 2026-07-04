import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Keepalive cron endpoint — prevents Supabase free-tier DB auto-pause.
 *
 * Runs every 3 days via Vercel Cron (configured in vercel.json).
 * Pings all active tenant Supabase projects with a lightweight SELECT
 * so they never go idle (free-tier pauses after 1 week of inactivity).
 *
 * SECURITY: Protected by CRON_SECRET header. Vercel automatically sets the
 * x-vercel-cron-signature header for cron triggers. We additionally check
 * a shared secret so the route cannot be abused by external callers.
 *
 * ENV VARS REQUIRED (add to Vercel Dashboard → Settings → Environment Variables):
 *   MASTER_SUPABASE_URL              — Master Supabase project URL
 *   MASTER_SUPABASE_SERVICE_ROLE_KEY — Master project service role key
 *   CRON_SECRET                      — Random secret, e.g. from: openssl rand -hex 32
 */
export async function GET(req: NextRequest) {
  // Verify request is from our cron job (not external callers)
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    console.warn('[keepalive] Unauthorized ping rejected');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const masterUrl = process.env.MASTER_SUPABASE_URL;
  const masterKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY;

  if (!masterUrl || !masterKey) {
    console.error('[keepalive] Missing MASTER_SUPABASE_URL or MASTER_SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Fetch all active tenant URLs from the master registry
  const masterAdmin = createClient(masterUrl, masterKey);
  const { data: tenants, error } = await masterAdmin
    .from('tenants')
    .select('supabase_url, supabase_anon_key')
    .eq('is_active', true);

  if (error || !tenants) {
    console.error('[keepalive] Failed to fetch tenants:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }

  // Ping each tenant DB with a minimal query in parallel
  const results = await Promise.allSettled(
    tenants.map(async (tenant) => {
      const client = createClient(tenant.supabase_url, tenant.supabase_anon_key);
      // Lightweight ping — reads the singleton semester_config row
      const { error: pingError } = await client
        .from('semester_config')
        .select('id')
        .eq('id', 1)
        .maybeSingle();
      if (pingError) throw new Error(`${tenant.supabase_url}: ${pingError.message}`);
      return tenant.supabase_url;
    })
  );

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason?.message);

  if (failed.length > 0) {
    console.warn('[keepalive] Some tenants failed to ping:', failed);
  }

  console.log(`[keepalive] Pinged ${successful}/${tenants.length} tenants successfully`);

  return NextResponse.json({
    success: true,
    pinged: successful,
    total: tenants.length,
    failed: failed.length > 0 ? failed : undefined,
  });
}
