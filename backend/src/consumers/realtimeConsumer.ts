/**
 * realtimeConsumer.ts
 *
 * Consumidor Dispatcher Realtime Global 100% Genérico.
 *
 * Recursos:
 *   - Consumo da fila `realtime.events`
 *   - Micro-Batching puro (agrupamento de qualquer evento em janelas de 50ms)
 *   - Isento de regras de negócio ou checagens de domínio
 *   - Publicação de lotes no Exchange Fanout `realtime.broadcast` para entrega aos WebSockets
 */

import { getChannel, assertQuorumQueue, publishRealtime, log } from '../shared/queue';

const QUEUE_NAME = 'realtime.events';
const ROUTING_KEY = 'realtime.events';

// Buffer e controle de Micro-Batching (50ms)
let batchBuffer: any[] = [];
let batchTimer: NodeJS.Timeout | null = null;
const BATCH_FLUSH_INTERVAL_MS = 50;
const MAX_BATCH_SIZE = 100;

function flushBatchBuffer() {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  if (batchBuffer.length === 0) return;

  const eventsToDispatch = [...batchBuffer];
  batchBuffer = [];

  if (eventsToDispatch.length === 1) {
    publishRealtime(eventsToDispatch[0]);
  } else {
    publishRealtime({
      type: 'realtime_batch',
      events: eventsToDispatch,
    });
  }
}

function enqueueForBroadcast(event: any) {
  batchBuffer.push(event);

  if (batchBuffer.length >= MAX_BATCH_SIZE) {
    flushBatchBuffer();
  } else if (!batchTimer) {
    batchTimer = setTimeout(flushBatchBuffer, BATCH_FLUSH_INTERVAL_MS);
  }
}

export async function startRealtimeConsumer(): Promise<void> {
  try {
    await assertQuorumQueue(QUEUE_NAME, ROUTING_KEY);
    const channel = await getChannel();

    await channel.prefetch(100);
    console.log(`📥 Consumidor Dispatcher Realtime (Genérico Lotes) ativado na fila [${QUEUE_NAME}].`);

    await channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        enqueueForBroadcast(payload);
        channel.ack(msg);
      } catch (error: any) {
        console.error('❌ Erro no Dispatcher Realtime Worker:', error);

        await log({
          name: error.name || 'RealtimeConsumerError',
          type: 'error',
          severity: 'error',
          serviceName: 'workers',
          message: error.message || String(error),
          stack: error.stack,
          metadata: { queue: QUEUE_NAME },
        }).catch(() => {});

        channel.nack(msg, false, false);
      }
    });

    console.log(`✅ Consumidor Dispatcher Realtime [${QUEUE_NAME}] pronto.`);
  } catch (err: any) {
    console.error(`❌ Erro ao iniciar consumidor Dispatcher Realtime [${QUEUE_NAME}]:`, err);
    throw err;
  }
}
