import { env } from '../config/env';
import { getChannel, assertQuorumQueue, log } from '../shared/queue';
import { db } from '../shared/db';
import { systemStatusLogs, logs, auditLogs } from '../shared/schema';
import { lt, sql } from 'drizzle-orm';
import { startDomainVerifyConsumer } from '../consumers/domainVerifyConsumer';
import { startEmailConsumer } from '../consumers/emailConsumer';
import { startDlqConsumer } from '../consumers/dlqConsumer';
import { startRealtimeConsumer } from '../consumers/realtimeConsumer';
import { startPresenceConsumer } from '../consumers/presenceConsumer';

async function main() {
  console.log('⚙️ Inicializando TS Workers...');

  try {
    // Iniciar Consumidor de Verificação de Domínios
    await startDomainVerifyConsumer().catch(err => console.warn('⚠️ Falha ao iniciar consumidor de domínios no worker:', err));

    // Iniciar Consumidor da Máquina de Estado da Presença
    await startPresenceConsumer().catch(err => console.warn('⚠️ Falha ao iniciar consumidor de presença no worker:', err));

    // Iniciar Consumidor Dispatcher Realtime (WebSockets em Lotes Genéricos)
    await startRealtimeConsumer().catch(err => console.warn('⚠️ Falha ao iniciar consumidor dispatcher realtime no worker:', err));

    const channel = await getChannel();


    // Prefetch(1) garante distribuição equilibrada das tarefas entre múltiplos workers
    await channel.prefetch(1);
    console.log('⚖️ Prefetch do canal RabbitMQ configurado para 1.');

    // ── Consumidor: Fila de Status do Sistema ──────────────────────────────────
    const statusQueue = 'system.status';
    const realtimeExchange = 'realtime.broadcast';

    await assertQuorumQueue(statusQueue, statusQueue);
    console.log(`📥 Fila [${statusQueue}] declarada e vinculada.`);

    await channel.consume(statusQueue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString()) as {
          serviceName: string;
          status: 'operational' | 'degraded' | 'down';
          responseTimeMs?: number;
          message?: string | null;
        };

        console.log(`⏱️ Evento de Heartbeat recebido: ${content.serviceName} -> ${content.status}`);

        // 1. Gravar log de status no banco de dados
        const [newLog] = await db
          .insert(systemStatusLogs)
          .values({
            serviceName: content.serviceName,
            status: content.status,
            responseTimeMs: content.responseTimeMs ?? null,
            message: content.message ?? null,
          })
          .returning();

        // 2. Limpar logs mais antigos que 7 dias (pruning automático)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        await db
          .delete(systemStatusLogs)
          .where(lt(systemStatusLogs.createdAt, sql`${sevenDaysAgo}`));

        // 3. Transmitir o evento em tempo real via RabbitMQ fanout exchange para WebSockets
        channel.publish(
          realtimeExchange,
          '',
          Buffer.from(JSON.stringify({ type: 'system_status_update', data: newLog }))
        );

        channel.ack(msg);
      } catch (error: any) {
        console.error('❌ Erro ao processar evento de status:', error);
        await log({
          name: error.name || 'WorkerStatusError',
          type: 'error',
          severity: 'error',
          serviceName: 'workers',
          message: error.message || String(error),
          stack: error.stack,
          metadata: { queue: 'system.status', rawPayload: msg.content.toString() }
        }).catch(pubErr => console.error('Erro ao reportar erro do worker:', pubErr));
        channel.nack(msg, false, false);
      }
    });

    // ── Consumidor: Fila de E-mails Transacionais ──────────────────────────────
    await startEmailConsumer().catch(err => console.warn('⚠️ Falha ao iniciar consumidor de e-mails no worker:', err));

    // ── Consumidor: Fila Única de Logs do Sistema ────────────────────────────
    const logsQueue = 'system.logs';
    await assertQuorumQueue(logsQueue, logsQueue);
    console.log(`📥 Fila de Logs Unificada [${logsQueue}] declarada e vinculada.`);

    await channel.consume(logsQueue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString()) as {
          type?: string | null;
          name?: string | null;
          message: string;
          stack?: string | null;
          url?: string | null;
          clientApp?: string | null;
          userRole?: string | null;
          userAgent?: string | null;
          userId?: string | null;
          workspaceId?: string | null;
          sessionId?: string | null;
          serviceName: string;
          severity?: 'error' | 'warning' | 'fatal' | 'info' | null;
          metadata?: Record<string, any> | null;
        };

        const logType = content.type || 'info';
        console.log(`📝 Log [${logType.toUpperCase()}] recebido do serviço [${content.serviceName}]: ${content.message}`);

        const resolvedClientApp = content.clientApp || (content.metadata as any)?.clientApp || 'unknown';
        const resolvedUserRole = content.userRole || (content.metadata as any)?.userRole || 'anon';

        let insertedLog: any = null;
        try {
          // Gravar log unificado no banco de dados e retornar o registro criado
          [insertedLog] = await db.insert(logs).values({
            type: logType,
            name: content.name ?? null,
            message: content.message,
            stack: content.stack ?? null,
            url: content.url ?? null,
            clientApp: resolvedClientApp,
            userRole: resolvedUserRole,
            userAgent: content.userAgent ?? null,
            userId: content.userId ?? null,
            workspaceId: content.workspaceId ?? null,
            sessionId: content.sessionId ?? null,
            serviceName: content.serviceName,
            severity: content.severity ?? (logType === 'error' ? 'error' : 'info'),
            metadata: content.metadata ?? null,
          }).returning();
        } catch (dbErr: any) {
          console.warn(`⚠️ Falha de FK ao associar userId [${content.userId}]/workspaceId [${content.workspaceId}] no log. Salvando com fallback:`, dbErr.message);
          const fallbackMetadata = {
            ...(content.metadata || {}),
            unlinkedUserId: content.userId ?? null,
            unlinkedWorkspaceId: content.workspaceId ?? null,
            unlinkedSessionId: content.sessionId ?? null,
            dbInsertError: dbErr.message,
          };

          [insertedLog] = await db.insert(logs).values({
            type: logType,
            name: content.name ?? null,
            message: content.message,
            stack: content.stack ?? null,
            url: content.url ?? null,
            clientApp: resolvedClientApp,
            userRole: resolvedUserRole,
            userAgent: content.userAgent ?? null,
            userId: null,
            workspaceId: null,
            sessionId: content.sessionId ?? null,
            serviceName: content.serviceName,
            severity: content.severity ?? (logType === 'error' ? 'error' : 'info'),
            metadata: fallbackMetadata,
          }).returning();
        }

        // Notificar via WebSocket Realtime (global e admin room)
        channel.publish(
          realtimeExchange,
          '',
          Buffer.from(JSON.stringify({ type: 'system_log', data: insertedLog || { type: logType, serviceName: content.serviceName, createdAt: new Date().toISOString() } }))
        );

        channel.ack(msg);
      } catch (error) {
        console.error('❌ Erro ao processar log da fila unificada:', error);
        channel.nack(msg, false, false);
      }
    });

    // ── Consumidor: Fila de Dead Letter (messages.dlq) ───────────────────────
    await startDlqConsumer().catch(err => console.warn('⚠️ Falha ao iniciar consumidor de DLQ no worker:', err));


    // Envia primeiro heartbeat em 5s e depois a cada 60s
    startWorkerHeartbeats(channel);


    console.log('🚀 Worker ativo e consumindo filas.');

  } catch (error) {
    console.error('❌ Falha crítica ao inicializar workers:', error);
    process.exit(1);
  }
}

