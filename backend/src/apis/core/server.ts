import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import socketio from 'socket.io';
import dotenv from 'dotenv';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { getChannel, publishRealtime } from '../../shared/queue';
import { authRoutes } from './routes/auth';
import { platformRoutes } from './routes/platform';
import { statusRoutes, startSystemStatusHeartbeats } from './routes/status';
import { crmRoutes } from './routes/crm';
import { sql } from '../../shared/db';

dotenv.config();

const port = Number(process.env.PORT) || 5000;

// Inicializar Fastify com o ZodTypeProvider
const fastify = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Registrar suporte a multipart/form-data (uploads de até 10MB)
fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

// Registrar suporte a CORS para o frontend Next.js (http://localhost:3000 e http://localhost:3001)
fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-service-secret'],
});

// Rota de Healthcheck básica e detalhada
fastify.get('/health', async () => {
  let dbStatus = 'operational';
  let queueStatus = 'operational';

  // 1. Verificar Banco de Dados
  try {
    await sql`SELECT 1`;
  } catch (err) {
    dbStatus = 'down';
  }

  // 2. Verificar Fila (RabbitMQ)
  try {
    const channel = await getChannel();
    if (!channel) {
      queueStatus = 'down';
    }
  } catch (err) {
    queueStatus = 'down';
  }

  const overallStatus = (dbStatus === 'operational' && queueStatus === 'operational') ? 'operational' : 'degraded';

  return {
    status: overallStatus,
    services: {
      api: 'operational',
      database: dbStatus,
      queue: queueStatus
    }
  };
});

// Registrar rotas
fastify.register(authRoutes, { prefix: '/auth' });
fastify.register(platformRoutes, { prefix: '/platform' });
fastify.register(statusRoutes, { prefix: '/platform' });
fastify.register(crmRoutes, { prefix: '/crm' });

const start = async () => {
  try {
    await fastify.ready();
    const server = fastify.server;

    // Estrutura em memória para presença de usuários
    interface PresenceUser {
      userId: string;
      nome: string;
      sobrenome: string;
      email: string;
      avatarUrl: string | null;
      path: string;
      lastSeen: number;
    }

    const globalPresence = new Map<string, Map<string, PresenceUser>>();

    function handlePresenceEvent(event: any) {
      const { tenantId, userId, action, data } = event;
      if (!tenantId || !userId) return;

      if (action === 'leave') {
        globalPresence.get(tenantId)?.delete(userId);
        return;
      }

      if (!globalPresence.has(tenantId)) {
        globalPresence.set(tenantId, new Map());
      }

      globalPresence.get(tenantId)!.set(userId, {
        ...data,
        lastSeen: Date.now(),
      });
    }

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
      let currentUserId: string | null = null;
      let currentTenantId: string | null = null;

      socket.on('subscribe', (data: { userId: string; tenantId: string }) => {
        if (!data || !data.userId || !data.tenantId) return;
        currentUserId = data.userId;
        currentTenantId = data.tenantId;

        socket.join(`user:${data.userId}`);
        socket.join(`tenant:${data.tenantId}`);
        console.log(`🚪 Cliente ${socket.id} assinou user:${data.userId} e tenant:${data.tenantId}`);
      });

      socket.on('presence-pulse', (data: any) => {
        if (!data || !data.userId || !data.tenantId) return;

        // Publica o pulso no RabbitMQ para sincronizar em todas as instâncias da API
        publishRealtime({
          entity: 'presence',
          action: 'heartbeat',
          tenantId: data.tenantId,
          userId: data.userId,
          data: {
            userId: data.userId,
            nome: data.nome,
            sobrenome: data.sobrenome,
            email: data.email,
            avatarUrl: data.avatarUrl,
            path: data.path,
          },
        });
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Cliente desconectado: ${socket.id}`);
        if (currentUserId && currentTenantId) {
          publishRealtime({
            entity: 'presence',
            action: 'leave',
            tenantId: currentTenantId,
            userId: currentUserId,
            data: { userId: currentUserId },
          });
        }
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

            if (content.entity === 'presence') {
              handlePresenceEvent(content);
            } else {
              // Eventos de negócios (leads, etc.)
              if (content.userId) {
                io.to(`user:${content.userId}`).emit('realtime-event', content);
              } else if (content.tenantId) {
                io.to(`tenant:${content.tenantId}`).emit('realtime-event', content);
              } else {
                io.emit('realtime-event', content);
              }
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

    // Limpeza periódica de presença inativa e transmissão da lista para cada tenant
    setInterval(() => {
      const now = Date.now();
      const expirationMs = 25 * 1000; // 25s sem pulso = offline

      for (const [tenantId, usersMap] of globalPresence.entries()) {
        let hasChanges = false;
        for (const [userId, user] of usersMap.entries()) {
          if (now - user.lastSeen > expirationMs) {
            usersMap.delete(userId);
            hasChanges = true;
          }
        }

        // Transmite a lista atualizada de presença para a sala do Tenant
        const activeUsersList = Array.from(usersMap.values()).map(({ lastSeen, ...u }) => u);
        io.to(`tenant:${tenantId}`).emit('presence-list', activeUsersList);

        if (usersMap.size === 0) {
          globalPresence.delete(tenantId);
        }
      }
    }, 10000); // Executa a cada 10 segundos

    // Iniciar Ouvinte (LISTEN) de Eventos do PostgreSQL e repassar para o RabbitMQ
    try {
      await sql.listen('realtime_events', (payload) => {
        try {
          const parsed = JSON.parse(payload);
          console.log('⚡ Evento recebido via pg_notify:', parsed);
          publishRealtime(parsed);
        } catch (err) {
          console.error('❌ Erro ao repassar evento do Postgres para o RabbitMQ:', err);
        }
      });
      console.log('✅ Escuta de eventos pg_notify ativa no canal [realtime_events].');
    } catch (err) {
      console.error('❌ Falha ao iniciar ouvinte pg_notify:', err);
    }

    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Fastify API e WebSockets rodando na porta ${port}`);

    // Iniciar rotina periódica de auto-verificação do sistema (heartbeats)
    startSystemStatusHeartbeats();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
