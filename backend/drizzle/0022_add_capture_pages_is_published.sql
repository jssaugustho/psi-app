-- Migration 0022: Add missing is_published and published_at columns to public.capture_pages
ALTER TABLE public.capture_pages
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
