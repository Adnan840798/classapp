-- ============================================================
-- 0001_holiday_days.sql — Holiday Days Feature
-- ============================================================
-- Run this in Supabase SQL Editor AFTER 0000_complete_schema.sql
-- Adds the holiday_days table for the CR Holiday Mode feature.
-- ============================================================

-- ── holiday_days ───────────────────────────────────────────
-- Stores which academic day slots (week_number, day_index) are
-- marked as holidays by the CR. Max 70 rows (14 weeks × 5 days).
CREATE TABLE IF NOT EXISTS public.holiday_days (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number  int NOT NULL CHECK (week_number BETWEEN 1 AND 14),
  day_index    int NOT NULL CHECK (day_index BETWEEN 0 AND 4), -- 0=SAT, 1=SUN, 2=MON, 3=TUE, 4=WED
  note         text,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (week_number, day_index)
);

-- Enable RLS
ALTER TABLE public.holiday_days ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies (idempotency)
DROP POLICY IF EXISTS "hd_read_authenticated" ON public.holiday_days;
DROP POLICY IF EXISTS "hd_cr_admin_insert" ON public.holiday_days;
DROP POLICY IF EXISTS "hd_cr_admin_delete" ON public.holiday_days;

-- All authenticated users can read holiday days
CREATE POLICY "hd_read_authenticated"
  ON public.holiday_days FOR SELECT
  TO authenticated
  USING (true);

-- Only CR and admin can mark/unmark holidays
CREATE POLICY "hd_cr_admin_insert"
  ON public.holiday_days FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('cr', 'admin'));

CREATE POLICY "hd_cr_admin_delete"
  ON public.holiday_days FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'));

-- Done!
