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

    console.log('✅ Conectado com sucesso ao RabbitMQ.');

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

export async function publishErrorLog(payload: {
  name?: string | null;
  message: string;
  stack?: string | null;
  url?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  serviceName: string;
  severity?: 'error' | 'warning' | 'fatal' | 'info';
  metadata?: Record<string, any> | null;
}): Promise<boolean> {
  return publishToQueue('system.errors', payload);
}

export async function publishAuditLog(payload: {
  action: string;
  category: 'auth' | 'security' | 'config' | 'email' | 'webhook' | 'data';
  serviceName: string;
  status: 'success' | 'failure';
  userId?: string | null;
  workspaceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  details?: Record<string, any> | null;
}): Promise<boolean> {
  return publishToQueue('system.audit', payload);
}


