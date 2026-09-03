import { env } from '../../config/env';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import socketio from 'socket.io';
import cookie from '@fastify/cookie';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import crypto from 'crypto';
import { getChannel, publishRealtime, publishRealtimeEvent, publishPresenceEvent, log } from '../../shared/queue';
import { extractJwtFromRequest, verifyUserJwt, extractUserAndSessionFromToken } from '../../shared/auth';
import { authRoutes } from './routes/auth';
import { platformRoutes } from './routes/platform';
import { statusRoutes, startSystemStatusHeartbeats } from './routes/status';
import { crmRoutes } from './routes/crm';
import { captacaoRoutes } from './routes/captacao';
import { formsRoutes } from './routes/forms';
import { sql, db } from '../../shared/db';
import { profiles } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { startDomainVerifyConsumer } from '../../consumers/domainVerifyConsumer';


const port = env.PORT;

// Inicializar Fastify com o ZodTypeProvider
const fastify = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Registrar suporte a cookies HttpOnly
fastify.register(cookie, {
  secret: env.JWT_SECRET,
});

// Registrar suporte a multipart/form-data (uploads de até 10MB)
fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

// Registrar suporte a CORS com suporte a cookies (credentials: true)
fastify.register(cors, {
  origin: (origin, cb) => {
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.theraos.app') || origin.endsWith('.ajstrategy.digital')) {
      cb(null, true);
      return;
    }
    cb(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-service-secret', 'x-webhook-secret', 'x-secret', 'X-Webhook-Secret', 'X-Secret'],
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

// ── Hook Global: Rastreabilidade de Requisição (requestId, userId, sessionId, clientApp, userRole) ─
fastify.addHook('onRequest', async (request, reply) => {
  const reqIdHeader = (request.headers['x-request-id'] || request.headers['X-Request-ID']) as string | undefined;
  const requestId = reqIdHeader && reqIdHeader.trim() ? reqIdHeader.trim() : crypto.randomUUID();

  const rawClientApp = (request.headers['x-client-app'] || request.headers['X-Client-App']) as string | undefined;
  const clientApp = rawClientApp && rawClientApp.trim() ? rawClientApp.trim().toLowerCase() : 'unknown';

  const rawClientUrl = (request.headers['x-client-url'] || request.headers['X-Client-Url'] || request.headers['referer'] || request.headers['Referer']) as string | undefined;
  const clientUrl = rawClientUrl && rawClientUrl.trim() ? rawClientUrl.trim() : request.url;

  (request.raw as any).requestId = requestId;
  (request.raw as any).clientApp = clientApp;
  (request.raw as any).clientUrl = clientUrl;
  (request.raw as any).userRole = 'anon';
  (request.raw as any).startTime = Date.now();

  const token = extractJwtFromRequest(request);
  if (token) {
    const { userId, sessionId, userRole } = extractUserAndSessionFromToken(token);
    (request.raw as any).userId = userId;
    (request.raw as any).sessionId = sessionId;
    if (userRole) {
      (request.raw as any).userRole = userRole;
    }
  }

  reply.header('X-Request-ID', requestId);
});

// ── Hook Global: Log de Acesso HTTP (onResponse) ────────────────────────────
fastify.addHook('onResponse', async (request, reply) => {
  if (request.url === '/v1/status/health' || request.url === '/status/health') {
    return;
  }

  const durationMs = Date.now() - ((request.raw as any).startTime || Date.now());
  const requestId = (request.raw as any).requestId || null;
  const userId = (request.raw as any).userId || null;
  const sessionId = (request.raw as any).sessionId || null;
  const clientApp = (request.raw as any).clientApp || 'unknown';
  const userRole = (request.raw as any).userRole || 'anon';
  const clientUrl = (request.raw as any).clientUrl || request.url;

  log({
    name: 'http.access',
    type: 'http',
    severity: reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warning' : 'info',
    serviceName: 'core-api',
    message: `Requisição HTTP ${request.method} ${request.url} finalizada com status ${reply.statusCode} em ${durationMs}ms.`,
    userId,
    sessionId,
    clientApp,
    userRole,
    url: clientUrl,
    userAgent: (request.headers['user-agent'] as string) || null,
    metadata: {
      requestId,
      sessionId,
      clientApp,
      userRole,
      method: request.method,
      statusCode: reply.statusCode,
      durationMs,
      ip: request.ip,
      path: request.url,
    },
  }).catch(() => {});
});

// Manipulador global de erros da API (Fastify)
fastify.setErrorHandler(async (error, request, reply) => {
  request.log.error(error);

  const requestId = (request.raw as any).requestId || null;
  const userId = (request.raw as any).userId || null;
  const sessionId = (request.raw as any).sessionId || null;
  const clientApp = (request.raw as any).clientApp || 'unknown';
  const userRole = (request.raw as any).userRole || 'anon';
  const clientUrl = (request.raw as any).clientUrl || request.url;

  // Detecta se é erro de banco de dados/Postgres
  let serviceName = 'core-api';
  if (
    error.name === 'PostgresError' ||
    (error as any).code ||
    error.stack?.includes('drizzle-orm') ||
    error.stack?.includes('postgres-js')
  ) {
    serviceName = 'postgres';
  }

  // Enfileira o erro no RabbitMQ via funcao universal log
  await log({
    type: 'error',
    name: error.name || 'api.global_error',
    message: `Erro não tratado na rota [${request.method} ${request.url}]: ${error.message || 'Erro interno na API'}`,
    stack: error.stack,
    url: clientUrl,
    clientApp,
    userRole,
    userAgent: request.headers['user-agent'] || null,
    userId,
    sessionId,
    serviceName,
    severity: 'error',
    metadata: {
      requestId,
      sessionId,
      clientApp,
      userRole,
      method: request.method,
      statusCode: error.statusCode || 500,
      ip: request.ip,
      errorName: error.name,
    },
  }).catch((pubErr) => {
    request.log.error('Erro ao publicar log de erro no RabbitMQ:', pubErr);
  });

  // Retorna resposta amigável ao cliente
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    error: error.name || 'InternalServerError',
    message: error.message || 'Ocorreu um erro interno no servidor.',
  });
});

// Registrar rotas
fastify.register(authRoutes, { prefix: '/auth' });
fastify.register(platformRoutes, { prefix: '/platform' });
fastify.register(statusRoutes, { prefix: '/platform' });
fastify.register(crmRoutes, { prefix: '/crm' });
fastify.register(crmRoutes, { prefix: '/v1/crm' });
fastify.register(captacaoRoutes, { prefix: '/crm/captacao' });
fastify.register(formsRoutes, { prefix: '/crm/forms' });

const start = async () => {
  try {
    await fastify.ready();
    const server = fastify.server;

    // Estrutura em memória para presença de usuários
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

        // Solicita sincronização imediata de presença para a nova conexão
        publishPresenceEvent({
          entity: 'presence',
          action: 'subscribe',
          tenantId: data.tenantId,
          userId: data.userId,
        });
      });

      // Assinatura autenticada com verificação de perfil 'admin' para Logs de Erro do Sistema
      socket.on('subscribe-admin-logs', async (data: { token?: string }) => {
        try {
          const token = data?.token || socket.handshake.auth?.token;
          if (!token) {
            socket.emit('error', { message: 'Token JWT de autenticação não fornecido.' });
            return;
          }

          const decoded = verifyUserJwt(token);
          if (!decoded || !decoded.sub) {
            socket.emit('error', { message: 'Token JWT inválido ou expirado.' });
            return;
          }

          const userProfile = await db.query.profiles.findFirst({
            where: eq(profiles.id, decoded.sub),
          });

          if (userProfile?.role !== 'admin') {
            socket.emit('error', { message: 'Acesso negado. Restrito a administradores.' });
            return;
          }

          socket.join('platform:admin_logs');
          console.log(`🛡️ Cliente admin ${socket.id} (User: ${decoded.sub}) assinou a sala [platform:admin_logs]`);
          socket.emit('subscribed-admin-logs', { success: true });
        } catch (err: any) {
          console.warn(`⚠️ Tentativa não autorizada de assinar logs via WebSocket (${socket.id}):`, err.message || err);
          socket.emit('error', { message: 'Falha na autenticação do socket de logs.' });
        }
      });

      socket.on('presence-pulse', (data: any) => {
        if (!data || !data.userId || !data.tenantId) return;

        // Enfileira o pulso de presença para a Engine de Presença dedicada
        publishPresenceEvent({
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
          publishPresenceEvent({
            entity: 'presence',
            action: 'leave',
            tenantId: currentTenantId,
            userId: currentUserId,
            data: { userId: currentUserId },
          });
        }
      });
    });

    // Função auxiliar para despachar cada item individual ou de um lote aos sockets
    const dispatchRealtimeItem = (item: any) => {
      if (!item) return;

      if (item.type === 'system_error' || item.type === 'system_audit' || item.type === 'system_log') {
        io.to('platform:admin_logs').emit('realtime-event', item);
      } else if (item.entity === 'presence' && item.action === 'list') {
        io.to(`tenant:${item.tenantId}`).emit('presence-list', item.data);
      } else {
        if (item.userId) {
          io.to(`user:${item.userId}`).emit('realtime-event', item);
        } else if (item.tenantId) {
          io.to(`tenant:${item.tenantId}`).emit('realtime-event', item);
        }
      }
    };

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

            if (content.type === 'realtime_batch' && Array.isArray(content.events)) {
              content.events.forEach((item: any) => dispatchRealtimeItem(item));
            } else {
              dispatchRealtimeItem(content);
            }

            channel.ack(msg);
          } catch (err) {
            console.error('❌ Erro ao processar evento realtime broadcast:', err);
            channel.nack(msg, false, false);
          }
        }
      });
    } catch (err) {
      console.warn('⚠️ RabbitMQ não disponível na inicialização do realtime consumer. Tentando prosseguir com servidor HTTP.');
    }

    // Iniciar Ouvinte (LISTEN) de Eventos do PostgreSQL e repassar para a Fila de Realtime
    try {
      await sql.listen('realtime_events', (payload) => {
        try {
          const parsed = JSON.parse(payload);
          console.log('⚡ Evento recebido via pg_notify:', parsed);
          publishRealtimeEvent(parsed);
        } catch (err: any) {
          console.error('❌ Erro ao repassar evento do Postgres para a fila de Realtime:', err);
          log({
            name: 'server.pg_notify_error',
            type: 'error',
            severity: 'error',
            serviceName: 'core-api',
            message: err.message || String(err),
            stack: err.stack,
          }).catch(() => {});
        }
      });
      console.log('✅ Escuta de eventos pg_notify ativa no canal [realtime_events].');
    } catch (err: any) {
      console.error('❌ Falha ao iniciar ouvinte pg_notify:', err);
      log({
        name: 'server.pg_notify_init_error',
        type: 'error',
        severity: 'error',
        serviceName: 'core-api',
        message: err.message || String(err),
        stack: err.stack,
      }).catch(() => {});
    }

    // Iniciar Consumer de verificação automática de domínios
    try {
      await startDomainVerifyConsumer();
    } catch (err) {
      console.warn('⚠️ Consumer de domínios não disponível na inicialização. Verificação automática indisponível.');
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
