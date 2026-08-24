-- Migration 0032: Add backup_r2_buckets column to platform_settings table
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS backup_r2_buckets jsonb DEFAULT '[]'::jsonb NOT NULL;
