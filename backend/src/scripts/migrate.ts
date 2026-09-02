import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import {
  calculateChecksum,
  ensureMigrationTables,
  getCurrentVersionName,
  notifyPostgrest,
} from '../shared/migrations';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL é obrigatória para rodar as migrações.');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;

async function migrate() {
  console.log('----------------------------------------------------');
  console.log('📦 Executando Sistema de Migrações PSI App');
  console.log('----------------------------------------------------');

  const backendDir = path.join(__dirname, '../..');
  const sql = postgres(DATABASE_URL);

  try {
    // 1. Executar automaticamente o Drizzle Kit Generate se houver alterações no schema.ts
    console.log('⏳ 1. Verificando alterações no schema TypeScript (drizzle-kit generate)...');
    try {
      execSync('npx drizzle-kit generate', {
        cwd: backendDir,
        stdio: 'inherit',
      });
    } catch (genErr: any) {
      console.warn('⚠️ Alerta ao executar drizzle-kit generate:', genErr.message || genErr);
    }

    // 2. Garantir que as tabelas de controle de versão existam
    await ensureMigrationTables(sql);
    const currentVersion = await getCurrentVersionName(sql);
    console.log(`\n📌 Versão Ativa do App: \x1b[36m${currentVersion}\x1b[0m`);

    // 3. Ler arquivos de migração na pasta drizzle
    const drizzleDir = path.join(backendDir, 'drizzle');
    if (!fs.existsSync(drizzleDir)) {
      console.log('⚠️ Pasta ./drizzle não encontrada. Nenhuma migração a aplicar.');
      await sql.end();
      process.exit(0);
    }

    const files = fs
      .readdirSync(drizzleDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    // 4. Checar se o banco já foi inicializado anteriormente (bootstrap automático)
    const migrationCountRow = await sql`SELECT count(*) as count FROM public.schema_migrations`;
    const migrationCount = parseInt(migrationCountRow[0].count, 10);

    if (migrationCount === 0) {
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'profiles'
        ) as exists
      `;

      if (tableCheck[0].exists) {
        console.log('⚡ Banco de dados pré-existente detectado. Registrando histórico baseline...');
        for (const file of files) {
          const filePath = path.join(drizzleDir, file);
          const sqlContent = fs.readFileSync(filePath, 'utf8');
          const checksum = calculateChecksum(sqlContent);

          await sql`
            INSERT INTO public.schema_migrations 
              (version_name, filename, checksum, sql_content, execution_time_ms)
            VALUES 
              (${currentVersion}, ${file}, ${checksum}, ${sqlContent}, 0)
            ON CONFLICT (filename) DO NOTHING
          `;
        }
        console.log(`✅ Baseline de ${files.length} migrações registrado no histórico com sucesso!`);
      }
    }

    // 5. Buscar migrações já executadas
    const executedRows = await sql`
      SELECT filename, checksum FROM public.schema_migrations
    `;
    const executedMap = new Map<string, string>();
    for (const row of executedRows) {
      executedMap.set(row.filename, row.checksum);
    }

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const filePath = path.join(drizzleDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      const checksum = calculateChecksum(sqlContent);

      if (executedMap.has(file)) {
        const storedChecksum = executedMap.get(file);
        if (storedChecksum !== checksum) {
          console.error(
            `❌ ERRO DE INTEGRIDADE: O arquivo de migração "${file}" foi modificado após ter sido aplicado no banco!`
          );
          console.error(`  - Checksum Registrado: ${storedChecksum}`);
          console.error(`  - Checksum Atual:      ${checksum}`);
          await sql.end();
          process.exit(1);
        }
        skippedCount++;
        continue;
      }

      console.log(`⏳ Aplicando migração pendente: \x1b[33m${file}\x1b[0m...`);
      const startTime = Date.now();

      // Executa a migração dentro de um bloco transacional
      await sql.begin(async (tx) => {
        await tx.unsafe(sqlContent);

        const executionTimeMs = Date.now() - startTime;

        await tx`
          INSERT INTO public.schema_migrations 
            (version_name, filename, checksum, sql_content, execution_time_ms)
          VALUES 
            (${currentVersion}, ${file}, ${checksum}, ${sqlContent}, ${executionTimeMs})
        `;
      });

      const executionTimeMs = Date.now() - startTime;
      console.log(`✅ ${file} aplicada com sucesso em ${executionTimeMs}ms!`);
      appliedCount++;
    }

    // 6. Pós-migração: Verificar roles e permissões básicas para o PostgREST
    await sql.unsafe(`
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

      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
      GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
    `);

    // 7. Notificar PostgREST
    await notifyPostgrest(sql);

    console.log('----------------------------------------------------');
    console.log(
      `🎉 Processo concluído: ${appliedCount} novas migrações aplicadas, ${skippedCount} já executadas.`
    );
    console.log('----------------------------------------------------');

    await sql.end();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Erro crítico ao aplicar migrações:', err.message || err);
    await sql.end();
    process.exit(1);
  }
}

migrate();
