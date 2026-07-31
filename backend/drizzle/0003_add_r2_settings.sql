ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS cloudflare_account_id TEXT;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS r2_bucket_name TEXT;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS r2_public_domain TEXT;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS r2_access_key_id TEXT;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS r2_secret_access_key TEXT;
