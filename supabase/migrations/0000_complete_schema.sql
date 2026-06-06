-- ============================================================
-- 0000_complete_schema.sql — ClassApp: Complete Database Setup
-- ============================================================
-- Run this single file in Supabase SQL Editor against a FRESH
-- (reset) database to create all tables, functions, RLS policies,
-- storage buckets, and realtime config in one shot.
--
-- Order of sections:
--   1. Enums & Tables
--   2. Functions & Triggers (Must precede RLS policies using them)
--   3. Row Level Security
--   4. Storage Buckets & Policies
--   5. Realtime
-- ============================================================


-- ============================================================
-- SECTION 1: Enums & Tables
-- ============================================================

-- ENUMS (must be created before tables that reference them)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'cr', 'student');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('exam', 'class', 'holiday', 'submission', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE attachment_type AS ENUM ('image', 'pdf');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notif_type AS ENUM ('announcement', 'deadline', 'result', 'chat', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ── profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         text NOT NULL,
  university_id     text UNIQUE NOT NULL,
  email             text UNIQUE NOT NULL,
  role              user_role NOT NULL DEFAULT 'student',
  phone             text,
  facebook_id       text,
  whatsapp          text,
  telegram_handle   text,
  blood_group       text,
  address           text,
  profile_pic_url   text,
  batch             text,
  department        text,
  notif_enabled     boolean DEFAULT true,
  notif_sound_on    boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- ── announcements ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  body             text NOT NULL,
  is_important     boolean DEFAULT false,
  is_public        boolean DEFAULT false,
  attachment_url   text,
  attachment_type  attachment_type,
  telegram_posted  boolean DEFAULT false,
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now()
);

-- ── deadlines ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deadlines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  subject      text NOT NULL,
  due_date     timestamptz NOT NULL,
  description  text,
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

-- ── exam_results ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_results (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name         text NOT NULL,
  result_sheet_url  text,
  published_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  published_at      timestamptz DEFAULT now()
);

-- ── calendar_events ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  event_date   date NOT NULL,
  event_type   event_type DEFAULT 'other',
  is_public    boolean DEFAULT true,
  qa_enabled   boolean DEFAULT true,
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

-- ── timeline_questions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid REFERENCES calendar_events(id) ON DELETE CASCADE,
  announcement_id uuid REFERENCES announcements(id) ON DELETE CASCADE,
  deadline_id     uuid REFERENCES deadlines(id) ON DELETE CASCADE,
  asked_by        uuid REFERENCES profiles(id) ON DELETE CASCADE,
  question        text NOT NULL CHECK (char_length(question) <= 500),
  is_resolved     boolean DEFAULT false,
  resolved_by     uuid REFERENCES profiles(id),
  resolved_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- ── timeline_answers ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_answers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid REFERENCES timeline_questions(id) ON DELETE CASCADE,
  answered_by  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  answer       text NOT NULL CHECK (char_length(answer) <= 1000),
  created_at   timestamptz DEFAULT now()
);

-- ── chat_messages ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  is_pinned  boolean DEFAULT false,
  pinned_by  uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ── notes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title      text NOT NULL,
  content    text,
  drive_link text,
  is_public  boolean DEFAULT false NOT NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ── notifications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  message      text NOT NULL,
  type         notif_type NOT NULL,
  is_read      boolean DEFAULT false,
  reference_id uuid,
  created_at   timestamptz DEFAULT now()
);

