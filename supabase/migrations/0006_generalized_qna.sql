-- ============================================================
-- 0006_generalized_qna.sql — ClassApp: Q&A for Announcements & Deadlines
-- ============================================================
-- Adds foreign keys to link questions to announcements and deadlines,
-- and updates the Row Level Security insert policy.
-- ============================================================

-- 1. Ensure event_id is nullable (defensive)
ALTER TABLE public.timeline_questions ALTER COLUMN event_id DROP NOT NULL;

-- 2. Add columns linking to announcements and deadlines
ALTER TABLE public.timeline_questions
  ADD COLUMN announcement_id uuid REFERENCES public.announcements(id) ON DELETE CASCADE,
  ADD COLUMN deadline_id uuid REFERENCES public.deadlines(id) ON DELETE CASCADE;

-- 3. Drop the old RLS insert policy
DROP POLICY IF EXISTS "tq_student_insert" ON public.timeline_questions;

-- 4. Re-create the RLS insert policy
-- This policy allows student inserts on:
-- - Active events (qa_enabled = true)
-- - Existing announcements
-- - Existing deadlines
-- And checks that the student doesn't already have an unresolved question on the same item.
CREATE POLICY "tq_student_insert"
  ON public.timeline_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'student'
    AND (
      (
        event_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.calendar_events ce
          WHERE ce.id = event_id AND ce.qa_enabled = true
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.timeline_questions tq
          WHERE tq.event_id = timeline_questions.event_id
            AND tq.asked_by = auth.uid()
            AND tq.is_resolved = false
        )
      )
      OR
      (
        announcement_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.announcements a
          WHERE a.id = announcement_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.timeline_questions tq
          WHERE tq.announcement_id = timeline_questions.announcement_id
            AND tq.asked_by = auth.uid()
            AND tq.is_resolved = false
        )
      )
      OR
      (
        deadline_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.deadlines d
          WHERE d.id = deadline_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.timeline_questions tq
          WHERE tq.deadline_id = timeline_questions.deadline_id
            AND tq.asked_by = auth.uid()
            AND tq.is_resolved = false
        )
      )
    )
  );
