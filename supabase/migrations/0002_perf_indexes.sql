-- ============================================================
-- Migration: 0001_perf_indexes.sql
-- Adds performance indexes to all heavily-queried columns.
-- Safe to re-run (IF NOT EXISTS). Run on EACH tenant Supabase project.
-- ============================================================

-- Announcements
CREATE INDEX IF NOT EXISTS ann_created_at_idx   ON public.announcements (created_at DESC);
CREATE INDEX IF NOT EXISTS ann_is_important_idx ON public.announcements (is_important);

-- Deadlines
CREATE INDEX IF NOT EXISTS dl_due_date_idx      ON public.deadlines (due_date DESC);

-- Exam Results
CREATE INDEX IF NOT EXISTS res_published_at_idx ON public.exam_results (published_at DESC);

-- Notifications (most critical: queried on every poll)
CREATE INDEX IF NOT EXISTS notif_user_id_idx    ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notif_created_at_idx ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS notif_user_read_idx  ON public.notifications (user_id, is_read);

-- Notes / Resources
CREATE INDEX IF NOT EXISTS notes_user_id_idx        ON public.notes (user_id);
CREATE INDEX IF NOT EXISTS notes_public_pending_idx ON public.notes (is_public, is_pending);

-- Profiles
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);
CREATE INDEX IF NOT EXISTS profiles_role_idx  ON public.profiles (role);

-- Timeline QnA
CREATE INDEX IF NOT EXISTS tq_is_resolved_idx ON public.timeline_questions (is_resolved);
CREATE INDEX IF NOT EXISTS tq_asked_by_idx    ON public.timeline_questions (asked_by);

-- Calendar Events
CREATE INDEX IF NOT EXISTS cal_event_date_idx ON public.calendar_events (event_date DESC);

-- Holiday Days
CREATE INDEX IF NOT EXISTS hd_week_number_idx ON public.holiday_days (week_number);
