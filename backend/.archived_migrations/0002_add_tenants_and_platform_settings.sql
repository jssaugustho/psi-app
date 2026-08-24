CREATE TABLE IF NOT EXISTS public.tenants (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	name text NOT NULL,
	slug text NOT NULL UNIQUE,
	domain text,
	is_primary boolean DEFAULT false NOT NULL,
	logo_light_url text,
	logo_dark_url text,
	icon_light_url text,
	icon_dark_url text,
	gradient_color_start text DEFAULT '#4F46E5' NOT NULL,
	gradient_color_end text DEFAULT '#06B6D4' NOT NULL,
	contrast_color text DEFAULT '#FFFFFF' NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	cloudflare_api_token text,
	cloudflare_zone_id text,
	primary_tenant_id uuid REFERENCES public.tenants(id),
	is_configured boolean DEFAULT false NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL
);
