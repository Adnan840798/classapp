// scratch/inspect_tenants.js
// Inspects master database connections and active join codes to check mapping.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const MASTER_URL = process.env.MASTER_SUPABASE_URL;
const MASTER_KEY = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY;

if (!MASTER_URL || !MASTER_KEY) {
  console.error('❌ Error: Missing MASTER_SUPABASE_URL or MASTER_SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}

const master = createClient(MASTER_URL, MASTER_KEY);

async function run() {
  console.log('Querying class_connections...');
  const { data: connections, error: cErr } = await master
    .from('class_connections')
    .select('*, tenants(*)');

  if (cErr) {
    console.error('Error fetching class connections:', cErr);
    return;
  }

  console.log('--- Active Connections ---');
  console.log(JSON.stringify(connections, null, 2));
}

run();
