-- ============================================================
-- 0008_semester_start_date.sql — Add start_date to semester_config
-- ============================================================

ALTER TABLE public.semester_config
  ADD COLUMN IF NOT EXISTS start_date date NOT NULL DEFAULT '2026-05-20';
