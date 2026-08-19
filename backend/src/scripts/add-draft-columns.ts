import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL é obrigatória.');
  process.exit(1);
}

async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  console.log('Connecting and adding draft columns...');
  try {
    await sql.unsafe(`
      ALTER TABLE "capture_pages" ADD COLUMN IF NOT EXISTS "title_draft" text;
      ALTER TABLE "capture_pages" ADD COLUMN IF NOT EXISTS "slug_draft" text;
      ALTER TABLE "capture_pages" ADD COLUMN IF NOT EXISTS "custom_domain_draft" text;
      ALTER TABLE "capture_pages" ADD COLUMN IF NOT EXISTS "seo_config_draft" jsonb;
      ALTER TABLE "capture_pages" ADD COLUMN IF NOT EXISTS "site_config_draft" jsonb;
      ALTER TABLE "capture_pages" ADD COLUMN IF NOT EXISTS "dictionary_draft" jsonb;
      ALTER TABLE "capture_pages" ADD COLUMN IF NOT EXISTS "form_flow_draft" jsonb;
    `);
    console.log('✅ Draft columns added successfully!');
  } catch (err) {
    console.error('Error adding columns:', err);
  } finally {
    await sql.end();
  }
}

run();
