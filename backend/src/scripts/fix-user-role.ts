import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL é obrigatória para o script fix-user-role.');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  console.log('🔄 Conectando ao banco de dados para garantir schema auth e role...');
  const sql = postgres(DATABASE_URL);

  try {
    // 1. Garantir que o schema auth existe no PostgreSQL
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS auth;`);
    console.log('✅ Schema "auth" garantido!');

    // 2. Tentar criar tabela auth.users basica se ainda nao existir para que GoTrue posicione as migrations
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid NOT NULL PRIMARY KEY,
        instance_id uuid NULL,
        aud varchar(255) NULL,
        role varchar(255) NULL,
        email varchar(255) NULL UNIQUE,
        encrypted_password varchar(255) NULL,
        confirmed_at timestamptz NULL,
        invited_at timestamptz NULL,
        confirmation_token varchar(255) NULL,
        confirmation_sent_at timestamptz NULL,
        recovery_token varchar(255) NULL,
        recovery_sent_at timestamptz NULL,
        email_change_token varchar(255) NULL,
        email_change varchar(255) NULL,
        email_change_sent_at timestamptz NULL,
        last_sign_in_at timestamptz NULL,
        raw_app_meta_data jsonb NULL,
        raw_user_meta_data jsonb NULL,
        is_super_admin bool NULL,
        created_at timestamptz NULL,
        updated_at timestamptz NULL
      );
    `);

    // 3. Atualizar roles para 'authenticated'
    await sql.unsafe(`
      UPDATE auth.users 
      SET role = 'authenticated', aud = 'authenticated'
      WHERE role IS NULL OR role = '' OR aud IS NULL OR aud = '';

      CREATE OR REPLACE FUNCTION auth.set_default_user_role()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.role IS NULL OR NEW.role = '' THEN
          NEW.role := 'authenticated';
        END IF;
        IF NEW.aud IS NULL OR NEW.aud = '' THEN
          NEW.aud := 'authenticated';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_set_default_user_role ON auth.users;
      CREATE TRIGGER trg_set_default_user_role
        BEFORE INSERT OR UPDATE ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION auth.set_default_user_role();
    `);

    console.log('✅ Role dos usuários e trigger atualizados com sucesso!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Erro ao atualizar role/schema no banco:', err.message || err);
    process.exit(1);
  }
}

main();
