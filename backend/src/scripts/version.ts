import readline from 'readline';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import path from 'path';
import {
  ensureMigrationTables,
  getCurrentVersionName,
} from '../shared/migrations';

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

async function versionManager() {
  console.log('----------------------------------------------------');
  console.log('🏷️  PSI App - Controle de Versão e Release de Schema');
  console.log('----------------------------------------------------');

  const sql = postgres(DATABASE_URL);

  try {
    await ensureMigrationTables(sql);
    const currentVersion = await getCurrentVersionName(sql);
    console.log(`📌 Versão Atual do Sistema: \x1b[36m${currentVersion}\x1b[0m`);

    // 1. Aplica migrações pendentes primeiro para garantir sincronia
    console.log('\n⏳ 1. Verificando e aplicando migrações pendentes...');
    try {
      execSync('npm run db:migrate', {
        cwd: path.join(__dirname, '../..'),
        stdio: 'inherit',
      });
    } catch (err) {
      console.error('❌ Falha ao aplicar migrações pendentes. O versionamento foi abortado.');
      await sql.end();
      process.exit(1);
    }

    // 2. Coletar dados da nova versão
    console.log('\n📝 2. Cadastro do Novo Release');
    const inputVersion = await askQuestion('👉 Digite o número da nova versão (ex: v1.1.0): ');

    if (!inputVersion) {
      console.error('❌ O número da versão não pode ser vazio.');
      await sql.end();
      process.exit(1);
    }

    const formattedVersion = inputVersion.startsWith('v') ? inputVersion : `v${inputVersion}`;

    if (formattedVersion === currentVersion) {
      console.log(`ℹ️ A versão "${formattedVersion}" já é a versão ativa do sistema.`);
      await sql.end();
      process.exit(0);
    }

    const description = await askQuestion('👉 Digite uma descrição para esta versão (ex: Release Módulo CRM): ');
    const confirm = await askQuestion(
      `\n⚠️ Confirmar a ativação do release "${formattedVersion} - ${description || 'Sem descrição'}"? [S/n]: `
    );

    if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'sim' && confirm !== '') {
      console.log('❌ Operação cancelada pelo usuário.');
      await sql.end();
      process.exit(0);
    }

    // 3. Atualizar versão no banco de dados
    await sql.begin(async (tx) => {
      await tx`UPDATE public.schema_versions SET is_current = false WHERE is_current = true`;
      await tx`
        INSERT INTO public.schema_versions (version_name, description, is_current)
        VALUES (${formattedVersion}, ${description || null}, true)
      `;
    });

    console.log('----------------------------------------------------');
    console.log(`🎉 Sucesso! A versão \x1b[32m${formattedVersion}\x1b[0m foi definida como a versão ATIVA do sistema.`);
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
