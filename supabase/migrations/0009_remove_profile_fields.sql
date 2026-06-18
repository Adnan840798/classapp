-- ============================================================
-- 0009_remove_profile_fields.sql — Remove unused columns
-- ============================================================

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS blood_group,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS facebook_id;
