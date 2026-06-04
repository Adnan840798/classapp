-- ============================================================
-- 0003_functions.sql — ClassApp: Functions, Triggers, and Cron
-- ============================================================

-- ============================================================
-- 1. update_updated_at — trigger function
-- Automatically sets updated_at = now() on UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach trigger to profiles
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Attach trigger to notes
DROP TRIGGER IF EXISTS notes_updated_at ON public.notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 2. broadcast_notification — RPC function
-- Called from server actions. Inserts one notification row
-- per student in a single PostgreSQL transaction.
-- ============================================================
CREATE OR REPLACE FUNCTION public.broadcast_notification(
  p_title        text,
  p_message      text,
  p_type         public.notif_type,
  p_reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  SELECT
    p.id,
    p_title,
    p_message,
    p_type,
    p_reference_id
  FROM public.profiles p
  WHERE p.role = 'student';
END;
$$;

-- ============================================================
-- 3. notify_single_student — RPC for targeted notification
-- Used when a single result is published for one student.
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_single_student(
  p_student_id   uuid,
  p_title        text,
  p_message      text,
  p_type         public.notif_type,
  p_reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  VALUES (p_student_id, p_title, p_message, p_type, p_reference_id);
END;
$$;

-- ============================================================
-- 4. get_my_role — helper function (used by RLS policies)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- 5. handle_new_user — trigger to auto-create profile on signup
-- When a user registers via Supabase Auth, create a profile row.
-- IMPORTANT: SET search_path = public is required because this
-- trigger runs from the auth schema context.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, university_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'university_id', NEW.id::text),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6. auto_delete_old_chat — pg_cron job
-- Runs daily at 3am UTC. Deletes chat messages older than 30 days.
-- Requires pg_cron extension enabled in Supabase dashboard.
-- Enable via: Extensions tab in Supabase Dashboard → pg_cron
-- ============================================================
-- SELECT cron.schedule(
--   'delete-old-chat-messages',
--   '0 3 * * *',
--   $$ DELETE FROM public.chat_messages WHERE created_at < now() - INTERVAL '30 days'; $$
-- );
