-- Migration 0006: Master SaaS Registry Setup
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_email VARCHAR(255) NOT NULL UNIQUE,
    supabase_url TEXT NOT NULL UNIQUE,
    supabase_anon_key TEXT NOT NULL,
    subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_buyer_email ON public.tenants(buyer_email);

CREATE TABLE IF NOT EXISTS public.class_connections (
    join_code VARCHAR(12) PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_name VARCHAR(100) NOT NULL,
    is_registration_open BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_connections_code ON public.class_connections(join_code);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_connections ENABLE ROW LEVEL SECURITY;

-- Block public requests entirely, forcing validation to go through Server Actions
DROP POLICY IF EXISTS "No public access tenants" ON public.tenants;
CREATE POLICY "No public access tenants" ON public.tenants FOR ALL USING (false);

DROP POLICY IF EXISTS "No public access connections" ON public.class_connections;
CREATE POLICY "No public access connections" ON public.class_connections FOR ALL USING (false);
