-- Adiciona o ID do Custom Hostname do Cloudflare ao tenant
-- para rastrear o ciclo de vida (criação, verificação, deleção)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cf_hostname_id TEXT;
