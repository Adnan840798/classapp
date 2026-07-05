-- ============================================================
-- Migration: 0010_allow_pptx.sql
-- Description: Allows PPTX and PPT files as attachments in notes/resources and announcements.
-- Run this SQL on BOTH the Master and EACH tenant Supabase project's SQL Editor.
-- ============================================================

-- Add 'pptx' value to the attachment_type enum
ALTER TYPE public.attachment_type ADD VALUE IF NOT EXISTS 'pptx';
