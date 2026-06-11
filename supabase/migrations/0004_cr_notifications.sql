-- ============================================================
-- 0004_cr_notifications.sql — ClassApp: CR Notifications & Approval Setup
-- ============================================================

-- 1. Extend the public.notif_type enum
ALTER TYPE public.notif_type ADD VALUE IF NOT EXISTS 'qna';
ALTER TYPE public.notif_type ADD VALUE IF NOT EXISTS 'resource_pending';

-- 2. Add last read tracker for CR notifications to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cr_last_read_at timestamptz DEFAULT now();

-- 3. Add pending status for notes/resources
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_pending boolean DEFAULT false NOT NULL;

-- Drop old unconsolidated view if exists
DROP VIEW IF EXISTS public.cr_notifications;

-- 4. Create the secured, consolidated my_notifications view
-- WITH (security_invoker = on) ensures that querying this view enforces RLS of the underlying tables.
-- This view fetches both regular notifications and CR/Admin action notifications in a single table scan per entity.
CREATE OR REPLACE VIEW public.my_notifications 
WITH (security_invoker = on) AS
  -- 1. Regular user-targeted notifications
  SELECT 
    n.id::text AS id,
    n.type::text AS type,
    n.title::text AS title,
    n.message::text AS message,
    n.reference_id::text AS reference_id,
    n.is_read AS is_read,
    n.created_at AS created_at
  FROM public.notifications n
  WHERE n.user_id = auth.uid()

  UNION ALL

  -- 2. CR Questions (only scanned/loaded for CRs/Admins, dynamic in-DB read mapping)
  SELECT 
    q.id::text AS id,
    CASE 
      WHEN q.announcement_id IS NOT NULL THEN 'qna_announcement'
      WHEN q.deadline_id IS NOT NULL THEN 'qna_deadline'
      ELSE 'qna_event'
    END::text AS type,
    'New Student Question'::text AS title,
    substring(q.question from 1 for 100) AS message,
    COALESCE(q.announcement_id, q.deadline_id, q.event_id)::text AS reference_id,
    (q.created_at <= (SELECT cr_last_read_at FROM public.profiles WHERE id = auth.uid())) AS is_read,
    q.created_at AS created_at
  FROM public.timeline_questions q
  WHERE q.is_resolved = false AND public.get_my_role() IN ('cr', 'admin')

  UNION ALL

  -- 3. CR Pending resources (only scanned/loaded for CRs/Admins, dynamic in-DB read mapping)
  SELECT 
    n.id::text AS id,
    'resource_pending'::text AS type,
    'Resource Pending Review'::text AS title,
    n.title AS message,
    n.id::text AS reference_id,
    (n.created_at <= (SELECT cr_last_read_at FROM public.profiles WHERE id = auth.uid())) AS is_read,
    n.created_at AS created_at
  FROM public.notes n
  WHERE n.is_pending = true AND public.get_my_role() IN ('cr', 'admin');

-- 5. Update RLS policies for notes
-- Drop old policies first
DROP POLICY IF EXISTS "notes_own_select" ON public.notes;
DROP POLICY IF EXISTS "notes_own_update" ON public.notes;
DROP POLICY IF EXISTS "notes_own_delete" ON public.notes;

-- Select policy: Allow students to see own notes and public ones; CR/Admin can see all notes (including pending)
CREATE POLICY "notes_own_select"
  ON public.notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true OR public.get_my_role() IN ('cr', 'admin'));

-- Update policy: Allow students to update own notes; CR/Admin can update any note (for approving resources)
CREATE POLICY "notes_own_update"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_my_role() IN ('cr', 'admin'));

-- Delete policy: Allow students to delete own notes; CR/Admin can delete any note (for rejecting resources)
CREATE POLICY "notes_own_delete"
  ON public.notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_my_role() IN ('cr', 'admin'));
