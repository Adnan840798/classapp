-- ============================================================
-- master_schema.sql — ClassApp: MASTER SaaS Registry Setup
-- ============================================================
-- Run this SINGLE FILE in YOUR OWN (master) Supabase project's
-- SQL Editor. This is NOT for buyer class projects.
--
-- This database is the central SaaS registry that:
--   • Tracks all buyer tenants (their Supabase project credentials)
--   • Stores class join codes that map to each tenant
--   • Is queried by the onboarding flow when a new buyer enters
--     their class code to connect to their class project.
--
-- Sections:
--   1. Tables & Indexes
--   2. Row Level Security
-- ============================================================


-- ============================================================
-- SECTION 1: Tables & Indexes
-- ============================================================

-- ── tenants ───────────────────────────────────────────────
-- One row per buyer/class deployment. Stores the Supabase
-- project credentials needed to connect the app to that class.
CREATE TABLE IF NOT EXISTS public.tenants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_email         VARCHAR(255) NOT NULL UNIQUE,
    supabase_url        TEXT NOT NULL UNIQUE,
    supabase_anon_key   TEXT NOT NULL,
    subscription_status VARCHAR(50) DEFAULT 'active'
                          CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_buyer_email ON public.tenants(buyer_email);

-- ── class_connections ─────────────────────────────────────
-- Maps a short join code (e.g. "CSE-2022") to a tenant.
-- Students enter this code on first launch to connect to
-- their class's Supabase project.
CREATE TABLE IF NOT EXISTS public.class_connections (
    join_code               VARCHAR(12) PRIMARY KEY,
    tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_name              VARCHAR(100) NOT NULL,
    is_registration_open    BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_connections_code ON public.class_connections(join_code);


-- ============================================================
-- SECTION 2: Row Level Security
-- ============================================================

ALTER TABLE public.tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_connections ENABLE ROW LEVEL SECURITY;

-- Block ALL public/client requests — access is only via
-- your server-side Service Role key in Server Actions.
DROP POLICY IF EXISTS "No public access tenants" ON public.tenants;
CREATE POLICY "No public access tenants"
  ON public.tenants FOR ALL
  USING (false);

DROP POLICY IF EXISTS "No public access connections" ON public.class_connections;
CREATE POLICY "No public access connections"
  ON public.class_connections FOR ALL
  USING (false);


-- ============================================================
-- Done!
--
-- After running this file:
--   1. For each new buyer, INSERT a row into `tenants` with
--      their class Supabase URL and anon key.
--   2. INSERT a row into `class_connections` with a unique
--      join_code linked to that tenant.
--   3. Give the buyer their join code — they enter it on first
--      app launch to connect to their class.
--
-- Example:
--   INSERT INTO public.tenants (buyer_email, supabase_url, supabase_anon_key)
--   VALUES ('buyer@example.com', 'https://xyz.supabase.co', 'eyJ...');
--
--   INSERT INTO public.class_connections (join_code, tenant_id, class_name)
--   VALUES ('CSE-2022', '<tenant_id_from_above>', 'CSE Batch 2022');
-- ============================================================
