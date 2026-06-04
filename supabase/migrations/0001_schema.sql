-- ============================================================
-- 0001_schema.sql — ClassApp: All Enums and Tables
-- ============================================================

-- ENUMS (must be created before tables that reference them)
CREATE TYPE user_role AS ENUM ('admin', 'cr', 'student');
CREATE TYPE event_type AS ENUM ('exam', 'class', 'holiday', 'submission', 'other');
CREATE TYPE attachment_type AS ENUM ('image', 'pdf');
CREATE TYPE notif_type AS ENUM ('announcement', 'deadline', 'result', 'chat', 'system');

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE profiles (
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

-- ============================================================
-- announcements
-- ============================================================
CREATE TABLE announcements (
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

-- ============================================================
-- deadlines
-- ============================================================
CREATE TABLE deadlines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  subject      text NOT NULL,
  due_date     timestamptz NOT NULL,
  description  text,
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- exam_results
-- ============================================================
CREATE TABLE exam_results (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_name         text NOT NULL,
  subject           text NOT NULL,
  marks             numeric(5,2),
  total_marks       numeric(5,2),
  grade             text,
  result_sheet_url  text,
  published_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  published_at      timestamptz DEFAULT now()
);

-- ============================================================
-- calendar_events
-- ============================================================
CREATE TABLE calendar_events (
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

-- ============================================================
-- timeline_questions
-- ============================================================
CREATE TABLE timeline_questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid REFERENCES calendar_events(id) ON DELETE CASCADE,
  asked_by     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  question     text NOT NULL CHECK (char_length(question) <= 500),
  is_resolved  boolean DEFAULT false,
  resolved_by  uuid REFERENCES profiles(id),
  resolved_at  timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- timeline_answers
-- ============================================================
CREATE TABLE timeline_answers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid REFERENCES timeline_questions(id) ON DELETE CASCADE,
  answered_by  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  answer       text NOT NULL CHECK (char_length(answer) <= 1000),
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- chat_messages
-- ============================================================
CREATE TABLE chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  is_pinned  boolean DEFAULT false,
  pinned_by  uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- notes
-- ============================================================
CREATE TABLE notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title      text NOT NULL,
  content    text,
  drive_link text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  message      text NOT NULL,
  type         notif_type NOT NULL,
  is_read      boolean DEFAULT false,
  reference_id uuid,
  created_at   timestamptz DEFAULT now()
);
