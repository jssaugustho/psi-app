-- 1. Alterar tabela tenants para adicionar owner_id
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id);

-- 2. Alterar tabela platform_settings para adicionar campos de preços
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS base_tenant_price integer DEFAULT 0 NOT NULL;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS additional_member_price integer DEFAULT 0 NOT NULL;

-- 3. Criar tabela tenant_members
CREATE TABLE IF NOT EXISTS public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT tenant_members_tenant_id_user_id_key UNIQUE (tenant_id, user_id)
);

-- 4. Criar funções de verificação de permissões do Tenant (RBAC)
CREATE OR REPLACE FUNCTION public.is_tenant_admin(tenant_id uuid)
RETURNS boolean AS $$
DECLARE
  has_access boolean;
  user_id uuid;
BEGIN
  -- Obter o ID do usuário do JWT claim sub de forma segura
  BEGIN
    user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Se for platform admin global, tem acesso total
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  -- Verificar se é dono do tenant
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = tenant_id AND owner_id = user_id
  ) INTO has_access;

  IF has_access THEN
    RETURN true;
  END IF;

  -- Verificar se tem role 'admin' na tabela tenant_members
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_members.tenant_id = is_tenant_admin.tenant_id
      AND tenant_members.user_id = user_id
      AND tenant_members.role = 'admin'
  ) INTO has_access;

  RETURN coalesce(has_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, pg_temp;

CREATE OR REPLACE FUNCTION public.is_tenant_member(tenant_id uuid)
RETURNS boolean AS $$
DECLARE
  has_access boolean;
  user_id uuid;
BEGIN
  -- Obter o ID do usuário do JWT claim sub de forma segura
  BEGIN
    user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Se for platform admin global, tem acesso total
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  -- Verificar se é dono do tenant
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = tenant_id AND owner_id = user_id
  ) INTO has_access;

  IF has_access THEN
    RETURN true;
  END IF;

  -- Verificar se é membro do tenant (admin ou agent)
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_members.tenant_id = is_tenant_member.tenant_id
      AND tenant_members.user_id = user_id
  ) INTO has_access;

  RETURN coalesce(has_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, pg_temp;

-- 5. Ativar e configurar RLS para tenant_members
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their tenants" ON public.tenant_members;
CREATE POLICY "Users can view members of their tenants" ON public.tenant_members
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admins can manage tenant members" ON public.tenant_members;
CREATE POLICY "Admins can manage tenant members" ON public.tenant_members
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_members TO authenticated, service_role;

-- 6. Atualizar políticas RLS de tenants para permitir donos e admins configurarem
DROP POLICY IF EXISTS "Admins can update tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins and tenant admins can update tenants" ON public.tenants;
CREATE POLICY "Admins and tenant admins can update tenants" ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(id))
  WITH CHECK (public.is_tenant_admin(id));

-- 7. Criar View para Assinaturas de Tenants
CREATE OR REPLACE VIEW public.tenant_subscriptions WITH (security_invoker = true) AS
SELECT 
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.owner_id,
  -- Preço base
  coalesce(ps.base_tenant_price, 0) AS base_price,
  -- Preço por membro adicional
  coalesce(ps.additional_member_price, 0) AS additional_member_price,
  -- Contagem de membros adicionais (todos exceto o dono se o dono não estiver em tenant_members, 
  -- mas por simplicidade contamos todos na tabela tenant_members)
  (SELECT count(*)::integer FROM public.tenant_members tm WHERE tm.tenant_id = t.id) AS members_count,
  -- Preço total calculado
  (
    coalesce(ps.base_tenant_price, 0) + 
    ((SELECT count(*)::integer FROM public.tenant_members tm WHERE tm.tenant_id = t.id) * coalesce(ps.additional_member_price, 0))
  ) AS total_price,
  t.created_at
FROM public.tenants t
CROSS JOIN (
  SELECT base_tenant_price, additional_member_price FROM public.platform_settings LIMIT 1
) ps;

GRANT SELECT ON public.tenant_subscriptions TO authenticated, service_role;
