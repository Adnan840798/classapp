-- ============================================================
-- 0002_rls.sql — ClassApp: Row Level Security Policies
-- ============================================================
-- Enable RLS on every table
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results     ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_answers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;

-- Helper function: returns current user's role from profiles
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- profiles
-- ============================================================
-- Anon and authenticated can read all profiles
CREATE POLICY "profiles_read_all"
  ON profiles FOR SELECT
  USING (true);

-- Users can update only their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin can do anything
CREATE POLICY "profiles_admin_all"
  ON profiles FOR ALL
  USING (get_my_role() = 'admin');

-- Service role inserts (from seed / signup trigger)
CREATE POLICY "profiles_insert_service"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR get_my_role() = 'admin');

-- ============================================================
-- announcements
-- ============================================================
-- Anon: only public announcements
CREATE POLICY "announcements_anon_read"
  ON announcements FOR SELECT
  TO anon
  USING (is_public = true);

-- Students: read all
CREATE POLICY "announcements_student_read"
  ON announcements FOR SELECT
  TO authenticated
  USING (true);

-- CR / Admin: full CRUD
CREATE POLICY "announcements_cr_admin_all"
  ON announcements FOR ALL
  TO authenticated
  USING (get_my_role() IN ('cr', 'admin'))
  WITH CHECK (get_my_role() IN ('cr', 'admin'));

-- ============================================================
-- deadlines
-- ============================================================
-- Students: read all
CREATE POLICY "deadlines_authenticated_read"
  ON deadlines FOR SELECT
  TO authenticated
  USING (true);

-- CR / Admin: full CRUD
CREATE POLICY "deadlines_cr_admin_all"
  ON deadlines FOR ALL
  TO authenticated
  USING (get_my_role() IN ('cr', 'admin'))
  WITH CHECK (get_my_role() IN ('cr', 'admin'));

-- ============================================================
-- exam_results
-- ============================================================
-- Students: read only their own results
CREATE POLICY "results_student_read_own"
  ON exam_results FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR get_my_role() IN ('cr', 'admin')
  );

-- CR / Admin: full CRUD
CREATE POLICY "results_cr_admin_all"
  ON exam_results FOR ALL
  TO authenticated
  USING (get_my_role() IN ('cr', 'admin'))
  WITH CHECK (get_my_role() IN ('cr', 'admin'));

-- ============================================================
-- calendar_events
-- ============================================================
-- Anon: only public events
CREATE POLICY "calendar_anon_read_public"
  ON calendar_events FOR SELECT
  TO anon
  USING (is_public = true);

-- Students: read all
CREATE POLICY "calendar_authenticated_read"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (true);

-- CR / Admin: full CRUD
CREATE POLICY "calendar_cr_admin_all"
  ON calendar_events FOR ALL
  TO authenticated
  USING (get_my_role() IN ('cr', 'admin'))
  WITH CHECK (get_my_role() IN ('cr', 'admin'));

-- ============================================================
-- timeline_questions
-- ============================================================
-- Students: read all questions
CREATE POLICY "tq_authenticated_read"
  ON timeline_questions FOR SELECT
  TO authenticated
  USING (true);

-- Students: insert only on enabled events with no resolved questions on this event
CREATE POLICY "tq_student_insert"
  ON timeline_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'student'
    AND EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = event_id AND ce.qa_enabled = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM timeline_questions tq
      WHERE tq.event_id = timeline_questions.event_id
        AND tq.is_resolved = true
    )
  );

-- CR / Admin: full CRUD
CREATE POLICY "tq_cr_admin_all"
  ON timeline_questions FOR ALL
  TO authenticated
  USING (get_my_role() IN ('cr', 'admin'))
  WITH CHECK (get_my_role() IN ('cr', 'admin'));

-- ============================================================
-- timeline_answers
-- ============================================================
-- Students: read all answers
CREATE POLICY "ta_authenticated_read"
  ON timeline_answers FOR SELECT
  TO authenticated
  USING (true);

-- CR / Admin: full CRUD
CREATE POLICY "ta_cr_admin_all"
  ON timeline_answers FOR ALL
  TO authenticated
  USING (get_my_role() IN ('cr', 'admin'))
  WITH CHECK (get_my_role() IN ('cr', 'admin'));

-- ============================================================
-- chat_messages
-- ============================================================
-- All authenticated users can read
CREATE POLICY "chat_authenticated_read"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (true);

-- Students: insert their own messages
CREATE POLICY "chat_student_insert"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Students: delete only their own messages
CREATE POLICY "chat_student_delete_own"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR get_my_role() IN ('cr', 'admin')
  );

-- CR / Admin: update (pin), delete any
CREATE POLICY "chat_cr_admin_update"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('cr', 'admin'))
  WITH CHECK (get_my_role() IN ('cr', 'admin'));

-- ============================================================
-- notes
-- ============================================================
-- Students: full CRUD on only their own notes
CREATE POLICY "notes_owner_all"
  ON notes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- notifications
-- ============================================================
-- Users: read only their own notifications
CREATE POLICY "notif_read_own"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users: update (mark as read) only their own
CREATE POLICY "notif_update_own"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No client-side INSERT — only the broadcast_notification function inserts
-- INSERT is done via service role in the RPC function
