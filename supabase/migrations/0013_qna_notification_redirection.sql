-- Migration 0013: Resolve QnA Notification Types for Redirection
-- Scope: Tenant Database Migration

DROP VIEW IF EXISTS public.my_notifications;

CREATE VIEW public.my_notifications
WITH (security_invoker = on) AS
  -- 1. Regular user-targeted notifications
  SELECT
    n.id::text          AS id,
    CASE
      WHEN n.type = 'qna' AND EXISTS (SELECT 1 FROM public.announcements WHERE id = n.reference_id) THEN 'qna_announcement'
      WHEN n.type = 'qna' AND EXISTS (SELECT 1 FROM public.deadlines WHERE id = n.reference_id) THEN 'qna_deadline'
      WHEN n.type = 'qna' AND EXISTS (SELECT 1 FROM public.calendar_events WHERE id = n.reference_id) THEN 'qna_event'
      ELSE n.type::text
    END AS type,
    n.title::text       AS title,
    n.message::text     AS message,
    n.reference_id::text AS reference_id,
    n.is_read           AS is_read,
    n.created_at        AS created_at
  FROM public.notifications n
  WHERE n.user_id = auth.uid()

  UNION ALL

  -- 2. CR/Admin: unresolved student questions
  SELECT
    q.id::text AS id,
    CASE
      WHEN q.announcement_id IS NOT NULL THEN 'qna_announcement'
      WHEN q.deadline_id     IS NOT NULL THEN 'qna_deadline'
      ELSE 'qna_event'
    END::text AS type,
    'New Student Question'::text AS title,
    substring(q.question FROM 1 FOR 100) AS message,
    COALESCE(q.announcement_id, q.deadline_id, q.event_id)::text AS reference_id,
    (q.created_at <= (SELECT cr_last_read_at FROM public.profiles WHERE id = auth.uid())) AS is_read,
    q.created_at AS created_at
  FROM public.timeline_questions q
  WHERE q.is_resolved = false AND public.get_my_role() IN ('cr', 'admin')

  UNION ALL

  -- 3. CR/Admin: pending resource approvals
  SELECT
    n.id::text               AS id,
    'resource_pending'::text AS type,
    'Resource Pending Review'::text AS title,
    n.title                  AS message,
    n.id::text               AS reference_id,
    (n.created_at <= (SELECT cr_last_read_at FROM public.profiles WHERE id = auth.uid())) AS is_read,
    n.created_at             AS created_at
  FROM public.notes n
  WHERE n.is_pending = true AND public.get_my_role() IN ('cr', 'admin');
