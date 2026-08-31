-- Migration: 0007_secure_platform_settings_columns.sql
-- Descrição: Revoga SELECT de colunas sensíveis da tabela platform_settings para as roles anon e authenticated (PostgREST)

-- 1. Revoga todo SELECT na tabela platform_settings para as roles do PostgREST
REVOKE SELECT ON public.platform_settings FROM authenticated, anon;

-- 2. Concede permissão de SELECT apenas para as colunas não-sensíveis à role authenticated
GRANT SELECT (
  id,
  platform_name,
  logo_light_url,
  logo_dark_url,
  icon_light_url,
  icon_dark_url,
  gradient_color_start,
  gradient_color_end,
  contrast_color,
  bg_light_color,
  bg_dark_color,
  base_domain,
  r2_bucket_name,
  r2_public_domain,
  resend_from_domain,
  has_resend,
  base_tenant_price,
  additional_member_price,
  created_at,
  updated_at
) ON public.platform_settings TO authenticated;
