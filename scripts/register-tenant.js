// scripts/register-tenant.js
// Standalone administrative provisioning tool to register new class tenants
// Encrypts credentials locally before DB insert to prevent plaintext leakage.

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY;
const MASTER_URL = process.env.MASTER_SUPABASE_URL;
const MASTER_SERVICE_KEY = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY;

if (!MASTER_KEY || MASTER_KEY.length !== 64) {
  console.error('Error: MASTER_ENCRYPTION_KEY must be a valid 32-byte (64 character) hex string in .env.local.');
  process.exit(1);
}
if (!MASTER_URL || !MASTER_SERVICE_KEY) {
  console.error('Error: MASTER_SUPABASE_URL and MASTER_SUPABASE_SERVICE_ROLE_KEY must be configured in .env.local.');
  process.exit(1);
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(MASTER_KEY, 'hex'), iv);
  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

async function registerTenant(email, tenantUrl, anonKey, joinCode, className) {
  try {
    const masterClient = createClient(MASTER_URL, MASTER_SERVICE_KEY);
    
    // Encrypt the sensitive tenant key
    const encryptedKey = encrypt(anonKey.trim());

    console.log(`Registering tenant database for: ${email}...`);
    const { data: tenant, error: tErr } = await masterClient
      .from('tenants')
      .insert({
        buyer_email: email.trim().toLowerCase(),
        supabase_url: tenantUrl.trim(),
        supabase_anon_key: encryptedKey
      })
      .select('id')
      .single();

    if (tErr) throw tErr;

    console.log(`Tenant registered with ID: ${tenant.id}. Mapping join code "${joinCode}"...`);
    const { error: cErr } = await masterClient
      .from('class_connections')
      .insert({
        join_code: joinCode.trim().toUpperCase(),
        tenant_id: tenant.id,
        class_name: className.trim()
      });

    if (cErr) throw cErr;
    console.log('Success! Tenant connection established securely.');
  } catch (err) {
    console.error('❌ Registration failed:', err.message || err);
    process.exit(1);
  }
}

// Simple CLI Argument Parsing
const args = process.argv.slice(2);
if (args.length < 5) {
  console.log('Usage: node scripts/register-tenant.js <buyer_email> <tenant_supabase_url> <tenant_supabase_anon_key> <join_code> <class_name>');
  process.exit(1);
}

registerTenant(args[0], args[1], args[2], args[3], args[4]);
