ALTER TABLE IF EXISTS "logs" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'error' NOT NULL;
ALTER TABLE IF EXISTS "logs" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logs_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE "logs" ADD CONSTRAINT "logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
