import Fastify from 'fastify';
import socketio from 'socket.io';
import dotenv from 'dotenv';
import { getChannel } from '../../shared/queue';

dotenv.config();

const port = Number(process.env.PORT) || 5000;
const fastify = Fastify({ logger: true });

// Rota de Healthcheck básica
fastify.get('/health', async () => {
  return { status: 'Ok', message: 'Core API active.' };
});

const start = async () => {
  try {
    await fastify.ready();
    const server = fastify.server;

    // Inicializar o Socket.io compartilhando a mesma porta HTTP do Fastify
    // Forçamos o uso do transport 'websocket' para permitir escala horizontal sem sticky sessions
    const io = new socketio.Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket'],
    });

    io.on('connection', (socket) => {
      console.log(`🔌 Cliente conectado via WebSocket: ${socket.id}`);

      socket.on('subscribe', (userId: string) => {
        socket.join(`user:${userId}`);
        console.log(`🚪 Cliente ${socket.id} assinou a sala user:${userId}`);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Cliente desconectado: ${socket.id}`);
      });
    });

    // Iniciar Consumer do RabbitMQ para eventos Realtime (Broadcast)
    try {
      const channel = await getChannel();
      const realtimeExchange = 'realtime.broadcast';
      const q = await channel.assertQueue('', { exclusive: true, autoDelete: true });
      await channel.bindQueue(q.queue, realtimeExchange, '');

      await channel.consume(q.queue, (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            console.log('📢 Evento Realtime recebido do RabbitMQ:', content);

            if (content.userId) {
              io.to(`user:${content.userId}`).emit('realtime-event', content);
            } else {
              io.emit('realtime-event', content);
            }

            channel.ack(msg);
          } catch (err) {
            console.error('❌ Erro ao processar evento realtime:', err);
            channel.nack(msg, false, false);
          }
        }
      });
    } catch (err) {
      console.warn('⚠️ RabbitMQ não disponível na inicialização do realtime consumer. Tentando prosseguir com servidor HTTP.');
    }

    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Fastify API e WebSockets rodando na porta ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
