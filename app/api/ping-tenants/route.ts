import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30; // allow up to 30s for all tenant pings

/**
 * GET /api/ping-tenants
 *
 * Keep-alive endpoint for all tenant Supabase instances.
 *
 * How it works:
 *   1. Reads every tenant's supabase_url from the master registry.
 *   2. Fires a lightweight REST call (/rest/v1/profiles?limit=1) at each
 *      tenant in parallel — enough to wake a paused Supabase project.
 *   3. Returns a JSON report of which tenants responded OK vs failed.
 *
 * Security: Protected by x-ping-token header (same secret as /api/ping).
 *
 * Cron-job.org setup:
 *   URL:    https://<your-app>.vercel.app/api/ping-tenants
 *   Method: GET
 *   Header: x-ping-token: <your PING_SECRET value>
 *   Schedule: every 5 minutes (or 3 days — Supabase pauses after 7 days)
 */
export async function GET(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = request.headers.get('x-ping-token');
  const secret = process.env.PING_SECRET;
  if (secret && token !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ── Read all tenant URLs from master registry ─────────────────────────────
  const masterUrl = process.env.MASTER_SUPABASE_URL;
  const masterKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY;

  if (!masterUrl || !masterKey) {
    return NextResponse.json(
      { error: 'MASTER_SUPABASE_URL or MASTER_SUPABASE_SERVICE_ROLE_KEY not configured' },
      { status: 500 }
    );
  }

  const master = createClient(masterUrl, masterKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: tenants, error } = await master
    .from('tenants')
    .select('id, supabase_url, supabase_anon_key, buyer_email')
    .eq('subscription_status', 'active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!tenants || tenants.length === 0) {
    return NextResponse.json({ ok: true, pinged: [], count: 0, ts: Date.now() });
  }

  // ── Decrypt anon keys and ping each tenant in parallel ────────────────────

  // Decrypt the anon keys (they are AES-256-GCM encrypted in the DB)
  const encKey = process.env.MASTER_ENCRYPTION_KEY;

  async function decryptAnonKey(encrypted: string): Promise<string | null> {
    if (!encKey) return encrypted; // no key configured — return as-is (unencrypted legacy)
    try {
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        // Not encrypted (e.g. legacy unencrypted key or master class anon key)
        return encrypted;
      }
      const [ivHex, encryptedHex, authTagHex] = parts;
      if (encKey.length !== 64) return null; // must be 32-byte hex
      const crypto = await import('crypto');
      const key = Buffer.from(encKey, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return null;
    }
  }

  const results = await Promise.allSettled(
    tenants.map(async (tenant) => {
      const anonKey = await decryptAnonKey(tenant.supabase_anon_key);
      if (!anonKey) {
        return { id: tenant.id, url: tenant.supabase_url, status: 'skip_no_key' };
      }

      // Ping: a simple REST call that wakes the DB without touching real data
      const pingUrl = `${tenant.supabase_url}/rest/v1/profiles?select=id&limit=1`;
      const res = await fetch(pingUrl, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        signal: AbortSignal.timeout(10_000), // 10s per tenant max
      });

      return {
        id: tenant.id,
        url: tenant.supabase_url,
        buyer: tenant.buyer_email,
        status: res.ok ? 'ok' : `http_${res.status}`,
      };
    })
  );

  const report = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { status: 'error', reason: String((r as PromiseRejectedResult).reason) }
  );

  const allOk = report.every((r: any) => r.status === 'ok' || r.status === 'skip_no_key');

  return NextResponse.json({
    ok: allOk,
    pinged: report,
    count: report.length,
    ts: Date.now(),
  });
}
