#!/usr/bin/env node
/**
 * scripts/keep-alive.js
 *
 * Pings the master Supabase database and all registered tenant databases
 * to prevent them from pausing due to inactivity.
 *
 * ZERO dependencies — runs instantly on Node 18+ without npm install.
 */

async function main() {
  const masterUrl = process.env.MASTER_SUPABASE_URL;
  const masterKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY;

  if (!masterUrl || !masterKey) {
    console.error('❌ Missing MASTER_SUPABASE_URL or MASTER_SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
  }

  const cleanMasterUrl = masterUrl.replace(/\/$/, '');

  // 1. Fetch tenants list from Master database via native REST API
  console.log('📋 Fetching tenant databases from master registry...');
  const masterRestUrl = `${cleanMasterUrl}/rest/v1/tenants?select=buyer_email,supabase_url,supabase_anon_key,subscription_status`;
  
  let tenants = [];
  try {
    const response = await fetch(masterRestUrl, {
      method: 'GET',
      headers: {
        'apikey': masterKey,
        'Authorization': `Bearer ${masterKey}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Master database query failed (${response.status}): ${text}`);
    }

    tenants = await response.json();
  } catch (err) {
    console.error('❌ Failed to fetch tenants from master database:', err.message);
    process.exit(1);
  }

  console.log(`✅ Found ${tenants.length} tenants in master registry.`);

  let succeeded = 0;
  let failed = 0;

  // 2. Ping each active tenant database
  for (const tenant of tenants) {
    const { buyer_email, supabase_url, supabase_anon_key, subscription_status } = tenant;
    
    if (subscription_status !== 'active') {
      console.log(`⚠️ Skipping inactive tenant: ${buyer_email} (status: ${subscription_status})`);
      continue;
    }

    if (!supabase_url || !supabase_anon_key) {
      console.warn(`⚠️ Tenant ${buyer_email} is missing URL or anon key.`);
      failed++;
      continue;
    }

    const cleanTenantUrl = supabase_url.replace(/\/$/, '');
    console.log(`\n⚡ Pinging tenant database: ${buyer_email} (${cleanTenantUrl})`);
    
    try {
      // Execute a lightweight query on the tenant's profiles table to verify activity
      const restUrl = `${cleanTenantUrl}/rest/v1/profiles?select=id&limit=1`;
      
      const response = await fetch(restUrl, {
        method: 'GET',
        headers: {
          'apikey': supabase_anon_key,
          'Authorization': `Bearer ${supabase_anon_key}`
        }
      });

      if (response.ok) {
        console.log(`✅ Successfully pinged ${buyer_email}. Status: ${response.status}`);
        succeeded++;
      } else {
        const text = await response.text();
        console.error(`❌ Failed to ping ${buyer_email}. Status: ${response.status}. Error: ${text.slice(0, 200)}`);
        failed++;
      }
    } catch (err) {
      console.error(`❌ Network error pinging ${buyer_email}:`, err.message);
      failed++;
    }
  }

  console.log('\n======================================');
  console.log(`🏁 Keep-alive run completed.`);
  console.log(`   Succeeded: ${succeeded}`);
  console.log(`   Failed: ${failed}`);
  console.log('======================================');

  if (failed > 0) {
    process.exit(1); // Fail the job if any pings failed so GitHub Action reports failure/sends email
  }
}

main().catch(err => {
  console.error('💥 Fatal error in keep-alive script:', err);
  process.exit(1);
});
