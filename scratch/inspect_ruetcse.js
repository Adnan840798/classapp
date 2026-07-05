const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const masterUrl = process.env.MASTER_SUPABASE_URL;
  const masterKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY;

  const master = createClient(masterUrl, masterKey);
  const { data: classData } = await master
    .from('class_connections')
    .select('tenants (supabase_url, supabase_anon_key)')
    .eq('join_code', 'RUETCSE24A')
    .single();

  const tenant = classData.tenants;
  console.log('Tenant URL:', tenant.supabase_url);

  // Connect to Tenant Supabase
  const tenantClient = createClient(tenant.supabase_url, tenant.supabase_anon_key, {
    auth: { persistSession: false }
  });

  console.log('Attempting login as student...');
  const { data: authData, error: authError } = await tenantClient.auth.signInWithPassword({
    email: '2403001@student.ruet.ac.bd',
    password: 'Password123!'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }

  const user = authData.user;
  console.log('Login successful! User ID:', user.id);

  // Authenticate the client with the session token
  const authenticatedClient = createClient(tenant.supabase_url, tenant.supabase_anon_key, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });

  console.log('Attempting profile update...');
  const { data: updatedProfile, error: updateError } = await authenticatedClient
    .from('profiles')
    .update({
      full_name: 'Test Student 2403001'
    })
    .eq('id', user.id)
    .select();

  if (updateError) {
    console.error('Profile update failed:', updateError);
  } else {
    console.log('Profile update successful! Data:', updatedProfile);
  }
}

run();
