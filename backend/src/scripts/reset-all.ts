import readline from 'readline';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:foxbase_secure_pwd@localhost:5432/postgres?sslmode=disable';

async function resetAll() {
  const isForce = process.argv.includes('-y') || process.argv.includes('--force');

  if (!isForce) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        '\n⚠️  ATENÇÃO: Esta ação irá ZERAR permanentemente TODAS as tabelas dos schemas public e auth!\n' +
        'Deseja realmente prosseguir? Digite "y" para confirmar: ',
        (ans) => {
          rl.close();
          resolve(ans.trim());
        }
      );
    });

    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Operação cancelada pelo usuário. O banco de dados NÃO foi alterado.\n');
      process.exit(0);
    }
  }

  console.log('\n🧹 Limpando todos os dados dos schemas public e auth...');
  const sql = postgres(DATABASE_URL);

  try {
    await sql.unsafe(`
      TRUNCATE TABLE 
        public.profiles, 
        public.workspaces, 
        public.workspace_members, 
        public.workspace_domains, 
        public.visual_identities, 
        public.platform_settings, 
        public.email_logs, 
        public.system_status_logs 
      CASCADE;
    `);
    console.log('✅ Tabelas do schema public zeradas com sucesso!');

    await sql.unsafe(`
      TRUNCATE TABLE 
        auth.users, 
        auth.refresh_tokens 
      CASCADE;
    `);
    console.log('✅ Tabelas do schema auth zeradas com sucesso!');

    console.log('🎉 Banco de dados zerado com sucesso e pronto para o primeiro Setup!\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Erro ao zerar o banco de dados:', err.message || err);
    process.exit(1);
  }
}

resetAll();
