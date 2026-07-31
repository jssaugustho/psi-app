-- Garantir privilégios de UPDATE para authenticated e service_role na tabela tenants
GRANT UPDATE ON public.tenants TO authenticated, service_role;

-- Remover política antiga de update se existir para evitar conflitos
DROP POLICY IF EXISTS "Admins can update tenants" ON public.tenants;

-- Criar política de update para permitir que admins editem as configurações dos tenants
CREATE POLICY "Admins can update tenants" ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
