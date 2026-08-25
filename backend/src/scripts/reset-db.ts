import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:foxbase_secure_pwd@localhost:5432/postgres?sslmode=disable';

async function resetDb() {
  console.log('🧹 Limpando todos os dados do banco de dados (Public e Auth)...');
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
    console.log('✅ Tabelas do schema public zeradas!');

    await sql.unsafe(`
      TRUNCATE TABLE 
        auth.users, 
        auth.refresh_tokens 
      CASCADE;
    `);
    console.log('✅ Tabelas do schema auth zeradas!');

    console.log('🎉 Banco de dados limpo e pronto para o primeiro Setup!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Erro ao zerar o banco:', err.message || err);
    process.exit(1);
  }
}

resetDb();
