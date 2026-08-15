-- Adicionar campos de perfil profissional na tabela public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crp text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialties jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city_state text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram text;

-- Adicionar campos de marca padrão para sites na tabela public.tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS default_site_avatar_url text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS default_site_primary_color text DEFAULT '#CC8667';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS default_site_secondary_color text DEFAULT '#E6A88A';
