import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env';
import * as schema from './schema';

const connectionString = env.DATABASE_URL;
const poolSize = Number(process.env.POSTGRES_POOL_SIZE) || 3;

export const sql = postgres(connectionString, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sql, { schema });
