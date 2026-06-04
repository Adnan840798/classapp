-- ============================================================
-- 0004_storage.sql — ClassApp: Storage Buckets & Policies
-- ============================================================
-- Run this in Supabase SQL Editor to create storage buckets
-- for avatars and file attachments (notices/results).
-- ============================================================

-- ── avatars bucket ────────────────────────────────────────
-- Stores user profile pictures. Public read, authenticated write.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,                       -- publicly readable
  2097152,                    -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── notices bucket ────────────────────────────────────────
-- Stores announcement attachments and result sheets. Public read.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notices',
  'notices',
  true,                       -- publicly readable
  5242880,                    -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── RLS policies for avatars ──────────────────────────────
-- Anyone can view avatars (public bucket)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder
CREATE POLICY "avatars_authenticated_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/overwrite their own avatar
CREATE POLICY "avatars_authenticated_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "avatars_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── RLS policies for notices ──────────────────────────────
-- Anyone can view notices
CREATE POLICY "notices_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'notices');

-- Only CR/admin can upload notices
CREATE POLICY "notices_cr_admin_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'notices'
    AND public.get_my_role() IN ('cr', 'admin')
  );

-- Only CR/admin can delete notices
CREATE POLICY "notices_cr_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'notices'
    AND public.get_my_role() IN ('cr', 'admin')
  );
