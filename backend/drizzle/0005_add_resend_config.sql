-- Adiciona colunas de configuração do Resend (e-mail transacional) à tabela platform_settings
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS resend_api_key text,
  ADD COLUMN IF NOT EXISTS resend_from_domain text,
  ADD COLUMN IF NOT EXISTS has_resend boolean NOT NULL DEFAULT false;
