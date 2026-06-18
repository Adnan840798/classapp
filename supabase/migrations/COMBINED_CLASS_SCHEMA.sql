-- ============================================================
-- COMBINED_CLASS_SCHEMA.sql — ClassApp Complete New Class Setup
-- ============================================================
-- Run this SINGLE FILE in your new class Supabase project's
-- SQL Editor to set up the entire database schema in one shot.
--
-- This merges migrations 0000 through 0005 and 0007.
-- (Migration 0006 is for the MASTER database only — skip it)
--
-- Steps after running this file:
--   1. Create the CR auth account in Authentication -> Users
--   2. Run the CR profile INSERT below (Section 6)
-- ============================================================

-- ============================================================
-- FROM: 0000_complete_schema.sql
-- ============================================================

-- ============================================================
-- 0000_complete_schema.sql â€” ClassApp: Complete Database Setup
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
  CREATE TYPE notif_type AS ENUM ('announcement', 'deadline', 'result', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- â”€â”€ profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name               text NOT NULL,
  university_id           text UNIQUE NOT NULL,
  email                   text UNIQUE NOT NULL,
  role                    user_role NOT NULL DEFAULT 'student',
  phone                   text,
  whatsapp                text,
  telegram_handle         text,
  profile_pic_url         text,
  batch                   text,
  department              text,
  notif_enabled           boolean DEFAULT true,
  -- TRUE until the student completes their first-login password reset
  password_reset_required boolean NOT NULL DEFAULT true,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- â”€â”€ announcements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ deadlines â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS deadlines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  subject      text NOT NULL,
  due_date     timestamptz NOT NULL,
  description  text,
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

-- â”€â”€ exam_results â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS exam_results (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name         text NOT NULL,
  result_sheet_url  text,
  published_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  published_at      timestamptz DEFAULT now()
);

-- â”€â”€ calendar_events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ timeline_questions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ timeline_answers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS timeline_answers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid REFERENCES timeline_questions(id) ON DELETE CASCADE,
  answered_by  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  answer       text NOT NULL CHECK (char_length(answer) <= 1000),
  created_at   timestamptz DEFAULT now()
);

-- â”€â”€ notes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ push_devices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.push_devices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint     text UNIQUE NOT NULL,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- â”€â”€ user_push_devices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.user_push_devices (
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id    uuid NOT NULL REFERENCES public.push_devices(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_push_devices_device_id ON public.user_push_devices(device_id);

-- â”€â”€ class_routine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- 1. update_updated_at â€” auto-timestamps on UPDATE
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

-- 2. broadcast_notification â€” inserts one notification per student
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

-- 3. notify_single_student â€” targeted notification for one student
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

-- 4. get_my_role â€” helper used by RLS policies
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 5. handle_new_user â€” auto-creates a profile row on Supabase Auth signup
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
    TRUE  -- always force password reset on first login
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. cleanup_orphaned_push_devices â€” auto-deletes push_devices when no users are linked
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

-- â”€â”€ profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "profiles_read_all"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_admin_all"
  ON profiles FOR ALL
  USING (public.get_my_role() = 'admin');

-- â”€â”€ announcements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ deadlines â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ exam_results â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ calendar_events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ timeline_questions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ timeline_answers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- â”€â”€ notes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ push_devices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "pd_select_linked"
  ON public.push_devices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_push_devices upd
      WHERE upd.device_id = id AND upd.user_id = auth.uid()
    )
  );

-- â”€â”€ user_push_devices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ class_routine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ avatars bucket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ notices bucket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ avatars RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "avatars_public_read"   ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_authenticated_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_authenticated_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_authenticated_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- â”€â”€ notices RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
-- in the publication â€” that is fine, just ignore the error.

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


-- ============================================================
-- FROM: 0001_normalize_web_push.sql
-- ============================================================

-- 1. Create push_devices table
CREATE TABLE IF NOT EXISTS public.push_devices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint     text UNIQUE NOT NULL,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- 2. Create user_push_devices table (many-to-many link)
CREATE TABLE IF NOT EXISTS public.user_push_devices (
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id    uuid NOT NULL REFERENCES public.push_devices(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);

-- 3. Create index for relation performance
CREATE INDEX IF NOT EXISTS idx_user_push_devices_device_id ON public.user_push_devices(device_id);

-- 4. Enable Row-Level Security (RLS)
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_push_devices ENABLE ROW LEVEL SECURITY;

-- 5. Migrate existing subscriptions if old table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'web_push_subscriptions') THEN
    -- Migrate devices
    INSERT INTO public.push_devices (id, endpoint, p256dh, auth, created_at)
    SELECT id, endpoint, p256dh, auth, created_at
    FROM public.web_push_subscriptions
    ON CONFLICT (endpoint) DO NOTHING;

    -- Migrate relationships
    INSERT INTO public.user_push_devices (user_id, device_id, created_at)
    SELECT user_id, id, created_at
    FROM public.web_push_subscriptions
    ON CONFLICT (user_id, device_id) DO NOTHING;
  END IF;
END $$;

