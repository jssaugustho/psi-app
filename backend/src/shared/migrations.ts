import crypto from 'crypto';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

export interface SchemaVersion {
  id: string;
  version_name: string;
  description: string | null;
  is_current: boolean;
  created_at: Date;
}

export interface SchemaMigration {
  id: string;
  version_name: string;
  filename: string;
  checksum: string;
  sql_content: string;
  execution_time_ms: number;
  executed_at: Date;
}

/**
 * Calcula o hash SHA-256 do conteúdo de um arquivo de migração
 */
export function calculateChecksum(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Busca recursivamente todos os arquivos .sql no diretório de migrações
 */
export interface SqlFileItem {
  filename: string;
  fullPath: string;
}

export function getAllSqlFiles(dir: string): SqlFileItem[] {
  let results: SqlFileItem[] = [];
  if (!fs.existsSync(dir)) return results;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getAllSqlFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.sql')) {
      results.push({
        filename: item.name,
        fullPath: fullPath,
      });
    }
  }

  // Ordena colocando schema_baseline.sql sempre em primeiro lugar, seguido dos arquivos numerados
  return results.sort((a, b) => {
    if (a.filename === 'schema_baseline.sql') return -1;
    if (b.filename === 'schema_baseline.sql') return 1;
    return a.filename.localeCompare(b.filename);
  });
}

/**
 * Garante que as tabelas de controle de versão e migração existam no banco
 */
export async function ensureMigrationTables(sql: postgres.Sql) {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS public.schema_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      version_name text NOT NULL UNIQUE,
      description text,
      is_current boolean NOT NULL DEFAULT false,
      created_at timestamptz DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      version_name text NOT NULL,
      filename text NOT NULL UNIQUE,
      checksum text NOT NULL,
      sql_content text NOT NULL,
      execution_time_ms integer NOT NULL,
      executed_at timestamptz DEFAULT now() NOT NULL
    );
  `);

  // Se não existir nenhuma versão cadastrada, insere a v1.0.0 padrão
  const versions = await sql`SELECT count(*) as count FROM public.schema_versions`;
  if (parseInt(versions[0].count, 10) === 0) {
    await sql`
      INSERT INTO public.schema_versions (version_name, description, is_current)
      VALUES ('v1.0.0', 'Versão Inicial da Plataforma', true)
    `;
  }
}

/**
 * Retorna o nome da versão ativa no sistema
 */
export async function getCurrentVersionName(sql: postgres.Sql): Promise<string> {
  const current = await sql`
    SELECT version_name FROM public.schema_versions 
    WHERE is_current = true 
    ORDER BY created_at DESC 
    LIMIT 1
  `;
  if (current.length > 0) {
    return current[0].version_name;
  }
  return 'v1.0.0';
}

/**
 * Envia notificação para o PostgREST recarregar o cache de schema
 */
export async function notifyPostgrest(sql: postgres.Sql) {
  try {
    await sql.unsafe("NOTIFY pgrst, 'reload schema';");
    console.log('🔄 Sinal enviado ao PostgREST (NOTIFY pgrst, \'reload schema\')');
  } catch (err: any) {
    console.warn('⚠️ Alerta ao notificar PostgREST:', err.message || err);
  }
}

/**
 * Verifica se uma string de conexão é estritamente local (desenvolvimento)
 */
export function isLocalConnectionString(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    const host = url.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === 'postgres' || host === 'host.docker.internal';
  } catch {
    return connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || connectionString.includes('postgres');
  }
}
