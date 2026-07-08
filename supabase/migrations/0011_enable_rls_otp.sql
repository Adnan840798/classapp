-- ============================================================
-- Migration: 0011_enable_rls_otp.sql
-- Enables Row-Level Security (RLS) on public.password_reset_otps
-- to resolve Supabase security alert.
-- ============================================================

-- Enable Row-Level Security
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Block all public/client access (access is strictly via Service Role key in Server Actions & Edge Functions)
DROP POLICY IF EXISTS "No public access password_reset_otps" ON public.password_reset_otps;
CREATE POLICY "No public access password_reset_otps"
  ON public.password_reset_otps FOR ALL
  USING (false);
