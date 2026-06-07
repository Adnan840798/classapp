-- ============================================================
-- 0003_semester_config.sql — Semester Configuration
-- ============================================================
-- Stores global semester settings, starting with total_weeks.
-- Also relaxes the week_number constraint on holiday_days so
-- that CRs can add weeks beyond the default 14.
-- ============================================================

-- ── semester_config ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.semester_config (
  id           int PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
  total_weeks  int NOT NULL DEFAULT 14 CHECK (total_weeks BETWEEN 1 AND 52),
  updated_at   timestamptz DEFAULT now(),
  updated_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Seed default row if not exists
INSERT INTO public.semester_config (id, total_weeks)
VALUES (1, 14)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.semester_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_read_authenticated" ON public.semester_config;
DROP POLICY IF EXISTS "sc_cr_admin_update" ON public.semester_config;

-- All authenticated users can read config
CREATE POLICY "sc_read_authenticated"
  ON public.semester_config FOR SELECT
  TO authenticated
  USING (true);

-- Only CR and admin can update config
CREATE POLICY "sc_cr_admin_update"
  ON public.semester_config FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'))
  WITH CHECK (public.get_my_role() IN ('cr', 'admin'));

-- ── Relax holiday_days week_number constraint ────────────────
-- Remove the hard limit of 14 so weeks beyond 14 can be marked as holiday.
ALTER TABLE public.holiday_days
  DROP CONSTRAINT IF EXISTS holiday_days_week_number_check;

ALTER TABLE public.holiday_days
  ADD CONSTRAINT holiday_days_week_number_check
  CHECK (week_number BETWEEN 1 AND 52);

-- Done!
