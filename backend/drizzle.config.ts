import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ ERRO CRÍTICO: DATABASE_URL não definida para o Drizzle Kit no .env');
  process.exit(1);
}

export default defineConfig({
  schema: './src/shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