-- ── push_devices ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_devices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint     text UNIQUE NOT NULL,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- ── user_push_devices ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_push_devices (
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id    uuid NOT NULL REFERENCES public.push_devices(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_push_devices_device_id ON public.user_push_devices(device_id);

-- ── class_routine ─────────────────────────────────────────
-- Stores the single current class routine image.
CREATE TABLE IF NOT EXISTS public.class_routine (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   text NOT NULL,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now()
);


-- ============================================================
-- SECTION 2: Functions & Triggers
-- ============================================================

-- 1. update_updated_at — auto-timestamps on UPDATE
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS notes_updated_at ON public.notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. broadcast_notification — inserts one notification per student
CREATE OR REPLACE FUNCTION public.broadcast_notification(
  p_title        text,
  p_message      text,
  p_type         public.notif_type,
  p_reference_id uuid DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  student_record RECORD;
BEGIN
  FOR student_record IN 
    SELECT id FROM public.profiles WHERE role = 'student'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (student_record.id, p_title, p_message, p_type, p_reference_id);

    -- Delete notifications beyond the latest 15 for this student
    DELETE FROM public.notifications
    WHERE user_id = student_record.id
      AND id NOT IN (
        SELECT id
        FROM public.notifications
        WHERE user_id = student_record.id
        ORDER BY created_at DESC
        LIMIT 15
      );
  END LOOP;
END;
$$;

-- 3. notify_single_student — targeted notification for one student
CREATE OR REPLACE FUNCTION public.notify_single_student(
  p_student_id   uuid,
  p_title        text,
  p_message      text,
  p_type         public.notif_type,
  p_reference_id uuid DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  VALUES (p_student_id, p_title, p_message, p_type, p_reference_id);

  -- Delete notifications beyond the latest 15 for this student
  DELETE FROM public.notifications
  WHERE user_id = p_student_id
    AND id NOT IN (
      SELECT id
      FROM public.notifications
      WHERE user_id = p_student_id
      ORDER BY created_at DESC
      LIMIT 15
    );
END;
$$;

-- 4. get_my_role — helper used by RLS policies
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 5. handle_new_user — auto-creates a profile row on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, university_id, role, batch, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'university_id', NEW.id::text),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'),
    NEW.raw_user_meta_data->>'batch',
    NEW.raw_user_meta_data->>'department'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. cleanup_orphaned_push_devices — auto-deletes push_devices when no users are linked
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_push_devices()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_push_devices
    WHERE device_id = OLD.device_id
  ) THEN
    DELETE FROM public.push_devices WHERE id = OLD.device_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_orphaned_push_devices ON public.user_push_devices;
CREATE TRIGGER trigger_cleanup_orphaned_push_devices
  AFTER DELETE ON public.user_push_devices
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_orphaned_push_devices();

-- 7. auto_delete_old_chat — optional pg_cron job (requires pg_cron extension)
-- Uncomment after enabling pg_cron in Supabase Dashboard → Extensions:
-- SELECT cron.schedule(
--   'delete-old-chat-messages',
--   '0 3 * * *',
--   $$ DELETE FROM public.chat_messages WHERE created_at < now() - INTERVAL '30 days'; $$
-- );


-- ============================================================
-- SECTION 3: Row Level Security
-- ============================================================

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results        ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_answers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_routine ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_push_devices ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies if they already exist (idempotency safety)
DO $$
BEGIN
  -- profiles
  DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
  
  -- announcements
  DROP POLICY IF EXISTS "ann_read_authenticated" ON public.announcements;
  DROP POLICY IF EXISTS "ann_read_public" ON public.announcements;
  DROP POLICY IF EXISTS "ann_cr_admin_insert" ON public.announcements;
  DROP POLICY IF EXISTS "ann_cr_admin_delete" ON public.announcements;
  
  -- deadlines
  DROP POLICY IF EXISTS "dl_read_authenticated" ON public.deadlines;
  DROP POLICY IF EXISTS "dl_cr_admin_insert" ON public.deadlines;
  DROP POLICY IF EXISTS "dl_cr_admin_delete" ON public.deadlines;
  
  -- exam_results
  DROP POLICY IF EXISTS "res_read_authenticated" ON public.exam_results;
  DROP POLICY IF EXISTS "res_cr_admin_insert" ON public.exam_results;
  DROP POLICY IF EXISTS "res_cr_admin_delete" ON public.exam_results;
  
  -- calendar_events
  DROP POLICY IF EXISTS "cal_read_authenticated" ON public.calendar_events;
  DROP POLICY IF EXISTS "cal_read_public" ON public.calendar_events;
  DROP POLICY IF EXISTS "cal_cr_admin_insert" ON public.calendar_events;
  DROP POLICY IF EXISTS "cal_cr_admin_update" ON public.calendar_events;
  DROP POLICY IF EXISTS "cal_cr_admin_delete" ON public.calendar_events;
  
  -- timeline_questions
  DROP POLICY IF EXISTS "tq_read_authenticated" ON public.timeline_questions;
  DROP POLICY IF EXISTS "tq_student_insert" ON public.timeline_questions;
  DROP POLICY IF EXISTS "tq_cr_admin_update" ON public.timeline_questions;
  DROP POLICY IF EXISTS "tq_cr_admin_delete" ON public.timeline_questions;
  
  -- timeline_answers
  DROP POLICY IF EXISTS "ta_read_authenticated" ON public.timeline_answers;
  DROP POLICY IF EXISTS "ta_cr_admin_insert" ON public.timeline_answers;
  DROP POLICY IF EXISTS "ta_cr_admin_delete" ON public.timeline_answers;
  
  -- chat_messages
  DROP POLICY IF EXISTS "chat_read_authenticated" ON public.chat_messages;
  DROP POLICY IF EXISTS "chat_insert_authenticated" ON public.chat_messages;
  DROP POLICY IF EXISTS "chat_delete_own" ON public.chat_messages;
  DROP POLICY IF EXISTS "chat_cr_admin_update" ON public.chat_messages;
  
  -- notes
  DROP POLICY IF EXISTS "notes_own_select" ON public.notes;
  DROP POLICY IF EXISTS "notes_own_insert" ON public.notes;
  DROP POLICY IF EXISTS "notes_own_update" ON public.notes;
  DROP POLICY IF EXISTS "notes_own_delete" ON public.notes;
  
  -- notifications
  DROP POLICY IF EXISTS "notif_own_select" ON public.notifications;
  DROP POLICY IF EXISTS "notif_own_update" ON public.notifications;
  DROP POLICY IF EXISTS "notif_own_delete" ON public.notifications;
  
  -- class_routine
  DROP POLICY IF EXISTS "class_routine_select" ON public.class_routine;
  DROP POLICY IF EXISTS "class_routine_cr_admin_all" ON public.class_routine;

  -- push_devices & user_push_devices
  DROP POLICY IF EXISTS "pd_select_linked" ON public.push_devices;
  DROP POLICY IF EXISTS "upd_select_own" ON public.user_push_devices;
  DROP POLICY IF EXISTS "upd_insert_own" ON public.user_push_devices;
  DROP POLICY IF EXISTS "upd_delete_own" ON public.user_push_devices;

  -- storage policies (on storage.objects)
  DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
  DROP POLICY IF EXISTS "avatars_authenticated_upload" ON storage.objects;
  DROP POLICY IF EXISTS "avatars_authenticated_update" ON storage.objects;
  DROP POLICY IF EXISTS "avatars_authenticated_delete" ON storage.objects;
  DROP POLICY IF EXISTS "notices_public_read" ON storage.objects;
  DROP POLICY IF EXISTS "notices_cr_admin_upload" ON storage.objects;
  DROP POLICY IF EXISTS "notices_cr_admin_delete" ON storage.objects;
END $$;

-- ── profiles ──────────────────────────────────────────────
CREATE POLICY "profiles_read_all"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_admin_all"
  ON profiles FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── announcements ─────────────────────────────────────────
CREATE POLICY "ann_read_authenticated"
  ON announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ann_read_public"
  ON announcements FOR SELECT
  TO anon
  USING (is_public = true);

CREATE POLICY "ann_cr_admin_insert"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('cr', 'admin'));

CREATE POLICY "ann_cr_admin_delete"
  ON announcements FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'));

-- ── deadlines ─────────────────────────────────────────────
CREATE POLICY "dl_read_authenticated"
  ON deadlines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "dl_cr_admin_insert"
  ON deadlines FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('cr', 'admin'));

