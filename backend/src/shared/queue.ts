import * as amqp from 'amqplib';
import { env } from '../config/env';

const rabbitmqUrl = env.RABBITMQ_URL;

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;

let connection: AmqpConnection | null = null;
let channel: AmqpChannel | null = null;

export async function getChannel(): Promise<AmqpChannel> {
  if (channel) return channel;

  try {
    const conn = await amqp.connect(rabbitmqUrl);
    const ch = await conn.createChannel();

    // Configuração de Dead Letter Exchange padrão (Quorum Queue)
    const deadLetterExchange = 'psi.dlx';
    const deadLetterQueue = 'messages.dlq';

    await ch.assertExchange(deadLetterExchange, 'direct', { durable: true });
    await ch.assertQueue(deadLetterQueue, {
      durable: true,
      arguments: { 'x-queue-type': 'quorum' }
    });
    await ch.bindQueue(deadLetterQueue, deadLetterExchange, 'dead-letter');

    // Exchange Direct Principal
    const exchange = 'psi.direct';
    await ch.assertExchange(exchange, 'direct', { durable: true });

    // Exchange Fanout para mensagens Realtime Broadcast
    const realtimeExchange = 'realtime.broadcast';
    await ch.assertExchange(realtimeExchange, 'fanout', { durable: true });

    // Garantir a declaração prévia de todas as filas principais para evitar descarte em exchanges sem binding
    const coreQueues = [
      { name: 'system.logs', routingKey: 'system.logs' },
      { name: 'system.status', routingKey: 'system.status' },
      { name: 'email.transactional', routingKey: 'email.transactional' },
      { name: 'presence.events', routingKey: 'presence.events' },
      { name: 'realtime.events', routingKey: 'realtime.events' }
    ];

    for (const q of coreQueues) {
      await ch.assertQueue(q.name, {
        durable: true,
        deadLetterExchange,
        deadLetterRoutingKey: 'dead-letter',
        arguments: { 'x-queue-type': 'quorum' }
      });
      await ch.bindQueue(q.name, exchange, q.routingKey);
    }

    console.log('✅ Conectado com sucesso ao RabbitMQ e filas principais vinculadas.');

    connection = conn;
    channel = ch;
    return ch;
  } catch (error) {
    console.error('❌ Erro ao conectar no RabbitMQ:', error);
    throw error;
  }
}

export async function assertQuorumQueue(queueName: string, routingKey: string): Promise<void> {
  const ch = await getChannel();
  const exchange = 'psi.direct';
  const deadLetterExchange = 'psi.dlx';

  await ch.assertQueue(queueName, {
    durable: true,
    deadLetterExchange,
    deadLetterRoutingKey: 'dead-letter',
    arguments: { 'x-queue-type': 'quorum' }
  });
  await ch.bindQueue(queueName, exchange, routingKey);
}

// ── Buffer em Memória para Resiliência (Zero DB no Path Crítico) ───────────
const MAX_BUFFER_SIZE = 1000;
interface BufferedItem {
  routingKey: string;
  payload: any;
  addedAt: number;
}
const memoryBuffer: BufferedItem[] = [];

function pushToMemoryBuffer(routingKey: string, payload: any) {
  if (memoryBuffer.length >= MAX_BUFFER_SIZE) {
    memoryBuffer.shift(); // Remove o item mais antigo (FIFO) para limitar o uso de RAM
  }
  memoryBuffer.push({ routingKey, payload, addedAt: Date.now() });
}

export async function flushMemoryBuffer(): Promise<number> {
  if (memoryBuffer.length === 0) return 0;

  let flushedCount = 0;
  try {
    const ch = await getChannel();
    if (!ch) return 0;

    const exchange = 'psi.direct';
    while (memoryBuffer.length > 0) {
      const item = memoryBuffer[0];
      const content = Buffer.from(JSON.stringify(item.payload));
      const sent = ch.publish(exchange, item.routingKey, content, { persistent: true });
      if (sent) {
        memoryBuffer.shift();
        flushedCount++;
      } else {
        break; // Conexão/canal indisponível, mantém no buffer para próxima tentativa
      }
    }
  } catch {
    // Falha de reconexão; itens continuam preservados no buffer
  }

  return flushedCount;
}

