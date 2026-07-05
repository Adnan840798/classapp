-- 0006_resource_attachments.sql
-- Adds file attachment support to the notes/resources table (CR-only upload feature)
-- and enables Realtime replication for the notifications table.

-- 1. Add attachment columns to notes table
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT; -- 'image' | 'pdf'

-- 2. Add 'resources' sub-path constant (no schema change needed, just stored in notices bucket)

-- 3. Enable Realtime for notifications table so students receive live notification updates
--    (if not already added to the publication)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
