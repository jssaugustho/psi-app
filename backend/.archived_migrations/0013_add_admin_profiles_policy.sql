-- Adiciona política para administradores poderem visualizar todos os perfis
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (
        current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
      )::uuid
      AND profiles.role = 'admin'
    )
  );

-- Adiciona política para administradores poderem atualizar todos os perfis
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (
        current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
      )::uuid
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (
        current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
      )::uuid
      AND profiles.role = 'admin'
    )
  );