// Timer de background no processo Node para tentar esvaziar o buffer a cada 5 segundos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    flushMemoryBuffer().catch(() => {});
  }, 5000);
}

export async function publishToQueue(routingKey: string, payload: any): Promise<boolean> {
  try {
    const ch = await getChannel();
    const exchange = 'psi.direct';
    const content = Buffer.from(JSON.stringify(payload));

    const published = ch.publish(exchange, routingKey, content, {
      persistent: true
    });

    if (!published) {
      pushToMemoryBuffer(routingKey, payload);
    }
    return published;
  } catch (error) {
    console.error(`❌ Falha ao publicar na fila [${routingKey}]. Armazenando em memória:`, error);
    pushToMemoryBuffer(routingKey, payload);
    return false;
  }
}

export async function publishPresenceEvent(payload: any): Promise<boolean> {
  return publishToQueue('presence.events', payload);
}

export async function publishRealtimeEvent(payload: any): Promise<boolean> {
  return publishToQueue('realtime.events', payload);
}

export async function publishRealtime(payload: any): Promise<boolean> {
  try {
    const ch = await getChannel();
    const exchange = 'realtime.broadcast';
    const content = Buffer.from(JSON.stringify(payload));

    return ch.publish(exchange, '', content);
  } catch (error) {
    console.error(`❌ Falha ao fazer broadcast de realtime:`, error);
    return false;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id.trim());
}

export interface LogPayload {
  name?: string | null;
  type?: 'error' | 'audit' | 'info' | 'system' | 'warn' | 'dlq' | 'http' | string;
  severity?: 'error' | 'warning' | 'fatal' | 'info' | 'debug';
  serviceName: string;
  message: string;
  stack?: string | null;
  url?: string | null;
  clientApp?: string | null;
  userRole?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  workspaceId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, any> | null;
}

export async function log(payload: LogPayload): Promise<boolean> {
  const isErrorEvent =
    Boolean(payload.stack) ||
    Boolean(payload.name && (payload.name.toLowerCase().includes('error') || payload.name.toLowerCase().includes('fail'))) ||
    payload.severity === 'error' ||
    payload.severity === 'fatal' ||
    payload.type === 'error';

  const defaultType = isErrorEvent ? 'error' : (payload.type || 'info');
  const defaultSeverity = isErrorEvent
    ? (payload.severity === 'fatal' ? 'fatal' : 'error')
    : (payload.severity || (defaultType === 'error' ? 'error' : 'info'));

  const sanitized: LogPayload = {
    ...payload,
    name: payload.name || (isErrorEvent ? 'system.error' : 'system.event'),
    type: defaultType,
    severity: defaultSeverity,
    clientApp: payload.clientApp || (payload.metadata as any)?.clientApp || 'unknown',
    userRole: payload.userRole || (payload.metadata as any)?.userRole || 'anon',
  };

  if (sanitized.userId && !isValidUuid(sanitized.userId)) {
    sanitized.metadata = {
      ...(sanitized.metadata || {}),
      unlinkedUserId: sanitized.userId,
    };
    sanitized.userId = null;
  }

  if (sanitized.workspaceId && !isValidUuid(sanitized.workspaceId)) {
    sanitized.metadata = {
      ...(sanitized.metadata || {}),
      unlinkedWorkspaceId: sanitized.workspaceId,
    };
    sanitized.workspaceId = null;
  }

  if (sanitized.sessionId && !isValidUuid(sanitized.sessionId)) {
    sanitized.metadata = {
      ...(sanitized.metadata || {}),
      unlinkedSessionId: sanitized.sessionId,
    };
    sanitized.sessionId = null;
  }

  return publishToQueue('system.logs', sanitized);
}

// Alias universal para retrocompatibilidade
export const publishLog = log;




