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
  console.log('Connecting to RUETCSE24A DB:', tenant.supabase_url);
  const tenantClient = createClient(tenant.supabase_url, tenant.supabase_anon_key);

  // 1. Query notifications
  console.log('Testing notifications select...');
  const { data: notifs, error: nError } = await tenantClient
    .from('notifications')
    .select('*')
    .limit(1);

  if (nError) {
    console.error('notifications table select error:', nError);
  } else {
    console.log('notifications table exists, sample:', notifs);
  }

  // 2. Query my_notifications view
  console.log('Testing my_notifications view...');
  const { data: myNotifs, error: mnError } = await tenantClient
    .from('my_notifications')
    .select('*')
    .limit(1);

  if (mnError) {
    console.error('my_notifications view select error:', mnError);
  } else {
    console.log('my_notifications view exists, sample:', myNotifs);
  }

  // 3. Test RPC call to broadcast_notification
  console.log('Testing broadcast_notification RPC call...');
  const { error: rpcError } = await tenantClient.rpc('broadcast_notification', {
    p_title: 'Test Title',
    p_message: 'Test Message',
    p_type: 'general'
  });

  if (rpcError) {
    console.error('broadcast_notification RPC error:', rpcError);
  } else {
    console.log('broadcast_notification RPC executed successfully!');
  }
}

run();
