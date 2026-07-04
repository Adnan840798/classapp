-- ============================================================
-- Migration: 0002_fix_broadcast.sql
-- Rewrites broadcast_notification to use bulk INSERT + bulk DELETE
-- instead of a 60-iteration FOR loop (120 DB ops per announcement).
-- Safe to re-run (CREATE OR REPLACE). Run on EACH tenant Supabase project.
-- ============================================================

CREATE OR REPLACE FUNCTION public.broadcast_notification(
  p_title        text,
  p_message      text,
  p_type         text    DEFAULT 'general',
  p_reference_id uuid    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Step 1: Bulk insert one notification per student in a single statement
  -- (replaces the 60-row FOR LOOP that did 60 individual INSERTs)
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  SELECT id, p_title, p_message, p_type, p_reference_id
  FROM   public.profiles
  WHERE  role = 'student';

  -- Step 2: Trim each student's inbox to the latest 15 notifications.
  -- Uses a window function to rank rows per user, then deletes in bulk.
  -- (replaces 60 individual DELETE statements - one per student)
  DELETE FROM public.notifications
  WHERE id IN (
    SELECT id
    FROM (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id
          ORDER BY created_at DESC
        ) AS rn
      FROM public.notifications
      WHERE user_id IN (
        SELECT id FROM public.profiles WHERE role = 'student'
      )
    ) ranked
    WHERE rn > 15
  );
END;
$$;
