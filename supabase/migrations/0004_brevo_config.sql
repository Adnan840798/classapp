-- ============================================================
-- Migration: 0004_brevo_config.sql
-- Creates the brevo_config table to store tenant-specific
-- Brevo SMTP credentials in their own database.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brevo_config (
  id           int PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
  api_key      text,
  sender_email text,
  sender_name  text,
  is_enabled   boolean DEFAULT false,
  updated_at   timestamptz DEFAULT now(),
  updated_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Seed default empty row
INSERT INTO public.brevo_config (id, api_key, sender_email, sender_name, is_enabled)
VALUES (1, NULL, NULL, NULL, false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.brevo_config ENABLE ROW LEVEL SECURITY;

-- Policies (only CR and Admin can view/modify)
DROP POLICY IF EXISTS "brevo_config_cr_admin_all" ON public.brevo_config;
CREATE POLICY "brevo_config_cr_admin_all"
  ON public.brevo_config FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'));
