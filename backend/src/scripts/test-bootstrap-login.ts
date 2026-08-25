import postgres from 'postgres';
import dotenv from 'dotenv';
import { createGoTrueUser, loginGoTrueUser } from '../shared/auth';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:foxbase_secure_pwd@localhost:5432/postgres?sslmode=disable';
const GOTRUE_URL = process.env.GOTRUE_URL || 'http://localhost:8000/auth/v1';

async function test() {
  const sql = postgres(DATABASE_URL);
  
  console.log('🧹 Limpando usuário antigo de teste...');
  await sql`DELETE FROM public.profiles WHERE email = 'joseaugustholi@gmail.com'`;
  await sql`DELETE FROM auth.users WHERE email = 'joseaugustholi@gmail.com'`;

  const testPassword = 'MinhaSenhaSegura123!';

  console.log('👤 Criando usuário via createGoTrueUser...');
  const created = await createGoTrueUser('joseaugustholi@gmail.com', testPassword, {
    first_name: 'José',
    last_name: 'Augustho',
  }, GOTRUE_URL);
  console.log('✅ Usuário criado no GoTrue! ID:', created.id);

  console.log('🔑 Testando login com loginGoTrueUser...');
  const authData = await loginGoTrueUser('joseaugustholi@gmail.com', testPassword, GOTRUE_URL);
  console.log('🎉 LOGIN REALIZADO COM SUCESSO!');
  console.log('Access Token retornado:', authData.access_token ? 'SIM (OK)' : 'NÃO');

  process.exit(0);
}

test().catch((err) => {
  console.error('❌ Erro no teste de login:', err);
  process.exit(1);
});
