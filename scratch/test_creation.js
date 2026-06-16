import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We need to bypass authenticate check in createStudentAccount or set cookie/auth header.
// Since createStudentAccount checks getSupabaseServerClient and gets current user,
// let's sign in as cr@classapp.test first using the client or simulate a request.
// Wait, we can't easily set the session for server actions outside of next request context.
// Instead, let's look at the implementation of createStudentAccount:
// It uses getSupabaseServerClient().
// Let's write a script that simulates createStudentAccount but runs as service role or directly
// inserts the user via Admin Auth API, then checks public.profiles!

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const email = 'adnantest@gmail.com';
  const university_id = 'TEST-001';
  
  // Clean up if already exists
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const existingUser = usersData?.users.find(u => u.email === email);
  if (existingUser) {
    console.log('Cleaning up existing user...');
    await supabase.auth.admin.deleteUser(existingUser.id);
  }

  console.log('Creating student user via admin client (triggers handle_new_user)...');
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Adnan Test',
      university_id,
      role: 'student',
      batch: '2022',
      department: 'CSE',
    },
  });

  if (createError) {
    console.error('Create error:', createError.message);
    return;
  }

  const userId = newUser.user.id;
  console.log('User created in Auth with ID:', userId);

  // Wait a moment for trigger
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Query profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('Profile fetch error:', profileError.message);
  } else if (!profile) {
    console.log('❌ PROFILE WAS NOT CREATED BY TRIGGER!');
  } else {
    console.log('✅ PROFILE CREATED:', profile);
  }

  // Cleanup
  console.log('Cleaning up...');
  await supabase.auth.admin.deleteUser(userId);
}

run();
