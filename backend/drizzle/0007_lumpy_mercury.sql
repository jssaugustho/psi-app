CREATE TABLE IF NOT EXISTS "global_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action,
	"name" text NOT NULL,
	"category" text DEFAULT 'custom' NOT NULL,
	"icon_name" text DEFAULT 'Sparkles' NOT NULL,
	"description" text,
	"master_node" jsonb NOT NULL,
	"customizable_props" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "capture_pages" ALTER COLUMN "slug" SET DEFAULT '';
ALTER TABLE "capture_pages" ADD COLUMN IF NOT EXISTS "is_published" boolean DEFAULT false NOT NULL;
ALTER TABLE "capture_pages" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;

ALTER TABLE public.global_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage global_components in their workspace" ON public.global_components;
DROP POLICY IF EXISTS "Anon read global_components" ON public.global_components;

CREATE POLICY "Users can manage global_components in their workspace"
ON public.global_components
FOR ALL
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
);

CREATE POLICY "Anon read global_components"
ON public.global_components
FOR SELECT
TO anon
USING (true);