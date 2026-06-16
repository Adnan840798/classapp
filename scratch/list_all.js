import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  console.log('AUTH USERS:');
  authUsers?.users.forEach(u => {
    console.log(`- ID: ${u.id}, Email: ${u.email}, CreatedAt: ${u.created_at}`);
  });

  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('\nPROFILES:');
  profiles?.forEach(p => {
    console.log(`- ID: ${p.id}, Email: ${p.email}, Name: ${p.full_name}, UniID: ${p.university_id}, Role: ${p.role}, ResetRequired: ${p.password_reset_required}`);
  });
}

run();
