-- ============================================================
-- 0005_fcm_token.sql — Add FCM push token to profiles
-- ============================================================
-- Run this in Supabase SQL Editor AFTER 0000_complete_schema.sql
-- Adds a column to store the FCM device registration token per user.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fcm_token text DEFAULT NULL;

-- Allow users to update their own FCM token
-- (existing RLS policies on profiles already permit this for 'update own row')
