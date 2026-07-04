import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.MASTER_SUPABASE_URL;
const serviceKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data, error } = await supabase.from('tenants').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('TENANTS:', data);
  }
}
run();
