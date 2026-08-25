import postgres from 'postgres';
import dotenv from 'dotenv';
import { createGoTrueUser, loginGoTrueUser } from '../shared/auth';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:foxbase_secure_pwd@localhost:5432/postgres?sslmode=disable';
const GOTRUE_URL = process.env.GOTRUE_URL || 'http://localhost:8000/auth/v1';

async function runTest() {
  const sql = postgres(DATABASE_URL);

  const testCases = [
    { email: 'joseaugustholi@gmail.com', password: '12345678password' },
    { email: 'JoseAugusthoLi@gmail.com', password: '12345678password' },
    { email: 'test_user_password_hash@gmail.com', password: 'SenhaCom$pec!al#123' },
  ];

  for (const tc of testCases) {
    console.log(`\n--------------------------------------------------`);
    console.log(`🧪 Testando caso: Email="${tc.email}" | Password="${tc.password}"`);

    await sql`DELETE FROM auth.users WHERE lower(email) = lower(${tc.email.trim()})`;

    try {
      // 1. Criar usuário no GoTrue
      const created = await createGoTrueUser(tc.email, tc.password, {}, GOTRUE_URL);
      console.log('✅ Usuário criado no GoTrue ID:', created.id);

      // Inspect DB
      const dbUser = await sql`SELECT email, encrypted_password, confirmed_at, role, aud FROM auth.users WHERE id = ${created.id}`;
      console.log('📊 Dados no Postgres:', dbUser[0]);

      // 2. Tentar Login com EMAIL EXACT MATCH
      try {
        const loginExact = await loginGoTrueUser(tc.email, tc.password, GOTRUE_URL);
        console.log('🎉 Login com email EXATO: SUCESSO!');
      } catch (err: any) {
        console.error('❌ Login com email EXATO: FALHOU ->', err.message);
      }

      // 3. Tentar Login com EMAIL LOWERCASE
      try {
        const loginLower = await loginGoTrueUser(tc.email.toLowerCase().trim(), tc.password, GOTRUE_URL);
        console.log('🎉 Login com email LOWERCASE: SUCESSO!');
      } catch (err: any) {
        console.error('❌ Login com email LOWERCASE: FALHOU ->', err.message);
      }
    } catch (err: any) {
      console.error('❌ Falha na criação:', err.message);
    }
  }

  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Erro inesperado:', err);
  process.exit(1);
});
