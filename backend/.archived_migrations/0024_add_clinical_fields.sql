ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "emergency_contact_name" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "emergency_contact_relation" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "emergency_contact_phone" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "is_minor" boolean DEFAULT false NOT NULL;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "accepted_contract_at" timestamp with time zone;
