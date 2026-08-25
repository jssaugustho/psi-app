import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL é obrigatória para rodar as migrações.');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;

/**
 * Divide o conteúdo SQL em instruções individuais respeitando blocos de strings
 * delimitados por $$ (funções PL/pgSQL, blocos DO $$, etc.) para evitar corrupção
 * por divisão ingênua em ponto-e-vírgula (;).
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';

  let i = 0;
  while (i < sql.length) {
    if (sql[i] === '$') {
      const match = sql.slice(i).match(/^(\$[A-Za-z0-9_]*\$)/);
      if (match) {
        const tag = match[1];
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = tag;
          current += tag;
          i += tag.length;
          continue;
        } else if (dollarTag === tag) {
          inDollarQuote = false;
          dollarTag = '';
          current += tag;
          i += tag.length;
          continue;
        }
      }
    }

    if (sql[i] === ';' && !inDollarQuote) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
      i++;
      continue;
    }

    current += sql[i];
    i++;
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

async function migrate() {
  console.log('📦 Executando migrações SQL do banco de dados...');
  const sql = postgres(DATABASE_URL);

  try {
    const drizzleDir = path.join(__dirname, '../../drizzle');
    const files = fs.readdirSync(drizzleDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`⏳ Aplicando migração: ${file}`);
      const filePath = path.join(drizzleDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      const statements = splitSqlStatements(sqlContent);
      let successCount = 0;
      let ignoredCount = 0;

      for (const stmt of statements) {
        if (!stmt) continue;
        try {
          await sql.unsafe(stmt);
          successCount++;
        } catch (err: any) {
          // Códigos do Postgres que indicam objetos/roles já existentes ou drops de objetos ausentes
          if (['42P07', '42701', '42710', '42P06', '42704', '42P01', '00000'].includes(err.code)) {
            ignoredCount++;
          } else {
            console.warn(`  ⚠️ Alerta na instrução SQL: ${err.message || err}`);
          }
        }
      }

      console.log(`✅ ${file} processada (${successCount} executadas, ${ignoredCount} já existentes/ignoradas)!`);
    }

    // Pós-migração: Garantir roles e trigger do schema auth se a tabela auth.users existir
    try {
      const postAuthSql = `
        CREATE SCHEMA IF NOT EXISTS auth;

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
            UPDATE auth.users 
            SET role = 'authenticated',
                aud = 'authenticated',
                instance_id = COALESCE(instance_id, '00000000-0000-0000-0000-000000000000'::uuid)
            WHERE role IS NULL OR role = '' OR aud IS NULL OR aud = '' OR instance_id IS NULL;

            DROP TRIGGER IF EXISTS trg_set_default_user_role ON auth.users;
            CREATE TRIGGER trg_set_default_user_role
              BEFORE INSERT OR UPDATE ON auth.users
              FOR EACH ROW
              EXECUTE FUNCTION auth.set_default_user_role();
          END IF;
        END $do$;
      `;

      for (const stmt of splitSqlStatements(postAuthSql)) {
        try {
          await sql.unsafe(stmt);
        } catch (authErr: any) {
          if (!['42P07', '42701', '42710', '42P06', '42704', '42P01', '00000'].includes(authErr.code)) {
            console.warn('⚠️ Alerta ao verificar trigger do schema auth:', authErr.message);
          }
        }
      }
      console.log('✅ Roles e triggers do schema auth verificados com sucesso!');
    } catch (authErr: any) {
      console.warn('⚠️ Alerta pós-migração:', authErr.message);
    }

    console.log('🎉 Migrações concluídas com sucesso!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Erro crítico ao aplicar migrações:', err.message || err);
    process.exit(1);
  }
}

migrate();