CREATE POLICY "dl_cr_admin_delete"
  ON deadlines FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'));

-- ── exam_results ──────────────────────────────────────────
CREATE POLICY "res_read_authenticated"
  ON exam_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "res_cr_admin_insert"
  ON exam_results FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('cr', 'admin'));

CREATE POLICY "res_cr_admin_delete"
  ON exam_results FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'));

-- ── calendar_events ───────────────────────────────────────
CREATE POLICY "cal_read_authenticated"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "cal_read_public"
  ON calendar_events FOR SELECT
  TO anon
  USING (is_public = true);

CREATE POLICY "cal_cr_admin_insert"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('cr', 'admin'));

CREATE POLICY "cal_cr_admin_update"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'));

CREATE POLICY "cal_cr_admin_delete"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'));

-- ── timeline_questions ────────────────────────────────────
CREATE POLICY "tq_read_authenticated"
  ON timeline_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tq_student_insert"
  ON public.timeline_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'student'
    AND (
      (
        event_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.calendar_events ce
          WHERE ce.id = event_id AND ce.qa_enabled = true
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.timeline_questions tq
          WHERE tq.event_id = timeline_questions.event_id
            AND tq.asked_by = auth.uid()
            AND tq.is_resolved = false
        )
      )
      OR (
        announcement_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.announcements a WHERE a.id = announcement_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.timeline_questions tq
          WHERE tq.announcement_id = timeline_questions.announcement_id
            AND tq.asked_by = auth.uid()
            AND tq.is_resolved = false
        )
      )
      OR (
        deadline_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.deadlines d WHERE d.id = deadline_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.timeline_questions tq
          WHERE tq.deadline_id = timeline_questions.deadline_id
            AND tq.asked_by = auth.uid()
            AND tq.is_resolved = false
        )
      )
    )
  );

