import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { calculateChecksum } from '../shared/migrations';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL ausente');
  }

  const sql = postgres(DATABASE_URL);

  console.log('⏳ 1. Criando tabela audit_logs se não existir...');
  await sql`
    CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "action" text NOT NULL,
      "category" text NOT NULL,
      "service_name" text NOT NULL,
      "status" text NOT NULL,
      "user_id" uuid,
      "workspace_id" uuid,
      "ip" text,
      "user_agent" text,
      "details" jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`ALTER TABLE IF EXISTS "audit_logs" ENABLE ROW LEVEL SECURITY;`;

  console.log('✅ Tabela audit_logs garantida!');

  console.log('⏳ 2. Registrando schema_baseline.sql em schema_migrations...');
  const baselinePath = path.join(__dirname, '../../drizzle/schema_baseline.sql');
  if (fs.existsSync(baselinePath)) {
    const content = fs.readFileSync(baselinePath, 'utf8');
    const checksum = calculateChecksum(content);
    await sql`
      INSERT INTO public.schema_migrations 
        (version_name, filename, checksum, sql_content, execution_time_ms)
      VALUES 
        ('v1.0.1', 'schema_baseline.sql', ${checksum}, ${content}, 0)
      ON CONFLICT (filename) DO NOTHING
    `;
    console.log('✅ schema_baseline.sql registrado!');
  }

  await sql.end();
  console.log('🚀 Finalizado com sucesso!');
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
