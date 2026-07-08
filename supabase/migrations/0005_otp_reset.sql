-- ============================================================
-- Migration: 0005_otp_reset.sql
-- OTP-based password reset table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  otp_code    TEXT NOT NULL,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  used_at     TIMESTAMPTZ,
  attempts    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup by email (used on every OTP check)
CREATE INDEX IF NOT EXISTS idx_otp_email_created
  ON public.password_reset_otps (email, created_at DESC);

-- Enable Row-Level Security
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Block all public/client access (access is strictly via Service Role key in Server Actions & Edge Functions)
DROP POLICY IF EXISTS "No public access password_reset_otps" ON public.password_reset_otps;
CREATE POLICY "No public access password_reset_otps"
  ON public.password_reset_otps FOR ALL
  USING (false);
