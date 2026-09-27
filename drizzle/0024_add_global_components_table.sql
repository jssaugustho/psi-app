-- Migration: 0024_add_global_components_table.sql
-- Description: Create public.global_components table with workspace RLS for global reusable elements

CREATE TABLE IF NOT EXISTS public.global_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'custom',
    icon_name VARCHAR(100) NOT NULL DEFAULT 'Sparkles',
    description TEXT,
    master_node JSONB NOT NULL,
    customizable_props JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.global_components ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to make script idempotent
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