CREATE POLICY "tq_cr_admin_update"
  ON timeline_questions FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'));

CREATE POLICY "tq_cr_admin_delete"
  ON timeline_questions FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'));

-- ── timeline_answers ──────────────────────────────────────
CREATE POLICY "ta_read_authenticated"
  ON timeline_answers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ta_cr_admin_insert"
  ON timeline_answers FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('cr', 'admin'));

CREATE POLICY "ta_cr_admin_delete"
  ON timeline_answers FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'));

-- ── chat_messages ─────────────────────────────────────────
CREATE POLICY "chat_read_authenticated"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "chat_insert_authenticated"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_delete_own"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_my_role() IN ('cr', 'admin'));

CREATE POLICY "chat_cr_admin_update"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'));

-- ── notes ─────────────────────────────────────────────────
CREATE POLICY "notes_own_select"
  ON notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "notes_own_insert"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_own_update"
  ON notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notes_own_delete"
  ON notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── notifications ─────────────────────────────────────────
CREATE POLICY "notif_own_select"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notif_own_update"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notif_own_delete"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── push_devices ──────────────────────────────────────────
CREATE POLICY "pd_select_linked"
  ON public.push_devices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_push_devices upd
      WHERE upd.device_id = id AND upd.user_id = auth.uid()
    )
  );

-- ── user_push_devices ─────────────────────────────────────
CREATE POLICY "upd_select_own"
  ON public.user_push_devices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "upd_insert_own"
  ON public.user_push_devices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "upd_delete_own"
  ON public.user_push_devices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── class_routine ─────────────────────────────────────────
CREATE POLICY "class_routine_select"
  ON public.class_routine FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "class_routine_cr_admin_all"
  ON public.class_routine FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'))
  WITH CHECK (public.get_my_role() IN ('cr', 'admin'));


-- ============================================================
-- SECTION 4: Storage Buckets & Policies
-- ============================================================

-- ── avatars bucket ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public              = EXCLUDED.public,
  file_size_limit     = EXCLUDED.file_size_limit,
  allowed_mime_types  = EXCLUDED.allowed_mime_types;

-- ── notices bucket ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notices', 'notices', true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public              = EXCLUDED.public,
  file_size_limit     = EXCLUDED.file_size_limit,
  allowed_mime_types  = EXCLUDED.allowed_mime_types;

-- ── avatars RLS ───────────────────────────────────────────
CREATE POLICY "avatars_public_read"   ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_authenticated_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_authenticated_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_authenticated_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── notices RLS ───────────────────────────────────────────
CREATE POLICY "notices_public_read"       ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'notices');
CREATE POLICY "notices_cr_admin_upload"   ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notices' AND public.get_my_role() IN ('cr', 'admin'));
CREATE POLICY "notices_cr_admin_delete"   ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notices' AND public.get_my_role() IN ('cr', 'admin'));


-- ============================================================
-- SECTION 5: Realtime
-- ============================================================

-- Enable realtime broadcasts for chat and notifications.
-- NOTE: If you get "already member" errors, these tables are already
-- in the publication — that is fine, just ignore the error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;


-- ============================================================
-- Done!
-- After running this file, run: node supabase/seed_users.js
-- to create the three test accounts (CR, Student, Admin).
-- ============================================================
