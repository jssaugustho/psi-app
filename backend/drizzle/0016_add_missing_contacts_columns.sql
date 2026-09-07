-- Migration 0016_add_missing_contacts_columns.sql
-- Adiciona colunas faltantes na tabela contacts e indice GIN para custom_field_values

ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "age_confirmed_at" timestamp with time zone;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "signed_contract_content" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "consent_ip" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "consent_user_agent" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "parent_name" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "parent_cpf" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "parent_phone" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "custom_field_values" jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_contacts_custom_fields" ON "contacts" USING gin ("custom_field_values");
