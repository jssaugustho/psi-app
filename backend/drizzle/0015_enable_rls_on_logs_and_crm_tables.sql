-- Migration 0015_enable_rls_on_logs_and_crm_tables.sql: RLS for logs, audit_logs and custom_field_definitions

-- 1. LOGS (Apenas administradores da plataforma)
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logs_select_platform_admin" ON public.logs;
CREATE POLICY "logs_select_platform_admin" ON public.logs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 2. AUDIT_LOGS (Apenas administradores da plataforma)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_platform_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_platform_admin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 3. CUSTOM_FIELD_DEFINITIONS (Garantir existência da tabela + RLS para Membros do Workspace e Platform Admins)
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  options jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT custom_field_def_workspace_key_unique UNIQUE (workspace_id, key)
);

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_field_definitions_all_member" ON public.custom_field_definitions;
CREATE POLICY "custom_field_definitions_all_member" ON public.custom_field_definitions
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_platform_admin() OR public.is_workspace_member(workspace_id));

-- Notificar PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';

