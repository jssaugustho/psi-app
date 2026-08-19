import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Carrega o arquivo .env da raiz do backend se presente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL é obrigatória.' })
    .min(1, 'DATABASE_URL não pode estar vazia.'),
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET é obrigatório.' })
    .min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres para garantir a segurança dos tokens.'),
  SERVICE_SECRET_KEY: z
    .string({ required_error: 'SERVICE_SECRET_KEY é obrigatória.' })
    .min(16, 'SERVICE_SECRET_KEY deve ter no mínimo 16 caracteres.'),
  RABBITMQ_URL: z
    .string({ required_error: 'RABBITMQ_URL é obrigatória.' })
    .min(1, 'RABBITMQ_URL não pode estar vazia.'),
  GOTRUE_URL: z
    .string({ required_error: 'GOTRUE_URL é obrigatória.' })
    .url('GOTRUE_URL deve ser uma URL válida (ex: http://gotrue:9999 ou http://localhost:8000/auth/v1).'),
  GOTRUE_SITE_URL: z.string().url().optional(),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('\n❌ =========================================================');
  console.error('❌ ERRO CRÍTICO: Variáveis de Ambiente ausentes ou inválidas');
  console.error('❌ =========================================================\n');
  
  const formattedErrors = parseResult.error.format();
  Object.entries(formattedErrors).forEach(([key, value]) => {
    if (key !== '_errors' && value && '_errors' in value && value._errors.length > 0) {
      console.error(`  • ${key}: ${value._errors.join(', ')}`);
    }
  });

  console.error('\nPor favor, verifique e preencha o seu arquivo .env com base no .env.example.\n');
  process.exit(1);
}

export const env = parseResult.data;
