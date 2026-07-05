-- ============================================================
-- Migration: 0009_notification_cleanup.sql
-- Description: Automatically deletes notifications when their referenced resource (announcement, deadline, exam result, note/resource) is deleted.
-- Run this SQL on BOTH the Master and EACH tenant Supabase project's SQL Editor.
-- ============================================================

-- 1. Create the cleanup function
CREATE OR REPLACE FUNCTION public.delete_associated_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE reference_id = OLD.id;
  RETURN OLD;
END;
$$;

-- 2. Create triggers for all resource tables

-- Announcements
DROP TRIGGER IF EXISTS tr_delete_announcement_notifications ON public.announcements;
CREATE TRIGGER tr_delete_announcement_notifications
  AFTER DELETE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_associated_notifications();

-- Deadlines
DROP TRIGGER IF EXISTS tr_delete_deadline_notifications ON public.deadlines;
CREATE TRIGGER tr_delete_deadline_notifications
  AFTER DELETE ON public.deadlines
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_associated_notifications();

-- Exam Results
DROP TRIGGER IF EXISTS tr_delete_exam_result_notifications ON public.exam_results;
CREATE TRIGGER tr_delete_exam_result_notifications
  AFTER DELETE ON public.exam_results
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_associated_notifications();

-- Notes/Resources
DROP TRIGGER IF EXISTS tr_delete_note_notifications ON public.notes;
CREATE TRIGGER tr_delete_note_notifications
  AFTER DELETE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_associated_notifications();

-- Calendar Events
DROP TRIGGER IF EXISTS tr_delete_calendar_event_notifications ON public.calendar_events;
CREATE TRIGGER tr_delete_calendar_event_notifications
  AFTER DELETE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_associated_notifications();
