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

export async function publishToQueue(routingKey: string, payload: any): Promise<boolean> {
  try {
    const ch = await getChannel();
    const exchange = 'psi.direct';
    const content = Buffer.from(JSON.stringify(payload));

    return ch.publish(exchange, routingKey, content, {
      persistent: true
    });
  } catch (error) {
    console.error(`❌ Falha ao publicar na fila com routingKey ${routingKey}:`, error);
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