-- 6. Drop the old table
DROP TABLE IF EXISTS public.web_push_subscriptions CASCADE;

-- 7. Define RLS Policies for push_devices
-- Users can only select devices they are linked to
DROP POLICY IF EXISTS "pd_select_linked" ON public.push_devices;
CREATE POLICY "pd_select_linked" ON public.push_devices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_push_devices upd
      WHERE upd.device_id = id AND upd.user_id = auth.uid()
    )
  );

-- 8. Define RLS Policies for user_push_devices
DROP POLICY IF EXISTS "upd_select_own" ON public.user_push_devices;
CREATE POLICY "upd_select_own" ON public.user_push_devices
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "upd_insert_own" ON public.user_push_devices;
CREATE POLICY "upd_insert_own" ON public.user_push_devices
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "upd_delete_own" ON public.user_push_devices;
CREATE POLICY "upd_delete_own" ON public.user_push_devices
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 9. Setup automatic database trigger for orphaned devices cleanup
-- When a relation is deleted, if no other user references the device_id, delete the device
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_push_devices()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_push_devices
    WHERE device_id = OLD.device_id
  ) THEN
    DELETE FROM public.push_devices WHERE id = OLD.device_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cleanup_orphaned_push_devices ON public.user_push_devices;
CREATE TRIGGER trigger_cleanup_orphaned_push_devices
AFTER DELETE ON public.user_push_devices
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_orphaned_push_devices();


-- ============================================================
-- FROM: 0002_holiday_days.sql
-- ============================================================

-- ============================================================
-- 0002_holiday_days.sql â€” Holiday Days Feature
-- ============================================================
-- Adds the holiday_days table for the CR Holiday Mode feature.
-- ============================================================

-- â”€â”€ holiday_days â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Stores which academic day slots (week_number, day_index) are
-- marked as holidays by the CR. Max 70 rows (14 weeks Ã— 5 days).
CREATE TABLE IF NOT EXISTS public.holiday_days (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number  int NOT NULL CHECK (week_number BETWEEN 1 AND 14),
  day_index    int NOT NULL CHECK (day_index BETWEEN 0 AND 4), -- 0=SAT, 1=SUN, 2=MON, 3=TUE, 4=WED
  note         text,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (week_number, day_index)
);

-- Enable RLS
ALTER TABLE public.holiday_days ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies (idempotency)
DROP POLICY IF EXISTS "hd_read_authenticated" ON public.holiday_days;
DROP POLICY IF EXISTS "hd_cr_admin_insert" ON public.holiday_days;
DROP POLICY IF EXISTS "hd_cr_admin_delete" ON public.holiday_days;

-- All authenticated users can read holiday days
CREATE POLICY "hd_read_authenticated"
  ON public.holiday_days FOR SELECT
  TO authenticated
  USING (true);

-- Only CR and admin can mark/unmark holidays
CREATE POLICY "hd_cr_admin_insert"
  ON public.holiday_days FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('cr', 'admin'));

CREATE POLICY "hd_cr_admin_delete"
  ON public.holiday_days FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'));

-- Done!


-- ============================================================
-- FROM: 0003_semester_config.sql
-- ============================================================

-- ============================================================
-- 0003_semester_config.sql â€” Semester Configuration
-- ============================================================
-- Stores global semester settings, starting with total_weeks.
-- Also relaxes the week_number constraint on holiday_days so
-- that CRs can add weeks beyond the default 14.
-- ============================================================

-- â”€â”€ semester_config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.semester_config (
  id           int PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
  total_weeks  int NOT NULL DEFAULT 14 CHECK (total_weeks BETWEEN 1 AND 52),
  start_date   date NOT NULL DEFAULT '2026-05-20',
  updated_at   timestamptz DEFAULT now(),
  updated_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Seed default row if not exists
INSERT INTO public.semester_config (id, total_weeks)
VALUES (1, 14)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.semester_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_read_authenticated" ON public.semester_config;
DROP POLICY IF EXISTS "sc_cr_admin_update" ON public.semester_config;

-- All authenticated users can read config
CREATE POLICY "sc_read_authenticated"
  ON public.semester_config FOR SELECT
  TO authenticated
  USING (true);

-- Only CR and admin can update config
CREATE POLICY "sc_cr_admin_update"
  ON public.semester_config FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('cr', 'admin'))
  WITH CHECK (public.get_my_role() IN ('cr', 'admin'));

-- â”€â”€ Relax holiday_days week_number constraint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Remove the hard limit of 14 so weeks beyond 14 can be marked as holiday.
ALTER TABLE public.holiday_days
  DROP CONSTRAINT IF EXISTS holiday_days_week_number_check;

ALTER TABLE public.holiday_days
  ADD CONSTRAINT holiday_days_week_number_check
  CHECK (week_number BETWEEN 1 AND 52);

-- Done!


-- ============================================================
-- FROM: 0004_cr_notifications.sql
-- ============================================================

-- ============================================================
-- 0004_cr_notifications.sql â€” ClassApp: CR Notifications & Approval Setup
-- ============================================================

