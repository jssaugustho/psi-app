-- 1. VIEW DE STATUS DO BOOTSTRAP (Substitui GET /auth/bootstrap/status)
CREATE OR REPLACE VIEW public.bootstrap_status AS
SELECT 
  EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') AS bootstrapped,
  (SELECT email FROM public.profiles WHERE role = 'admin' LIMIT 1) AS admin_email;

GRANT SELECT ON public.bootstrap_status TO anon, authenticated, service_role;


-- 2. VIEW DE STATUS DA PLATAFORMA (Substitui GET /platform/setup/status)
-- Expõe apenas flags e dados públicos de identidade visual, ocultando credenciais confidenciais.
CREATE OR REPLACE VIEW public.platform_setup_status AS
SELECT 
  ps.is_configured,
  (ps.cloudflare_api_token IS NOT NULL AND ps.cloudflare_zone_id IS NOT NULL) AS has_cloudflare,
  (ps.cloudflare_account_id IS NOT NULL AND ps.r2_bucket_name IS NOT NULL) AS has_r2,
  (ps.resend_api_key IS NOT NULL) AS has_resend,
  ps.cloudflare_zone_id,
  ps.cloudflare_account_id,
  ps.r2_bucket_name,
  ps.r2_public_domain,
  ps.resend_from_domain,
  -- Junção segura do Tenant com chaves camelCase para compatibilidade com o frontend
  (
    SELECT json_build_object(
      'id', t.id,
      'name', t.name,
      'slug', t.slug,
      'domain', t.domain,
      'isPrimary', t.is_primary,
      'logoLightUrl', t.logo_light_url,
      'logoDarkUrl', t.logo_dark_url,
      'iconLightUrl', t.icon_light_url,
      'iconDarkUrl', t.icon_dark_url,
      'gradientColorStart', t.gradient_color_start,
      'gradientColorEnd', t.gradient_color_end,
      'contrastColor', t.contrast_color,
      'bgLightColor', t.bg_light_color,
      'bgDarkColor', t.bg_dark_color,
      'cardLightColor', t.card_light_color,
      'cardDarkColor', t.card_dark_color,
      'textLightColor', t.text_light_color,
      'textDarkColor', t.text_dark_color
    )
    FROM public.tenants t
    WHERE t.id = ps.primary_tenant_id OR (ps.primary_tenant_id IS NULL AND t.is_primary = true)
    LIMIT 1
  )::jsonb AS primary_tenant
FROM public.platform_settings ps
LIMIT 1;

GRANT SELECT ON public.platform_setup_status TO anon, authenticated, service_role;


-- 3. POLÍTICA DE LEITURA E ESCRITA DO PROFILE (Substitui GET /auth/me e PUT /auth/me)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

GRANT SELECT, UPDATE ON public.profiles TO authenticated, service_role;


-- 4. AUTOMATIZAÇÃO DE PERFIL VIA TRIGGER (Substitui POST /auth/register)
-- Quando um usuário se cadastra no GoTrue (schema auth), criamos seu perfil no schema public automaticamente.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', 'Usuário'),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Associar trigger à tabela de usuários do GoTrue
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
