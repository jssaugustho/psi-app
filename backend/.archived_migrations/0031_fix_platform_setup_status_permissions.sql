-- Migration 0031: Fix platform_setup_status permissions via SECURITY DEFINER function
-- Garante que a checagem de status da plataforma não falhe com 406/403 no PostgREST durante a autenticação inicial.

CREATE OR REPLACE FUNCTION public.get_platform_setup_status()
RETURNS TABLE (
  is_configured boolean,
  has_cloudflare boolean,
  has_r2 boolean,
  has_resend boolean,
  cloudflare_zone_id text,
  cloudflare_account_id text,
  r2_bucket_name text,
  r2_public_domain text,
  resend_from_domain text,
  primary_tenant jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_setup_status() TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.platform_setup_status AS
SELECT * FROM public.get_platform_setup_status();

GRANT SELECT ON public.platform_setup_status TO anon, authenticated, service_role;
