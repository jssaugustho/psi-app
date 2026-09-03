-- Migration 0001_enable_rls.sql: Row Level Security & RBAC Enforcers
-- Estabiliza o controle de acesso de dois níveis (Plataforma + Workspace) no PostgreSQL.

-- ── 1. FUNÇÕES AUXILIARES DE SEGURANÇA ──────────────────────────────────────────

-- Retorna true se o usuário logado via JWT (auth.uid) for Admin da Plataforma em public.profiles
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (auth.uid())::uuid
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Retorna true se o usuário for membro do workspace indicado
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = (auth.uid())::uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Retorna true se o usuário for Owner ou Admin do workspace indicado
CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces w
    LEFT JOIN public.workspace_members wm ON wm.workspace_id = w.id
    WHERE w.id = ws_id
      AND (w.owner_id = (auth.uid())::uuid OR (wm.user_id = (auth.uid())::uuid AND wm.role = 'admin'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ── 2. TRIGGER: PROTEÇÃO CONTRA ELEVAÇÃO DE PRIVILÉGIO (PROFILES.ROLE) ─────────

CREATE OR REPLACE FUNCTION public.prevent_profile_role_elevation()
RETURNS trigger AS $$
BEGIN
  -- Se estiver tentando alterar a coluna 'role' e o executor não for admin da plataforma nem a service_role (null auth.uid)
  IF (NEW.role IS DISTINCT FROM OLD.role) THEN
    IF (auth.uid() IS NOT NULL AND NOT public.is_platform_admin()) THEN
      RAISE EXCEPTION 'Apenas Administradores da Plataforma podem alterar a role de um perfil.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_elevation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_elevation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_elevation();


-- ── 3. ATIVAÇÃO DE RLS E POLÍTICAS DE ACESSO POR TABELA ───────────────────────

-- 3.1 PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = (auth.uid())::uuid
    OR public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm1
      JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = (auth.uid())::uuid AND wm2.user_id = profiles.id
    )
  );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (auth.uid())::uuid OR public.is_platform_admin())
  WITH CHECK (id = (auth.uid())::uuid OR public.is_platform_admin());

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (auth.uid())::uuid OR public.is_platform_admin());

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());


-- 3.2 WORKSPACES
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspaces_select_policy" ON public.workspaces;
CREATE POLICY "workspaces_select_policy" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR owner_id = (auth.uid())::uuid
    OR public.is_workspace_member(id)
  );

DROP POLICY IF EXISTS "workspaces_insert_policy" ON public.workspaces;
CREATE POLICY "workspaces_insert_policy" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR owner_id = (auth.uid())::uuid);

DROP POLICY IF EXISTS "workspaces_update_policy" ON public.workspaces;
CREATE POLICY "workspaces_update_policy" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR owner_id = (auth.uid())::uuid OR public.is_workspace_admin(id))
  WITH CHECK (public.is_platform_admin() OR owner_id = (auth.uid())::uuid OR public.is_workspace_admin(id));

DROP POLICY IF EXISTS "workspaces_delete_policy" ON public.workspaces;
CREATE POLICY "workspaces_delete_policy" ON public.workspaces
  FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR owner_id = (auth.uid())::uuid);


-- 3.3 WORKSPACE_MEMBERS
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_select_policy" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_insert_policy" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR public.is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "workspace_members_update_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_update_policy" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_platform_admin() OR public.is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "workspace_members_delete_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_delete_policy" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR public.is_workspace_admin(workspace_id));


-- 3.4 WORKSPACE_DOMAINS (Leitura publica para resolucao DNS e sites)
ALTER TABLE public.workspace_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_domains_select_public" ON public.workspace_domains;
CREATE POLICY "workspace_domains_select_public" ON public.workspace_domains
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "workspace_domains_all_admin" ON public.workspace_domains;
CREATE POLICY "workspace_domains_all_admin" ON public.workspace_domains
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_platform_admin() OR public.is_workspace_admin(workspace_id));


-- 3.5 VISUAL_IDENTITIES (Leitura publica para branding de sites)
ALTER TABLE public.visual_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visual_identities_select_public" ON public.visual_identities;
CREATE POLICY "visual_identities_select_public" ON public.visual_identities
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "visual_identities_all_admin" ON public.visual_identities;
CREATE POLICY "visual_identities_all_admin" ON public.visual_identities
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_platform_admin() OR public.is_workspace_member(workspace_id));


-- 3.6 PLATFORM_SETTINGS (Chaves sensiveis - Apenas Super Admins)
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_select_policy" ON public.platform_settings;
CREATE POLICY "platform_settings_select_policy" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "platform_settings_all_admin" ON public.platform_settings;
CREATE POLICY "platform_settings_all_admin" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());


-- 3.7 SYSTEM_STATUS_LOGS & EMAIL_LOGS
ALTER TABLE public.system_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "status_logs_admin_policy" ON public.system_status_logs;
CREATE POLICY "status_logs_admin_policy" ON public.system_status_logs
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "email_logs_admin_policy" ON public.email_logs;
CREATE POLICY "email_logs_admin_policy" ON public.email_logs
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());


-- 3.8 TABELAS DE DADOS DO CRM & SITES (contacts, interaction_history, pipeline_columns, screening_forms, capture_pages, media_assets)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capture_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Contacts & Interaction History
DROP POLICY IF EXISTS "contacts_member_policy" ON public.contacts;
CREATE POLICY "contacts_member_policy" ON public.contacts
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_platform_admin() OR public.is_workspace_member(workspace_id));

-- Leitura de anon para inscricoes no CRM via formulários
DROP POLICY IF EXISTS "contacts_insert_anon" ON public.contacts;
CREATE POLICY "contacts_insert_anon" ON public.contacts
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "interaction_history_member_policy" ON public.interaction_history;
CREATE POLICY "interaction_history_member_policy" ON public.interaction_history
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_platform_admin() OR public.is_workspace_member(workspace_id));

-- Pipeline Columns
DROP POLICY IF EXISTS "pipeline_columns_member_policy" ON public.pipeline_columns;
CREATE POLICY "pipeline_columns_member_policy" ON public.pipeline_columns
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_platform_admin() OR public.is_workspace_member(workspace_id));

-- Screening Forms & Capture Pages (Leitura publica se ativo)
DROP POLICY IF EXISTS "screening_forms_select_public" ON public.screening_forms;
CREATE POLICY "screening_forms_select_public" ON public.screening_forms
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_platform_admin() OR public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "screening_forms_all_member" ON public.screening_forms;
CREATE POLICY "screening_forms_all_member" ON public.screening_forms
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_platform_admin() OR public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "capture_pages_select_public" ON public.capture_pages;
CREATE POLICY "capture_pages_select_public" ON public.capture_pages
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_platform_admin() OR public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "capture_pages_all_member" ON public.capture_pages;
CREATE POLICY "capture_pages_all_member" ON public.capture_pages
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_platform_admin() OR public.is_workspace_member(workspace_id));

-- Media Assets
DROP POLICY IF EXISTS "media_assets_member_policy" ON public.media_assets;
CREATE POLICY "media_assets_member_policy" ON public.media_assets
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_platform_admin() OR public.is_workspace_member(workspace_id));

-- Notificar PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
