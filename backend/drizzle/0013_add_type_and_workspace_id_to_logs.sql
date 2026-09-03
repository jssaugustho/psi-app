ALTER TABLE "logs" ADD COLUMN "type" text DEFAULT 'error' NOT NULL;--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;
