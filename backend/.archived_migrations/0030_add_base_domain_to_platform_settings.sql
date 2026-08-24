-- Adiciona coluna base_domain à tabela platform_settings
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS base_domain TEXT;
