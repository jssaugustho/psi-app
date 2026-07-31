-- 1. Criar função auxiliar SECURITY DEFINER para verificar se o usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean;
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

  -- Consulta direta na tabela de perfis (bypassando RLS por ser SECURITY DEFINER)
  SELECT (role = 'admin') INTO is_admin_user
  FROM public.profiles
  WHERE id = user_id;

  RETURN coalesce(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, pg_temp;

-- 2. Remover políticas antigas que causavam recursão
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 3. Criar novas políticas usando a função auxiliar
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
