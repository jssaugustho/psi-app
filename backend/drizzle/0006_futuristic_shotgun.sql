CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
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
--> statement-breakpoint
ALTER TABLE "capture_pages" ADD COLUMN "title_draft" text;--> statement-breakpoint
ALTER TABLE "capture_pages" ADD COLUMN "slug_draft" text;--> statement-breakpoint
ALTER TABLE "capture_pages" ADD COLUMN "custom_domain_draft" text;--> statement-breakpoint
ALTER TABLE "capture_pages" ADD COLUMN "seo_config_draft" jsonb;--> statement-breakpoint
ALTER TABLE "capture_pages" ADD COLUMN "site_config_draft" jsonb;--> statement-breakpoint
ALTER TABLE "capture_pages" ADD COLUMN "dictionary_draft" jsonb;--> statement-breakpoint
ALTER TABLE "capture_pages" ADD COLUMN "form_flow_draft" jsonb;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_parent_id_media_assets_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;