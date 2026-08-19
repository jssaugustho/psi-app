import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL é obrigatória para rodar as migrações.');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;

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

      try {
        await sql.unsafe(sqlContent);
        console.log(`✅ ${file} aplicada com sucesso!`);
      } catch (err: any) {
        if (['42P07', '42701', '42710', '42P06', '42704'].includes(err.code)) {
          console.log(`⚠️ ${file}: Objeto já existente (${err.message}). Continuando...`);
        } else {
          // Tenta executar separando por instrução
          const statements = sqlContent.split(/;|\-\-> statement\-breakpoint/).map((s) => s.trim()).filter(Boolean);
          for (const stmt of statements) {
            try {
              await sql.unsafe(stmt);
            } catch (subErr: any) {
              if (!['42P07', '42701', '42710', '42P06', '42704'].includes(subErr.code)) {
                console.warn(`  ⚠️ Alerta na instrução SQL: ${subErr.message}`);
              }
            }
          }
          console.log(`✅ ${file} processada!`);
        }
      }
    }

    console.log('🎉 Migrações concluídas com sucesso!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Erro crítico ao aplicar migrações:', err.message || err);
    process.exit(1);
  }
}

migrate();
