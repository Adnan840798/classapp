-- ============================================================
-- Migration: 0008_fix_broadcast_overload.sql
-- Drops the overloaded broadcast_notification functions to resolve PgRst overloading conflicts,
-- and recreates a single correct version that properly casts p_type to public.notif_type.
-- Run this SQL on BOTH the Master and EACH tenant Supabase project's SQL Editor.
-- ============================================================

-- 1. Drop both possible candidates to clear the overloading conflict
DROP FUNCTION IF EXISTS public.broadcast_notification(text, text, public.notif_type, uuid);
DROP FUNCTION IF EXISTS public.broadcast_notification(text, text, text, uuid);

-- 2. Recreate the single correct version with text parameter & explicit cast
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
