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
    const { data, error } = await supabase.auth.admin.createUser(u);
    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`⚠️  ${u.email} — already exists, skipping.`);
      } else {
        console.error(`❌ ${u.email} — ${error.message}`);
      }
    } else {
      console.log(`✅ ${u.email} — created (${data.user.id})`);
    }
  }
  console.log('\n✨ Done!');
}

seed();
