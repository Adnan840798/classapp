-- ============================================================
-- seed.sql — ClassApp: Test Accounts
-- ============================================================
-- Run this AFTER running migrations 0001, 0002, 0003
-- IMPORTANT: First create these users in Supabase Auth dashboard
-- or via Supabase CLI, then run this to populate their profiles.
--
-- Test Credentials:
--   CR:      cr@classapp.test     / Password123!
--   Student: student@classapp.test / Password123!
--   Admin:   admin@classapp.test  / Password123!
--
-- After creating Auth users, replace the UUIDs below with real ones.
-- ============================================================

-- Example: replace 'YOUR_CR_UUID', 'YOUR_STUDENT_UUID', 'YOUR_ADMIN_UUID'
-- with the actual UUIDs from auth.users after signup.

-- Uncomment and fill in after creating auth users:
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