// ── Função para Enviar Batimentos do Worker ──────────────────────────────────
function startWorkerHeartbeats(channel: any) {
  const checkWorker = async () => {
    const start = Date.now();
    try {
      const lagStart = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const lag = Date.now() - lagStart;

      const memory = process.memoryUsage();
      const memoryUsagePercent = memory.heapUsed / memory.heapTotal;
      const isDegraded = lag > 250 || memoryUsagePercent > 0.95;

      const payload = {
        serviceName: 'Workers',
        status: isDegraded ? ('degraded' as const) : ('operational' as const),
        responseTimeMs: Date.now() - start,
        message: lag > 100 ? `Worker Event Loop Lag: ${lag}ms` : null,
      };

      channel.publish(
        'psi.direct',
        'system.status',
        Buffer.from(JSON.stringify(payload))
      );
    } catch (e: any) {
      console.error('❌ Erro ao enviar heartbeat do Worker:', e);
      log({
        name: e.name || 'WorkerHeartbeatError',
        type: 'error',
        severity: 'error',
        serviceName: 'workers',
        message: e.message || String(e),
        stack: e.stack,
        metadata: { context: 'worker-heartbeat' }
      }).catch(pubErr => console.error('Erro ao reportar falha de heartbeat no RabbitMQ:', pubErr));
    }
  };

  setTimeout(() => {
    checkWorker().catch(err => console.error(err));
  }, 5000);

  setInterval(() => {
    checkWorker().catch(err => console.error(err));
  }, 60000);
}

main();
