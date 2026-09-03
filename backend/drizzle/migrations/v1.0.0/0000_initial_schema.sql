-- Baseline consolidated schema: TheraOS White-Label SaaS Architecture
-- Workspaces, Visual Identities, Workspace Domains & Workspace Members

CREATE SCHEMA IF NOT EXISTS auth;

-- Registrar função e trigger de segurança no schema auth se a tabela auth.users já tiver sido criada pelo GoTrue
CREATE OR REPLACE FUNCTION auth.set_default_user_role()
RETURNS trigger AS $func$
BEGIN
  IF NEW.role IS NULL OR NEW.role = '' THEN
    NEW.role := 'authenticated';
  END IF;
  IF NEW.aud IS NULL OR NEW.aud = '' THEN
    NEW.aud := 'authenticated';
  END IF;
  IF NEW.instance_id IS NULL THEN
    NEW.instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS trg_set_default_user_role ON auth.users;
    CREATE TRIGGER trg_set_default_user_role
      BEFORE INSERT OR UPDATE ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION auth.set_default_user_role();
  END IF;
END $do$;

CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"email" text NOT NULL,
	"avatar_url" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid,
	"crp" text,
	"bio" text,
	"specialties" jsonb,
	"city_state" text,
	"instagram" text,
	"is_online_service" boolean DEFAULT true NOT NULL,
	"default_site_avatar_url" text,
	"traffic_sources" jsonb DEFAULT '["Manual","Instagram","Google Ads","Facebook Ads","Webhook"]'::jsonb NOT NULL,
	"default_traffic_source" text DEFAULT 'Manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "visual_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_workspace_default" boolean DEFAULT false NOT NULL,
	"logo_url" text,
	"favicon_url" text,
	"logo_config" jsonb,
	"primary_color" text DEFAULT '#4F46E5' NOT NULL,
	"secondary_color" text DEFAULT '#06B6D4' NOT NULL,
	"contrast_color" text DEFAULT '#FFFFFF' NOT NULL,
	"bg_color" text DEFAULT '#F8FAFC' NOT NULL,
	"card_color" text DEFAULT '#FFFFFF' NOT NULL,
	"text_color" text DEFAULT '#0F172A' NOT NULL,
	"font_heading" text DEFAULT 'serif' NOT NULL,
	"font_body" text DEFAULT 'sans' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspace_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"subdomain" text NOT NULL,
	"custom_domain" text,
	"cf_hostname_id" text,
	"dns_status" text DEFAULT 'pending' NOT NULL,
	"dns_records" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_domains_workspace_id_unique" UNIQUE("workspace_id"),
	CONSTRAINT "workspace_domains_subdomain_unique" UNIQUE("subdomain")
);

CREATE TABLE IF NOT EXISTS "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'membro' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_user_unique" UNIQUE("workspace_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_name" text DEFAULT 'TheraOS' NOT NULL,
	"logo_light_url" text,
	"logo_dark_url" text,
	"icon_light_url" text,
	"icon_dark_url" text,
	"gradient_color_start" text DEFAULT '#7C3AED' NOT NULL,
	"gradient_color_end" text DEFAULT '#A855F7' NOT NULL,
	"contrast_color" text DEFAULT '#FFFFFF' NOT NULL,
	"bg_light_color" text DEFAULT '#F8FAFC' NOT NULL,
	"bg_dark_color" text DEFAULT '#09090B' NOT NULL,
	"cloudflare_api_token" text,
	"cloudflare_zone_id" text,
	"cloudflare_account_id" text,
	"base_domain" text,
	"r2_bucket_name" text,
	"r2_public_domain" text,
	"r2_access_key_id" text,
	"r2_secret_access_key" text,
	"backup_r2_buckets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resend_api_key" text,
	"resend_from_domain" text,
	"has_resend" boolean DEFAULT false NOT NULL,
	"is_configured" boolean DEFAULT false NOT NULL,
	"base_tenant_price" integer DEFAULT 0 NOT NULL,
	"additional_member_price" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "pipeline_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '#6366F1' NOT NULL,
	"category" text DEFAULT 'acolhimento' NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "screening_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"visual_identity_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"theme_config" jsonb NOT NULL,
	"form_flow" jsonb NOT NULL,
	"draft_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "capture_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"visual_identity_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"cta_type" text DEFAULT 'form' NOT NULL,
	"cta_whatsapp_message" text,
	"cta_external_url" text,
	"form_id" uuid,
	"custom_domain" text,
	"seo_config" jsonb NOT NULL,
	"site_config" jsonb NOT NULL,
	"dictionary" jsonb NOT NULL,
	"form_flow" jsonb NOT NULL,
	"draft_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"pipeline_column_id" uuid,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"status" text NOT NULL,
	"source" text,
	"screening_notes" text,
	"next_contact_at" timestamp with time zone,
	"last_contact_at" timestamp with time zone,
	"emergency_contact_name" text,
	"emergency_contact_relation" text,
	"emergency_contact_phone" text,
	"is_minor" boolean DEFAULT false NOT NULL,
	"accepted_contract_at" timestamp with time zone,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"form_id" uuid,
	"capture_page_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "interaction_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"type" text NOT NULL,
	"duration_seconds" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"is_cropped" boolean DEFAULT false NOT NULL,
	"parent_id" uuid,
	"usage_context" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_key_unique" UNIQUE("key")
);

CREATE TABLE IF NOT EXISTS "system_status_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_name" text NOT NULL,
	"status" text NOT NULL,
	"response_time_ms" integer,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"template" text NOT NULL,
	"html_body" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"error" text,
	"metadata" jsonb,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Foreign Keys
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "visual_identities" ADD CONSTRAINT "visual_identities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "workspace_domains" ADD CONSTRAINT "workspace_domains_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "pipeline_columns" ADD CONSTRAINT "pipeline_columns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "screening_forms" ADD CONSTRAINT "screening_forms_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "screening_forms" ADD CONSTRAINT "screening_forms_visual_identity_id_visual_identities_id_fk" FOREIGN KEY ("visual_identity_id") REFERENCES "public"."visual_identities"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "capture_pages" ADD CONSTRAINT "capture_pages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "capture_pages" ADD CONSTRAINT "capture_pages_visual_identity_id_visual_identities_id_fk" FOREIGN KEY ("visual_identity_id") REFERENCES "public"."visual_identities"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "capture_pages" ADD CONSTRAINT "capture_pages_form_id_screening_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."screening_forms"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_pipeline_column_id_pipeline_columns_id_fk" FOREIGN KEY ("pipeline_column_id") REFERENCES "public"."pipeline_columns"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_form_id_screening_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."screening_forms"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_capture_page_id_capture_pages_id_fk" FOREIGN KEY ("capture_page_id") REFERENCES "public"."capture_pages"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "interaction_history" ADD CONSTRAINT "interaction_history_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "interaction_history" ADD CONSTRAINT "interaction_history_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;

-- Seed inicial de platform_settings se nao existir
INSERT INTO public.platform_settings (platform_name, gradient_color_start, gradient_color_end, contrast_color)
SELECT 'TheraOS', '#7C3AED', '#A855F7', '#FFFFFF'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- PostgREST Roles e Permissoes Schema
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $do$;

GRANT anon, authenticated, service_role TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;