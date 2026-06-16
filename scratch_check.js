import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function check() {
  console.log('Querying database:', supabaseUrl);
  
  // 1. Delete adnan@gmail.com to restore test state
  console.log('Cleaning up user adnan@gmail.com...');
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const targetUser = usersData?.users.find(u => u.email === 'adnan@gmail.com');
  if (targetUser) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUser.id);
    if (deleteError) {
      console.error('Error deleting user:', deleteError.message);
    } else {
      console.log('Successfully deleted user adnan@gmail.com.');
    }
  } else {
    console.log('User adnan@gmail.com does not exist, nothing to clean up.');
  }


  // 2. Check public.profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, role, password_reset_required');

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  } else {
    console.log('Profiles list:', profiles);
  }

  // 3. Check public.tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('*');
  if (tenantsError) {
    console.error('Error fetching tenants:', tenantsError.message);
  } else {
    console.log('Tenants:', tenants);
  }

  // 4. Check public.class_connections
  const { data: connections, error: connectionsError } = await supabase
    .from('class_connections')
    .select('*');
  if (connectionsError) {
    console.error('Error fetching connections:', connectionsError.message);
  } else {
    console.log('Class Connections:', connections);
  }
}

check();
