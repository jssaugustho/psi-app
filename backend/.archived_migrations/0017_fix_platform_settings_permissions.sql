-- Ativar RLS na tabela platform_settings caso ainda não esteja ativa
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Garantir privilégios para authenticated e service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated, service_role;

-- Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Admins can manage platform_settings" ON public.platform_settings;

-- Permitir que apenas administradores da plataforma (is_admin()) visualizem e modifiquem as configurações globais
CREATE POLICY "Admins can manage platform_settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
