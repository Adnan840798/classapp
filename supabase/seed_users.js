#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * seed_users.js — ClassApp: Create test accounts in Supabase Auth
 *
 * Run AFTER migrations 0001–0004 have been applied.
 * Usage: node supabase/seed_users.js
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_USERS = [
  {
    email: 'cr@classapp.test',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Class Representative',
      university_id: 'CR-001',
      role: 'cr',
      batch: '2022',
      department: 'Computer Science'
    },
  },
  {
    email: 'student@classapp.test',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test Student',
      university_id: 'STU-001',
      role: 'student',
      batch: '2022',
      department: 'Computer Science'
    },
  },
  {
    email: 'admin@classapp.test',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Administrator',
      university_id: 'ADMIN-001',
      role: 'admin',
      batch: '2022',
      department: 'Computer Science'
    },
  },
];

async function seed() {
  console.log('🌱 Seeding test users...\n');
  for (const u of TEST_USERS) {
    let userId;
    const { data, error } = await supabase.auth.admin.createUser(u);
    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`⚠️  ${u.email} — already exists in Auth.`);
        // Find the user ID by email
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.error(`❌ Failed to list users: ${listError.message}`);
          continue;
        }
        const existingUser = usersData.users.find(usr => usr.email === u.email);
        if (existingUser) {
          userId = existingUser.id;
        }
      } else {
        console.error(`❌ ${u.email} — ${error.message}`);
        continue;
      }
    } else {
      userId = data.user.id;
      console.log(`✅ ${u.email} — created in Auth (${userId})`);
    }

    if (userId) {
      // Ensure profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error(`❌ Error checking profile for ${u.email}: ${profileError.message}`);
      } else if (!profile) {
        console.log(`🔧 Re-creating missing profile for ${u.email}...`);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: u.email,
            full_name: u.user_metadata.full_name,
            university_id: u.user_metadata.university_id,
            role: u.user_metadata.role,
            batch: u.user_metadata.batch,
            department: u.user_metadata.department
          });
        if (insertError) {
          console.error(`❌ Failed to insert profile for ${u.email}: ${insertError.message}`);
        } else {
          console.log(`✅ Profile created for ${u.email}`);
        }
      } else {
        console.log(`✨ Profile already exists for ${u.email}`);
        // Ensure the role is updated to match the seeded metadata role in case the trigger defaulted it to student
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: u.user_metadata.role })
          .eq('id', userId);
        if (updateError) {
          console.error(`❌ Failed to update profile role for ${u.email}: ${updateError.message}`);
        } else {
          console.log(`✅ Profile role verified/updated for ${u.email}`);
        }
      }
    }
  }
  console.log('\n✨ Done!');
}

seed();
