import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:foxbase_secure_pwd@localhost:5432/postgres?sslmode=disable';

const poolSize = Number(process.env.POSTGRES_POOL_SIZE) || 3;

export const sql = postgres(connectionString, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 10,
});
