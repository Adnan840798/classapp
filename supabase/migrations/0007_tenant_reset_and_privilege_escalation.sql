-- Migration 0007: Tenant Reset Requirements and Privilege Escalation Protection

-- 1. Add password_reset_required column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT true;

-- 2. Modify handle_new_user() to use safe defaults for required student fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, university_id, role, batch, department, password_reset_required
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'university_id', 'NOT_SET'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'),
    COALESCE(NEW.raw_user_meta_data->>'batch', 'N/A'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'N/A'),
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Create check_profile_role_update trigger to block privilege escalation
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role <> OLD.role THEN
    -- Only allow service_role (backend client) or current CRs/Admins to update roles
    IF (auth.jwt()->>'role' = 'service_role') OR (public.get_my_role() IN ('cr', 'admin')) THEN
      RETURN NEW;
    ELSE
      -- Reset the role to prevent unauthorized self-escalation
      NEW.role = OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_profile_role_update ON public.profiles;
CREATE TRIGGER tr_check_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_role_update();
