const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const masterUrl = process.env.MASTER_SUPABASE_URL;
const serviceKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY;

if (!masterUrl || !serviceKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(masterUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fix() {
  console.log('Connecting to master database to update tenant URL...');
  
  const { data, error } = await supabase
    .from('tenants')
    .update({ supabase_url: 'https://luvpdlpdjzjimdzzikbg.supabase.co' })
    .eq('id', '4321b63b-d27d-4937-98b6-0a1a5b995647')
    .select();

  if (error) {
    console.error('❌ Failed to update URL:', error.message);
  } else {
    console.log('✅ Successfully updated URL in registry:', data);
  }
}

fix();
