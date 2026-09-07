ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "social_links" jsonb DEFAULT '{}'::jsonb NOT NULL;
