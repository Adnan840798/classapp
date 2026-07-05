-- ============================================================
-- Migration: 0010_allow_pptx.sql
-- Description: Allows PPTX/PPT files as attachments, adds 'resource' to the notif_type enum,
--              and updates broadcast_notification to distribute announcements to all roles (Students, CRs, and Admins).
-- Run this SQL on BOTH the Master and EACH tenant Supabase project's SQL Editor.
-- ============================================================

-- 1. Add 'pptx' value to the attachment_type enum
ALTER TYPE public.attachment_type ADD VALUE IF NOT EXISTS 'pptx';

-- 2. Add 'resource' value to the notif_type enum so public resource notifications can be broadcasted
ALTER TYPE public.notif_type ADD VALUE IF NOT EXISTS 'resource';

-- 3. Update allowed MIME types in storage.buckets to allow PPTX and PPT uploads
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'application/pdf', 
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
  'application/vnd.ms-powerpoint'
]
WHERE id = 'notices';

-- 4. Recreate broadcast_notification to target all profiles (instead of restricting to role = 'student')
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
  -- Bulk insert one notification per profile, explicitly casting p_type to notif_type
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  SELECT id, p_title, p_message, p_type::public.notif_type, p_reference_id
  FROM   public.profiles;

  -- Trim each profile's inbox to the latest 15 notifications to prevent bloat
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
        SELECT id FROM public.profiles
      )
    ) ranked
    WHERE rn > 15
  );
END;
$$;
