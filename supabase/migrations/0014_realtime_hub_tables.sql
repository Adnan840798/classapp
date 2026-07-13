-- ============================================================
-- 0013_realtime_hub_tables.sql
-- Enable Supabase Realtime for the 4 main hub tables so that
-- when a CR inserts/updates/deletes announcements, deadlines,
-- results, or resources, all connected students receive the
-- change instantly via WebSocket without polling or refreshing.
--
-- Run this file in the SQL editor of EACH tenant Supabase project.
-- ============================================================

-- announcements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
END $$;

-- deadlines
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'deadlines'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deadlines;
  END IF;
END $$;

-- exam_results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'exam_results'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_results;
  END IF;
END $$;

-- notes (public_resources come from this table filtered by is_public=true, is_pending=false)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
  END IF;
END $$;
