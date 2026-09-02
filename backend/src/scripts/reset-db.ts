import readline from 'readline';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import path from 'path';
import { isLocalConnectionString } from '../shared/migrations';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL é obrigatória para executar o reset do banco.');
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

async function resetDb() {
  console.log('----------------------------------------------------');
  console.log('⚠️  ATENÇÃO: RESET DO BANCO DE DADOS LOCAL SOLICITADO');
  console.log('----------------------------------------------------');

  // 1. Trava de Segurança de Ambiente
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isLocal = isLocalConnectionString(DATABASE_URL);

  console.log(`📌 Ambiente Detectado: \x1b[33m${nodeEnv}\x1b[0m`);
  console.log(`📌 Conexão Local:       \x1b[33m${isLocal ? 'SIM' : 'NÃO (EXTERNA)'}\x1b[0m`);

  if (nodeEnv === 'production' || !isLocal) {
    console.error(
      '\n🚫 ACESSO NEGADO: O comando "db:reset" está TERMINANTEMENTE BLOQUEADO fora do ambiente local de desenvolvimento.'
    );
    process.exit(1);
  }

  // 2. Confirmação Interativa Explicita
  console.log('\n⚠️  ESTA AÇÃO IRÁ APAGAR TODAS AS TABELAS DO SCHEMA PUBLIC E REPARTICIONAR AS MIGRAÇÕES!');
  const answer = await askQuestion('👉 Para confirmar o RESET LOCAL, digite "CONFIRMAR" em maiúsculas: ');

  if (answer !== 'CONFIRMAR') {
    console.log('❌ Confirmação incorreta. Operação cancelada com segurança.');
    process.exit(0);
  }

  const sql = postgres(DATABASE_URL);

  try {
    console.log('\n⏳ Limpando o schema public...');
    await sql.unsafe(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);

    console.log('✅ Schema public limpo com sucesso!');

    // Re-executa as migrações para restaurar a estrutura limpa
    console.log('\n⏳ Recriando a estrutura limpa do banco de dados...');
    await sql.end();

    execSync('npm run db:migrate', {
      cwd: path.join(__dirname, '../..'),
      stdio: 'inherit',
    });

    console.log('----------------------------------------------------');
    console.log('🎉 Reset concluído! O banco de dados está zerado e com a estrutura atualizada.');
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Erro durante o reset:', err.message || err);
    await sql.end();
    process.exit(1);
  }
}

resetDb();
