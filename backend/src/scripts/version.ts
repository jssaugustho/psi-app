import readline from 'readline';
import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  ensureMigrationTables,
  getCurrentVersionName,
} from '../shared/migrations';
import { runMigrations } from './migrate';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL é obrigatória para registrar a versão.');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

/**
 * Extrai o schema puro do PostgreSQL usando pg_dump (--schema-only)
 */
function generateSchemaBaseline(targetFilePath: string): boolean {
  console.log('\n📸 Gerando foto do Schema Base consolidado via pg_dump (--schema-only)...');

  // 1. Tenta via container Docker psi-postgres
  try {
    const dumpCmd = 'docker exec psi-postgres pg_dump -U postgres -d postgres --schema-only --schema=public --no-owner --no-privileges';
    const output = execSync(dumpCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    fs.writeFileSync(targetFilePath, output, 'utf8');
    console.log(`✅ Arquivo "schema_baseline.sql" gerado com sucesso!`);
    return true;
  } catch (dockerErr) {
    // 2. Fallback: Tenta via pg_dump local no Host
    try {
      const dumpCmd = `pg_dump "${DATABASE_URL}" --schema-only --schema=public --no-owner --no-privileges`;
      const output = execSync(dumpCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      fs.writeFileSync(targetFilePath, output, 'utf8');
      console.log(`✅ Arquivo "schema_baseline.sql" gerado com sucesso via pg_dump local!`);
      return true;
    } catch (hostErr: any) {
      console.warn('⚠️ Não foi possível executar o pg_dump automaticamente. Verifique se o container "psi-postgres" está rodando.');
      return false;
    }
  }
}

async function versionManager() {
  console.log('----------------------------------------------------');
  console.log('🏷️  PSI App - Controle de Versão e Consolidação de Release');
  console.log('----------------------------------------------------');

  const sql = postgres(DATABASE_URL);

  try {
    await ensureMigrationTables(sql);
    const previousVersion = await getCurrentVersionName(sql);
    console.log(`📌 Versão Atual a ser Encerrada: \x1b[36m${previousVersion}\x1b[0m`);

    // 1. Aplica migrações pendentes primeiro para garantir que a versão atual está 100% gravada
    console.log('\n⏳ 1. Garantindo que todas as migrações pendentes foram aplicadas no banco...');
    await runMigrations();

    // 2. Coletar dados da NOVA versão que está iniciando
    console.log('\n📝 2. Cadastro da Nova Versão');
    const inputVersion = await askQuestion(`👉 Digite o número da NOVA versão (ex: v1.1.0): `);

    if (!inputVersion) {
      console.error('❌ O número da versão não pode ser vazio.');
      await sql.end();
      process.exit(1);
    }

    const newVersion = inputVersion.startsWith('v') ? inputVersion : `v${inputVersion}`;

    if (newVersion === previousVersion) {
      console.log(`ℹ️ A versão "${newVersion}" já é a versão ativa atual.`);
      await sql.end();
      process.exit(0);
    }

    const description = await askQuestion(`👉 Digite uma descrição para a nova versão (${newVersion}): `);

    console.log('\n----------------------------------------------------');
    console.log(`📋 Resumo da Operação de Lançamento:`);
    console.log(`  • Encerrar e Arquivar Versão: \x1b[33m${previousVersion}\x1b[0m ➔ ./drizzle/migrations/${previousVersion}/`);
    console.log(`  • Iniciar Nova Versão Ativa:   \x1b[32m${newVersion}\x1b[0m (${description || 'Sem descrição'})`);
    console.log(`  • Gerar Schema Base Puro:      ./drizzle/schema_baseline.sql`);
    console.log('----------------------------------------------------');

    const confirm = await askQuestion(`\n⚠️ Confirmar a criação da versão "${newVersion}" e arquivamento da "${previousVersion}"? [S/n]: `);

    if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'sim' && confirm !== '') {
      console.log('❌ Operação cancelada pelo usuário.');
      await sql.end();
      process.exit(0);
    }

    // 3. Arquivar os arquivos .sql (incluindo o schema_baseline antigo) da versão anterior em ./drizzle/migrations/{{previousVersion}}
    const backendDir = path.join(__dirname, '../..');
    const drizzleDir = path.join(backendDir, 'drizzle');
    const archiveTargetDir = path.join(drizzleDir, 'migrations', previousVersion);

    if (!fs.existsSync(archiveTargetDir)) {
      fs.mkdirSync(archiveTargetDir, { recursive: true });
    }

    // Lista todos os arquivos .sql soltos na raiz de ./drizzle/
    const rootSqlFiles = fs
      .readdirSync(drizzleDir, { withFileTypes: true })
      .filter((item) => item.isFile() && item.name.endsWith('.sql'))
      .map((item) => item.name);

    let movedCount = 0;
    console.log(`\n📋 Audit de Arquivamento da Versão [\x1b[33m${previousVersion}\x1b[0m]:`);
    for (const sqlFile of rootSqlFiles) {
      const sourcePath = path.join(drizzleDir, sqlFile);
      const destPath = path.join(archiveTargetDir, sqlFile);
      fs.renameSync(sourcePath, destPath);
      movedCount++;
      console.log(`  📦 Audit: "${sqlFile}" ➔ Arquivado em: ./drizzle/migrations/${previousVersion}/${sqlFile}`);
    }

    // 4. Gerar o novo schema_baseline.sql consolidado via pg_dump na raiz de ./drizzle/
    const newBaselinePath = path.join(drizzleDir, 'schema_baseline.sql');
    generateSchemaBaseline(newBaselinePath);

    // 5. Registrar a nova versão e o baseline no banco de dados
    await sql.begin(async (tx) => {
      await tx`UPDATE public.schema_versions SET is_current = false WHERE is_current = true`;
      await tx`
        INSERT INTO public.schema_versions (version_name, description, is_current)
        VALUES (${newVersion}, ${description || null}, true)
      `;

      if (fs.existsSync(newBaselinePath)) {
        const baselineContent = fs.readFileSync(newBaselinePath, 'utf8');
        const { calculateChecksum } = await import('../shared/migrations');
        const baselineChecksum = calculateChecksum(baselineContent);

        await tx`
          INSERT INTO public.schema_migrations 
            (version_name, filename, checksum, sql_content, execution_time_ms)
          VALUES 
            (${newVersion}, 'schema_baseline.sql', ${baselineChecksum}, ${baselineContent}, 0)
          ON CONFLICT (filename) DO UPDATE SET 
            version_name = ${newVersion},
            checksum = ${baselineChecksum},
            sql_content = ${baselineContent}
        `;
      }
    });

    console.log('\n----------------------------------------------------');
    console.log(`🎉 Versão anterior \x1b[33m${previousVersion}\x1b[0m encerrada (${movedCount} arquivos arquivados em ./drizzle/migrations/${previousVersion}/).`);
    console.log(`🚀 Nova Versão \x1b[32m${newVersion}\x1b[0m ativada! Schema Base salvo em ./drizzle/schema_baseline.sql.`);
    console.log('----------------------------------------------------');

    await sql.end();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Erro ao registrar versão:', err.message || err);
    await sql.end();
    process.exit(1);
  }
}

versionManager();
