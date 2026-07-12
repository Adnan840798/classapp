-- Migration 0012: Profiles Table Privacy Hardening and Role Update Exception Trigger
-- Scope: Tenant Database Migration

-- 1. Redefine trigger function to RAISE EXCEPTION on unauthorized privilege changes
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role <> OLD.role THEN
    -- Only service_role (backend) or existing CRs/Admins can change roles
    IF (auth.jwt()->>'role' = 'service_role') OR (public.get_my_role() IN ('cr', 'admin')) THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Role modification is not allowed. Transaction aborted.'
        USING ERRCODE = '42501'; -- Insufficient Privilege
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Restrict profiles base table SELECT access (lock down phone/whatsapp columns)
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own_or_staff" ON public.profiles;

CREATE POLICY "profiles_read_own_or_staff"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('cr', 'admin')
    OR auth.uid() = id
  );


-- 3. Create the public profiles view for classmate listings (bypasses RLS via owner privileges)
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id, 
  full_name, 
  profile_pic_url, 
  role, 
  batch, 
  department, 
  created_at 
FROM public.profiles;

-- 4. Grant access to profiles_public view for cohort members
GRANT SELECT ON public.profiles_public TO authenticated;

-- 5. CRITICAL: Re-declare get_my_role() as SECURITY DEFINER
-- The new profiles_read_own_or_staff policy above calls get_my_role() inside its
-- USING clause. Without SECURITY DEFINER, get_my_role() queries profiles under
-- the caller's RLS context, which triggers the same policy again → infinite recursion.
-- SECURITY DEFINER makes it bypass RLS entirely when reading the role column.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public 
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;
