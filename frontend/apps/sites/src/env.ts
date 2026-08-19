import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:8000/v1'),
  NEXT_PUBLIC_BASE_DOMAIN: z.string().default('psiapp.com.br'),
  NEXT_PUBLIC_MAIN_APP_URL: z.string().default('http://localhost:3000'),
});

const _env = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN,
  NEXT_PUBLIC_MAIN_APP_URL: process.env.NEXT_PUBLIC_MAIN_APP_URL,
});

if (!_env.success) {
  console.error('❌ ERRO CRÍTICO DE CONFIGURAÇÃO NO FRONTEND (SITES):', _env.error.format());
}

export const env = _env.success ? _env.data : {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1',
  NEXT_PUBLIC_BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'psiapp.com.br',
  NEXT_PUBLIC_MAIN_APP_URL: process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3000',
};
