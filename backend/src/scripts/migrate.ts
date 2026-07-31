import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:foxbase_secure_pwd@localhost:5432/postgres?sslmode=disable';

async function migrate() {
  console.log('📦 Executando migrações SQL do banco de dados...');
  const sql = postgres(DATABASE_URL);

  try {
    const drizzleDir = path.join(__dirname, '../../drizzle');
    const files = fs.readdirSync(drizzleDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`⏳ Aplicando migração: ${file}`);
      const filePath = path.join(drizzleDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      await sql.unsafe(sqlContent);
      console.log(`✅ ${file} aplicada com sucesso!`);
    }

    console.log('🎉 Migrações concluídas com sucesso!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Erro ao aplicar migrações:', err.message || err);
    process.exit(1);
  }
}

migrate();
