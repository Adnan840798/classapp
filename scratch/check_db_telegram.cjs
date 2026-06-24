const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  console.log('Querying telegram_config table from', supabaseUrl);
  const { data, error } = await supabase.from('telegram_config').select('*');
  if (error) {
    console.error('Query failed:', error);
  } else {
    console.log('Success! Contents:', data);
  }
}

check();
