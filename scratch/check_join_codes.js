import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.MASTER_SUPABASE_URL;
const serviceKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data, error } = await supabase.from('class_connections').select('*');
  if (error) {
    console.error('Error fetching class_connections:', error);
  } else {
    console.log('CLASS CONNECTIONS:', data);
  }
}
run();
