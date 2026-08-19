import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:8000/v1'),
  NEXT_PUBLIC_POSTGREST_URL: z.string().default('http://localhost:8000/rest/v1'),
});

const _env = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_POSTGREST_URL: process.env.NEXT_PUBLIC_POSTGREST_URL,
});

if (!_env.success) {
  console.error('❌ ERRO CRÍTICO DE CONFIGURAÇÃO NO FRONTEND (ADMIN):', _env.error.format());
}

export const env = _env.success ? _env.data : {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1',
  NEXT_PUBLIC_POSTGREST_URL: process.env.NEXT_PUBLIC_POSTGREST_URL || 'http://localhost:8000/rest/v1',
};
