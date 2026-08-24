-- Ativar RLS na tabela tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar conflito
DROP POLICY IF EXISTS "Tenants are publicly readable" ON public.tenants;

-- Criar política de leitura pública para a tabela tenants (qualquer papel, logado ou não, pode ler)
CREATE POLICY "Tenants are publicly readable" ON public.tenants
  FOR SELECT
  USING (true);

-- Garantir privilégios de SELECT para anon, authenticated e service_role
GRANT SELECT ON public.tenants TO anon, authenticated, service_role;
