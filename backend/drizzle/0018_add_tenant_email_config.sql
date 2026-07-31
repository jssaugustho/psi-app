-- Adicionar campos de e-mail customizado à tabela tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS email_domain TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS resend_api_key TEXT;