-- 1. Extend the public.notif_type enum
ALTER TYPE public.notif_type ADD VALUE IF NOT EXISTS 'qna';
ALTER TYPE public.notif_type ADD VALUE IF NOT EXISTS 'resource_pending';

-- 2. Add last read tracker for CR notifications to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cr_last_read_at timestamptz DEFAULT now();

-- 3. Add pending status for notes/resources
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_pending boolean DEFAULT false NOT NULL;

-- Drop old unconsolidated view if exists
DROP VIEW IF EXISTS public.cr_notifications;

-- 4. Create the secured, consolidated my_notifications view
-- WITH (security_invoker = on) ensures that querying this view enforces RLS of the underlying tables.
-- This view fetches both regular notifications and CR/Admin action notifications in a single table scan per entity.
CREATE OR REPLACE VIEW public.my_notifications 
WITH (security_invoker = on) AS
  -- 1. Regular user-targeted notifications
  SELECT 
    n.id::text AS id,
    n.type::text AS type,
    n.title::text AS title,
    n.message::text AS message,
    n.reference_id::text AS reference_id,
    n.is_read AS is_read,
    n.created_at AS created_at
  FROM public.notifications n
  WHERE n.user_id = auth.uid()

  UNION ALL

  -- 2. CR Questions (only scanned/loaded for CRs/Admins, dynamic in-DB read mapping)
  SELECT 
    q.id::text AS id,
    CASE 
      WHEN q.announcement_id IS NOT NULL THEN 'qna_announcement'
      WHEN q.deadline_id IS NOT NULL THEN 'qna_deadline'
      ELSE 'qna_event'
    END::text AS type,
    'New Student Question'::text AS title,
    substring(q.question from 1 for 100) AS message,
    COALESCE(q.announcement_id, q.deadline_id, q.event_id)::text AS reference_id,
    (q.created_at <= (SELECT cr_last_read_at FROM public.profiles WHERE id = auth.uid())) AS is_read,
    q.created_at AS created_at
  FROM public.timeline_questions q
  WHERE q.is_resolved = false AND public.get_my_role() IN ('cr', 'admin')

  UNION ALL

  -- 3. CR Pending resources (only scanned/loaded for CRs/Admins, dynamic in-DB read mapping)
  SELECT 
    n.id::text AS id,
    'resource_pending'::text AS type,
    'Resource Pending Review'::text AS title,
    n.title AS message,
    n.id::text AS reference_id,
    (n.created_at <= (SELECT cr_last_read_at FROM public.profiles WHERE id = auth.uid())) AS is_read,
    n.created_at AS created_at
  FROM public.notes n
  WHERE n.is_pending = true AND public.get_my_role() IN ('cr', 'admin');

-- 5. Update RLS policies for notes
-- Drop old policies first
DROP POLICY IF EXISTS "notes_own_select" ON public.notes;
DROP POLICY IF EXISTS "notes_own_update" ON public.notes;
DROP POLICY IF EXISTS "notes_own_delete" ON public.notes;

-- Select policy: Allow students to see own notes and public ones; CR/Admin can see all notes (including pending)
CREATE POLICY "notes_own_select"
  ON public.notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true OR public.get_my_role() IN ('cr', 'admin'));

-- Update policy: Allow students to update own notes; CR/Admin can update any note (for approving resources)
CREATE POLICY "notes_own_update"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_my_role() IN ('cr', 'admin'));

-- Delete policy: Allow students to delete own notes; CR/Admin can delete any note (for rejecting resources)
CREATE POLICY "notes_own_delete"
  ON public.notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_my_role() IN ('cr', 'admin'));


-- ============================================================
-- FROM: 0005_fcm_token.sql
-- ============================================================

-- ============================================================
-- 0005_fcm_token.sql â€” Add FCM push token to profiles
-- ============================================================
-- Run this in Supabase SQL Editor AFTER 0000_complete_schema.sql
-- Adds a column to store the FCM device registration token per user.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fcm_token text DEFAULT NULL;

-- Allow users to update their own FCM token
-- (existing RLS policies on profiles already permit this for 'update own row')


-- ============================================================
-- FROM: 0007_tenant_reset_and_privilege_escalation.sql
-- ============================================================

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


-- ============================================================
-- SECTION 6: Initial CR Account Setup
-- ============================================================
-- After running the above, create the CR's auth account in
-- Supabase Authentication -> Users, get the UUID, then run:
-- ============================================================

-- Replace the values below with your actual CR details:
-- INSERT INTO public.profiles (id, full_name, email, university_id, role, batch, department, password_reset_required)
-- VALUES (
--   'PASTE-CR-AUTH-UUID-HERE',      -- UUID from Authentication -> Users
--   'CR Full Name',                  -- e.g. 'Adnan Islam'
--   'cr@university.edu',             -- CR's university email
--   'CR-UNIVERSITY-ID',              -- e.g. 'CSE-2021-001'
--   'cr',                            -- role must be 'cr'
--   '2024',                          -- batch year
--   'Computer Science',              -- department
--   false                            -- false = no forced password reset for CR
-- );

-- ============================================================
-- Done! The database is ready.
-- ============================================================
