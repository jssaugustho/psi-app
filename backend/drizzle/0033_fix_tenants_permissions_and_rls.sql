-- 0033_fix_tenants_permissions_and_rls.sql
-- Conceder privilégios completos na tabela tenants para authenticated e service_role (resolve 403 / permission denied no PostgREST)

GRANT ALL ON TABLE public.tenants TO authenticated, service_role;
GRANT SELECT ON TABLE public.tenants TO anon;

-- Permissões de execução para funções de verificação de papel e RLS
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(uuid) TO authenticated, service_role, anon;

-- Atualizar política de UPDATE RLS para permitir que Platform Admins (role = 'admin') e Tenant Admins editem tenants
DROP POLICY IF EXISTS "Admins and tenant admins can update tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins can update tenants" ON public.tenants;

CREATE POLICY "Admins and tenant admins can update tenants" ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_tenant_admin(id))
  WITH CHECK (public.is_admin() OR public.is_tenant_admin(id));

-- Permitir inserção de tenants para administradores e usuários autenticados
DROP POLICY IF EXISTS "Admins can insert tenants" ON public.tenants;
CREATE POLICY "Admins can insert tenants" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);
