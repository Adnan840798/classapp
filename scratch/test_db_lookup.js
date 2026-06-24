const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const masterUrl = process.env.MASTER_SUPABASE_URL;
const masterKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY;

if (!masterUrl || !masterKey) {
  console.error('Error: MASTER_SUPABASE_URL or MASTER_SUPABASE_SERVICE_ROLE_KEY is not defined in .env.local');
  process.exit(1);
}

const masterAdmin = createClient(masterUrl, masterKey);

async function testLookup() {
  console.log('Querying master database for join code "RUETCSE24A"...');
  const { data, error } = await masterAdmin
    .from('class_connections')
    .select('class_name, tenants (supabase_url, supabase_anon_key)')
    .eq('join_code', 'RUETCSE24A')
    .single();

  if (error) {
    console.error('Query failed:', error);
  } else {
    console.log('Result:');
    console.log('Class Name:', data.class_name);
    console.log('Tenant URL:', data.tenants ? data.tenants.supabase_url : 'null');
    console.log('Tenant Key prefix:', data.tenants ? data.tenants.supabase_anon_key.substring(0, 20) + '...' : 'null');
  }
}

testLookup();
