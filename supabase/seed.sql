-- ============================================================
-- seed.sql — ClassApp: Seeding test accounts
-- ============================================================
--
-- METHOD 1: Automated Script (Recommended)
-- ------------------------------------------------------------
-- Simply run the Node.js script:
--   node supabase/seed_users.js
--
-- This script uses the Supabase Admin API to create the Auth users.
-- The database trigger (handle_new_user) will automatically populate
-- the public.profiles table with roles, names, batch, etc.
--
--
-- METHOD 2: Manual Seeding via Supabase SQL Editor
-- ------------------------------------------------------------
-- 1. Sign up/create the following 3 users via your Supabase Auth dashboard:
--
--    Role      | Email                  | Password
--    ----------|------------------------|-------------
--    CR        | cr@classapp.test       | Password123!
--    Student   | student@classapp.test  | Password123!
--    Admin     | admin@classapp.test    | Password123!
--
-- 2. Go to the Auth Users table and copy each user's ID (UUID).
-- 3. Replace 'YOUR_CR_UUID', 'YOUR_STUDENT_UUID', and 'YOUR_ADMIN_UUID' below.
-- 4. Uncomment and run this SQL script.
--
-- ============================================================

/*
INSERT INTO profiles (id, full_name, university_id, email, role, batch, department)
VALUES
  (
    'YOUR_CR_UUID',
    'Class Representative',
    'CR-001',
    'cr@classapp.test',
    'cr',
    '2022',
    'Computer Science'
  ),
  (
    'YOUR_STUDENT_UUID',
    'Test Student',
    'STU-001',
    'student@classapp.test',
    'student',
    '2022',
    'Computer Science'
  ),
  (
    'YOUR_ADMIN_UUID',
    'Administrator',
    'ADMIN-001',
    'admin@classapp.test',
    'admin',
    '2022',
    'Computer Science'
  )
ON CONFLICT (id) DO UPDATE SET
  full_name     = EXCLUDED.full_name,
  university_id = EXCLUDED.university_id,
  role          = EXCLUDED.role,
  batch         = EXCLUDED.batch,
  department    = EXCLUDED.department;
*/
