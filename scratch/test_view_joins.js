// scratch/test_view_joins.js
// Automated verification script for ClassApp security view joins and RLS lock down
// Creates a temporary student user, runs authenticated tests, and deletes the user to clean up.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON_KEY || !SERVICE_ROLE) {
  console.error('❌ Error: Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}

// 1. Admin client (bypasses RLS) to handle test user lifecycle
const adminClient = createClient(URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// 2. Student client (respects RLS) to execute queries under authentic session
const studentClient = createClient(URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const testEmail = `test-student-${Date.now()}@classapp.edu`;
  const testPassword = 'Password123!';
  let userId = null;

  try {
    console.log(`Creating disposable test user: ${testEmail}...`);
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        full_name: 'Test Student Account',
        university_id: `TST-${Math.floor(Math.random() * 100000)}`
      }
    });

    if (createErr || !newUser?.user) {
      throw new Error(`Failed to create test user: ${createErr?.message}`);
    }

    userId = newUser.user.id;
    console.log(`✅ Test user created with ID: ${userId}`);

    // Wait 2.5 seconds for DB trigger to complete profiles creation
    console.log('Waiting for profiles trigger setup...');
    await new Promise((r) => setTimeout(r, 2500));

    console.log('Logging in as student...');
    const { data: sessionData, error: loginErr } = await studentClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (loginErr || !sessionData?.session) {
      throw new Error(`Login failed: ${loginErr?.message}`);
    }

    console.log('✅ Login successful. Running PostgREST relationship tests...');

    // Test 1: Announcements Join (Single FK on profiles_public view)
    console.log('\n--- Test 1: announcements -> profiles_public join ---');
    const { data: annData, error: annErr } = await studentClient
      .from('announcements')
      .select('id, creator:profiles_public(full_name)')
      .limit(1);

    if (annErr) {
      console.error('❌ Test 1 Schema Resolution Failed:', annErr.message);
    } else {
      console.log('✅ Test 1 Passed! Result:', JSON.stringify(annData));
    }

    // Test 2: Timeline Questions Join (Double FK on profiles_public view - Hinted)
    console.log('\n--- Test 2: timeline_questions -> asker:profiles_public!asked_by join ---');
    const { data: qData, error: qErr } = await studentClient
      .from('timeline_questions')
      .select('id, asker:profiles_public!asked_by(full_name)')
      .limit(1);

    if (qErr) {
      console.error('❌ Test 2 Schema Resolution Failed:', qErr.message);
    } else {
      console.log('✅ Test 2 Passed! Result:', JSON.stringify(qData));
    }

    // Test 3: RLS Security Boundary Check (Query raw profiles for another user)
    console.log('\n--- Test 3: RLS lockdown on raw profiles table ---');
    const { data: otherProfiles } = await adminClient
      .from('profiles')
      .select('id')
      .neq('id', userId)
      .limit(1);

    if (otherProfiles && otherProfiles.length > 0) {
      const otherId = otherProfiles[0].id;
      const { data: pData, error: pErr } = await studentClient
        .from('profiles')
        .select('phone, whatsapp')
        .eq('id', otherId)
        .maybeSingle();

      if (pErr) {
        console.log('✅ Test 3 Passed! Fetch blocked by RLS error:', pErr.message);
      } else if (!pData) {
        console.log('✅ Test 3 Passed! Fetch returned empty row (RLS locked down).');
      } else {
        console.error('❌ Test 3 Failed! Leaked other user profiles data:', pData);
      }
    } else {
      console.log('Skipping Test 3: No other profiles exist in database to query.');
    }

  } catch (err) {
    console.error('❌ Error occurred during testing:', err.message || err);
  } finally {
    if (userId) {
      console.log(`\nCleaning up: deleting test user ${userId}...`);
      const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteErr) {
        console.error('Failed to delete test user during cleanup:', deleteErr.message);
      } else {
        console.log('✅ Cleanup complete. Database is pristine.');
      }
    }
  }
}

run();
