-- Garantir que o role authenticated pode ler email_logs
-- (PostgREST usa o role do JWT — GoTrue emite role: "authenticated")
GRANT SELECT ON public.email_logs TO authenticated, service_role;

-- Remover política antiga se existir
DROP POLICY IF EXISTS "admins_can_read_email_logs" ON public.email_logs;

-- Nova política: verifica se o sub (user UUID do JWT) tem role = 'admin' na tabela profiles
-- O JWT do GoTrue tem o campo "sub" com o UUID do usuário autenticado
CREATE POLICY "admins_can_read_email_logs"
  ON public.email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (
        current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
      )::uuid
      AND profiles.role = 'admin'
    )
  );
