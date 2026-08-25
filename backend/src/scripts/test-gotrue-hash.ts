import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:foxbase_secure_pwd@localhost:5432/postgres?sslmode=disable';
const GOTRUE_URL = process.env.GOTRUE_URL || 'http://localhost:8000/auth/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'psi_super_secret_jwt_token_for_local_dev_32_chars';

import jwt from 'jsonwebtoken';

async function testGoTrueHash() {
  const sql = postgres(DATABASE_URL);
  const testEmail = 'gotrue_hash_test@example.com';
  const testPassword = 'MinhaSenhaSegura123!';

  console.log('🧹 Limpando usuário antigo de teste...');
  await sql`DELETE FROM auth.users WHERE email = ${testEmail}`;

  // 1. Gerar token service_role para GoTrue Admin API
  const adminToken = jwt.sign({ role: 'service_role', iss: 'supabase' }, JWT_SECRET);

  console.log('🚀 1. Criando usuário no GoTrue via POST /admin/users...');
  const createRes = await fetch(`${GOTRUE_URL}/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { first_name: 'Test', last_name: 'User' },
    }),
  });

  const createBody = await createRes.json();
  console.log(`Status de Criação: ${createRes.status}`, createBody);

  if (!createRes.ok) {
    console.error('❌ Falha ao criar usuário no GoTrue');
    process.exit(1);
  }

  // 2. Inspecionar o registro no PostgreSQL
  const rows = await sql`SELECT id, email, encrypted_password, confirmed_at, email_confirmed_at, role, aud FROM auth.users WHERE email = ${testEmail}`;
  console.log('📊 Registro no Banco de Dados auth.users:', rows[0]);

  // 3. Tentar fazer Login via GoTrue POST /token?grant_type=password
  console.log('🔑 2. Tentando login via POST /token?grant_type=password...');
  const loginRes = await fetch(`${GOTRUE_URL}/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  const loginBody = await loginRes.json();
  console.log(`Status do Login: ${loginRes.status}`, loginBody);

  if (loginRes.ok) {
    console.log('🎉 SUCESSO ABSOLUTO NO LOGIN!');
  } else {
    console.error('❌ FALHA NO LOGIN:', loginBody);
  }

  process.exit(0);
}

testGoTrueHash().catch((err) => {
  console.error('❌ Erro no teste:', err);
  process.exit(1);
});
