import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL é obrigatória para o script fix-user-role.');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  console.log('🔄 Conectando ao banco de dados para corrigir role do usuário...');
  const sql = postgres(DATABASE_URL);

  try {
    const result = await sql.unsafe(`
      UPDATE auth.users 
      SET role = 'authenticated' 
      WHERE role IS NULL OR role = '';
    `);
    
    console.log('✅ Role dos usuários atualizada com sucesso para "authenticated"!');
    console.log('Resultado:', result);
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Erro ao atualizar role no banco:', err.message || err);
    process.exit(1);
  }
}

main();
