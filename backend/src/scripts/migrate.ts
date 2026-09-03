import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import {
  calculateChecksum,
  ensureMigrationTables,
  getCurrentVersionName,
  getAllSqlFiles,
  notifyPostgrest,
} from '../shared/migrations';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL é obrigatória para rodar as migrações.');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;

export async function runMigrations() {
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

    // 3. Ler arquivos de migração na raiz de ./drizzle (baseline + migrações arquivadas e pontuais)
    const drizzleDir = path.join(backendDir, 'drizzle');
    if (!fs.existsSync(drizzleDir)) {
      console.log('⚠️ Pasta ./drizzle não encontrada. Nenhuma migração a aplicar.');
      await sql.end();
      return;
    }

    const sqlFiles = getAllSqlFiles(drizzleDir);

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
        console.log(`⚡ Banco de dados pré-existente detectado. Registrando histórico baseline para a versão [\x1b[36m${currentVersion}\x1b[0m]...`);
        for (const fileItem of sqlFiles) {
          const sqlContent = fs.readFileSync(fileItem.fullPath, 'utf8');
          const checksum = calculateChecksum(sqlContent);

          await sql`
            INSERT INTO public.schema_migrations 
              (version_name, filename, checksum, sql_content, execution_time_ms)
            VALUES 
              (${currentVersion}, ${fileItem.filename}, ${checksum}, ${sqlContent}, 0)
            ON CONFLICT (filename) DO NOTHING
          `;
          console.log(`  📋 Audit: "${fileItem.filename}" ➔ Vinculado à Versão: [${currentVersion}]`);
        }
        console.log(`✅ Baseline de ${sqlFiles.length} migrações registrado no histórico com sucesso!`);
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

    for (const fileItem of sqlFiles) {
      const file = fileItem.filename;
      const sqlContent = fs.readFileSync(fileItem.fullPath, 'utf8');
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

      // 🛡️ Proteção Absoluta de Integridade: Se for o schema_baseline.sql e o banco de dados já possuir tabelas ativas, NUNCA executa DDL no banco
      if (file === 'schema_baseline.sql') {
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'profiles'
          ) as exists
        `;

        if (tableCheck[0].exists) {
          console.log(`🛡️  Proteção Ativa: "schema_baseline.sql" marcado como sincronizado (dados do banco preservados intactoss).`);
          await sql`
            INSERT INTO public.schema_migrations 
              (version_name, filename, checksum, sql_content, execution_time_ms)
            VALUES 
              (${currentVersion}, ${file}, ${checksum}, ${sqlContent}, 0)
            ON CONFLICT (filename) DO NOTHING
          `;
          executedMap.set(file, checksum);
          skippedCount++;
          continue;
        }
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
      console.log(`✅ Migração "${file}" executada com sucesso! | 🏷️  Versão: [\x1b[36m${currentVersion}\x1b[0m] | ⏱️  Tempo: ${executionTimeMs}ms`);
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
      `🎉 Processo concluído: ${appliedCount} novas migrações aplicadas, ${skippedCount} já executadas (Versão Ativa: ${currentVersion}).`
    );
    console.log('----------------------------------------------------');

    await sql.end();
  } catch (err: any) {
    console.error('❌ Erro crítico ao aplicar migrações:', err.message || err);
    await sql.end();
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations().then(() => process.exit(0));
}
