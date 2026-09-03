import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { systemStatusLogs } from '../../../shared/schema';
import { getChannel } from '../../../shared/queue';
import { eq, and, gte, sql } from 'drizzle-orm';
import { verifyUserJwt } from '../../../shared/auth';
import { env } from '../../../config/env';

// ──────────────────────────────────────────────────────────────────────────
// Funções de verificação ativa (Self-Checks)
// ──────────────────────────────────────────────────────────────────────────

async function checkDatabase() {
  const start = Date.now();
  try {
    // Executa query simples de ping
    await db.execute(sql`SELECT 1`);
    const duration = Date.now() - start;
    return {
      status: duration > 400 ? 'degraded' as const : 'operational' as const,
      responseTimeMs: duration,
      message: null,
    };
  } catch (err: any) {
    return {
      status: 'down' as const,
      responseTimeMs: Date.now() - start,
      message: err.message || 'Falha ao conectar no banco de dados',
    };
  }
}

async function checkGoTrue() {
  const start = Date.now();
  const gotrueUrl = env.GOTRUE_URL;
  try {
    const res = await fetch(`${gotrueUrl}/health`, {
      method: 'GET',
      // Timeout de 3 segundos para evitar travamento
      signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(3000) : undefined,
    });
    const duration = Date.now() - start;

    if (res.ok) {
      return {
        status: duration > 500 ? 'degraded' as const : 'operational' as const,
        responseTimeMs: duration,
        message: null,
      };
    } else {
      return {
        status: 'down' as const,
        responseTimeMs: duration,
        message: `HTTP Status ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      status: 'down' as const,
      responseTimeMs: Date.now() - start,
      message: err.message || 'Falha ao conectar com o serviço GoTrue',
    };
  }
}

async function checkNginx() {
  const start = Date.now();
  try {
    const res = await fetch('http://nginx:80/health', {
      method: 'GET',
      signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(3000) : undefined,
    });
    const duration = Date.now() - start;
    return {
      status: 'operational' as const,
      responseTimeMs: duration,
      message: null,
    };
  } catch (err: any) {
    return {
      status: 'down' as const,
      responseTimeMs: Date.now() - start,
      message: err.message || 'Falha ao conectar no proxy reverso Nginx',
    };
  }
}

async function checkCoreApi() {
  const start = Date.now();
  try {
    const lagStart = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const eventLoopLag = Date.now() - lagStart;

    const memory = process.memoryUsage();
    const memoryUsagePercent = memory.heapUsed / memory.heapTotal;
    const isDegraded = eventLoopLag > 250 || memoryUsagePercent > 0.95;

    const duration = Date.now() - start;
    return {
      status: isDegraded ? 'degraded' as const : 'operational' as const,
      responseTimeMs: duration,
      message: eventLoopLag > 100 ? `Event Loop Lag: ${eventLoopLag}ms` : null,
    };
  } catch (err: any) {
    return {
      status: 'down' as const,
      responseTimeMs: Date.now() - start,
      message: err.message,
    };
  }
}


// Publica status individual no RabbitMQ
async function publishStatus(
  serviceName: string,
  checkResult: { status: 'operational' | 'degraded' | 'down'; responseTimeMs: number; message: string | null }
) {
  try {
    const channel = await getChannel();
    const payload = {
      serviceName,
      status: checkResult.status,
      responseTimeMs: checkResult.responseTimeMs,
      message: checkResult.message,
    };
    channel.publish(
      'psi.direct',
      'system.status',
      Buffer.from(JSON.stringify(payload))
    );
  } catch (error) {
    console.error(`❌ Erro ao publicar status no RabbitMQ para [${serviceName}]:`, error);
  }
}

// Executa todos os checks e envia para a fila do RabbitMQ
export async function runAllSystemChecks() {
  console.log('🛡️ Iniciando self-checks de saúde do sistema...');
  const [dbRes, gotrueRes, nginxRes, coreApiRes] = await Promise.all([
    checkDatabase(),
    checkGoTrue(),
    checkNginx(),
    checkCoreApi(),
  ]);

  await Promise.all([
    publishStatus('Database', dbRes),
    publishStatus('Auth', gotrueRes),
    publishStatus('API Gateway', nginxRes),
    publishStatus('Core API', coreApiRes),
  ]);
  console.log('🛡️ Self-checks finalizados e publicados.');
}

// Inicia o cron/timer periódico no Fastify
export function startSystemStatusHeartbeats() {
  // Executa o primeiro check imediatamente após iniciar o servidor
  setTimeout(() => runAllSystemChecks(), 5000);

  // Agenda checks a cada 60 segundos
  setInterval(() => {
    runAllSystemChecks().catch(err => console.error('Erro na execução do heartbeat:', err));
  }, 60000);
}


// ──────────────────────────────────────────────────────────────────────────
// Declaração das rotas HTTP no Fastify
// ──────────────────────────────────────────────────────────────────────────

export async function statusRoutes(fastifyApp: FastifyInstance) {
  const fastify = fastifyApp.withTypeProvider<ZodTypeProvider>();

  // GET /v1/platform/status/history
  // Retorna os dados agregados para renderizar a barra de status no frontend
  fastify.get(
    '/status/history',
    {
      schema: {
        querystring: z.object({
          range: z.enum(['24h', '7d']).default('24h'),
        }),
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        verifyUserJwt(authHeader.split(' ')[1]);

        const { range } = request.query;

        // Calcular período inicial
        const hoursLimit = range === '7d' ? 7 * 24 : 24;
        const sinceDate = new Date(Date.now() - hoursLimit * 60 * 60 * 1000);

        // Buscar logs do banco de dados
        const logs = await db.query.systemStatusLogs.findMany({
          where: gte(systemStatusLogs.createdAt, sinceDate),
          orderBy: [systemStatusLogs.createdAt],
        });

        // ── Agrupamento (bucketização) para visualização em barras ──────────
        // Para 24h, usaremos blocos de 30 minutos (48 blocos no total)
        // Para 7d, usaremos blocos de 3 horas (56 blocos no total)
        const bucketSizeMinutes = range === '7d' ? 180 : 30;
        const services = ['Database', 'Auth', 'API Gateway', 'Core API', 'Workers'];

        // Gerar buckets vazios sequenciais para garantir que não haverá gaps
        const nowMs = Date.now();
        const bucketCount = (hoursLimit * 60) / bucketSizeMinutes;
        
        const serviceBuckets: Record<string, { timestamp: string; status: 'operational' | 'degraded' | 'down' | 'no_data'; avgResponseTimeMs: number }[]> = {};

        services.forEach(service => {
          serviceBuckets[service] = [];
          for (let i = bucketCount - 1; i >= 0; i--) {
            const bucketTime = new Date(nowMs - i * bucketSizeMinutes * 60 * 1000);
            serviceBuckets[service].push({
              timestamp: bucketTime.toISOString(),
              status: 'no_data',
              avgResponseTimeMs: 0,
            });
          }
        });

        // Preencher os buckets com os registros reais
        logs.forEach(log => {
          const serviceName = log.serviceName;
          if (!serviceBuckets[serviceName]) return;

          const logTimeMs = new Date(log.createdAt).getTime();
          // Achar em qual bucket este log se encaixa
          const ageMinutes = (nowMs - logTimeMs) / (60 * 1000);
          const bucketIndex = bucketCount - 1 - Math.floor(ageMinutes / bucketSizeMinutes);

          if (bucketIndex >= 0 && bucketIndex < bucketCount) {
            const bucket = serviceBuckets[serviceName][bucketIndex];
            
            // Agrega o status: 'down' ganha de 'degraded', que ganha de 'operational'
            if (bucket.status === 'no_data') {
              bucket.status = log.status;
            } else if (log.status === 'down') {
              bucket.status = 'down';
            } else if (log.status === 'degraded' && bucket.status !== 'down') {
              bucket.status = 'degraded';
            }

            // Média incremental de tempo de resposta
            if (log.responseTimeMs != null) {
              if (bucket.avgResponseTimeMs === 0) {
                bucket.avgResponseTimeMs = log.responseTimeMs;
              } else {
                bucket.avgResponseTimeMs = Math.round((bucket.avgResponseTimeMs + log.responseTimeMs) / 2);
              }
            }
          }
        });

        // ── Validação: Dead Man's Snitch (Queda Silenciosa) ──────────────────
        // Se o último status recebido de qualquer serviço for mais antigo que 2 minutos,
        // o status do último bucket (e status atual) deve ser reportado como 'down'.
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        
        const currentStatus = services.map(service => {
          const serviceLogs = logs.filter(l => l.serviceName === service);
          const lastLog = serviceLogs[serviceLogs.length - 1];
          
          let status: 'operational' | 'degraded' | 'down' | 'offline' = 'offline';
          let responseTimeMs = 0;
          let lastCheckAt = null;

          if (lastLog) {
            const isSilentCrash = new Date(lastLog.createdAt) < twoMinutesAgo;
            status = isSilentCrash ? 'down' as const : lastLog.status;
            responseTimeMs = lastLog.responseTimeMs ?? 0;
            lastCheckAt = lastLog.createdAt.toISOString();

            // Atualiza também o último bucket de visualização se caiu silenciosamente
            const lastBucketIndex = bucketCount - 1;
            if (isSilentCrash && serviceBuckets[service][lastBucketIndex]) {
              serviceBuckets[service][lastBucketIndex].status = 'down';
            }
          }

          return {
            serviceName: service,
            status,
            responseTimeMs,
            lastCheckAt,
          };
        });

        return reply.send({
          range,
          currentStatus,
          history: serviceBuckets,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Erro ao obter logs de status',
          message: err.message || 'Não foi possível buscar logs históricos de status.',
        });
      }
    }
  );

  // POST /v1/platform/status/check
  // Dispara uma verificação manual imediata e retorna o status atualizado
  fastify.post(
    '/status/check',
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        verifyUserJwt(authHeader.split(' ')[1]);

        await runAllSystemChecks();

        return reply.send({
          message: 'Self-checks executados e disparados no RabbitMQ com sucesso!',
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Erro no check manual',
          message: err.message || 'Não foi possível rodar o check de status manualmente.',
        });
      }
    }
  );
}
