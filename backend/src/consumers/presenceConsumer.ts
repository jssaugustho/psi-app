/**
 * presenceConsumer.ts
 *
 * Consumidor RabbitMQ dedicado para a Máquina de Estado da Presença dos Usuários.
 *
 * Recursos:
 *   - Consumo exclusivo da fila `presence.events`
 *   - Gerenciamento do mapa em memória `globalPresence` (por tenant)
 *   - Grace Period (3s) para desconexões/reloads sem oscilar para 0 online
 *   - Limpeza automática de inatividade (25s)
 *   - Envia a lista consolidada para a fila genérica de eventos `realtime.events`
 */

import { getChannel, assertQuorumQueue, publishRealtimeEvent, log } from '../shared/queue';

const QUEUE_NAME = 'presence.events';
const ROUTING_KEY = 'presence.events';

interface PresenceUser {
  userId: string;
  nome: string;
  sobrenome: string;
  email: string;
  avatarUrl: string | null;
  path: string;
  lastSeen: number;
}

// Estado de presença gerenciado centralmente por este worker
const globalPresence = new Map<string, Map<string, PresenceUser>>();

// Timers de Grace Period para desconexões temporárias (3 segundos)
const pendingLeaves = new Map<string, NodeJS.Timeout>();

function broadcastPresenceList(tenantId: string) {
  const usersMap = globalPresence.get(tenantId);
  const activeUsersList = usersMap
    ? Array.from(usersMap.values()).map(({ lastSeen, ...u }) => u)
    : [];

  // Envia a atualização da presença para a fila global de eventos realtime
  publishRealtimeEvent({
    entity: 'presence',
    action: 'list',
    tenantId,
    data: activeUsersList,
  });
}

function handlePresenceEvent(payload: any) {
  const { action, tenantId, userId, data } = payload;
  if (!tenantId || !userId) return;

  const leaveKey = `${tenantId}:${userId}`;

  // Se havia um temporizador de saída agendado (por refresh/troca de página), cancela-o
  if (pendingLeaves.has(leaveKey)) {
    clearTimeout(pendingLeaves.get(leaveKey)!);
    pendingLeaves.delete(leaveKey);
  }

  if (action === 'leave') {
    // Agenda o expurgo do usuário com Grace Period de 3 segundos
    const timer = setTimeout(() => {
      pendingLeaves.delete(leaveKey);
      const tenantMap = globalPresence.get(tenantId);
      if (tenantMap) {
        tenantMap.delete(userId);
        if (tenantMap.size === 0) {
          globalPresence.delete(tenantId);
        }
      }
      broadcastPresenceList(tenantId);
    }, 3000);

    pendingLeaves.set(leaveKey, timer);
    return;
  }

  // Heartbeat / Subscribe / Update
  if (!globalPresence.has(tenantId)) {
    globalPresence.set(tenantId, new Map());
  }

  const tenantMap = globalPresence.get(tenantId)!;
  const isNewUser = !tenantMap.has(userId);

  tenantMap.set(userId, {
    ...data,
    userId,
    lastSeen: Date.now(),
  });

  // Dispara atualização de lista imediatamente se for novo usuário ou se solicitou subscribe/sync
  if (isNewUser || action === 'subscribe' || action === 'sync') {
    broadcastPresenceList(tenantId);
  }
}

export async function startPresenceConsumer(): Promise<void> {
  try {
    await assertQuorumQueue(QUEUE_NAME, ROUTING_KEY);
    const channel = await getChannel();

    await channel.prefetch(50);
    console.log(`📥 Consumidor de Presença ativado na fila [${QUEUE_NAME}].`);

    // Iniciar rotina periódica de limpeza de usuários inativos (sem pulso a cada 25s)
    setInterval(() => {
      const now = Date.now();
      const expirationMs = 25 * 1000;

      for (const [tenantId, usersMap] of globalPresence.entries()) {
        let hasChanges = false;

        for (const [userId, user] of usersMap.entries()) {
          if (now - user.lastSeen > expirationMs) {
            usersMap.delete(userId);
            hasChanges = true;
          }
        }

        if (hasChanges) {
          broadcastPresenceList(tenantId);
        }

        if (usersMap.size === 0) {
          globalPresence.delete(tenantId);
        }
      }
    }, 10000);

    await channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        handlePresenceEvent(payload);
        channel.ack(msg);
      } catch (error: any) {
        console.error('❌ Erro no Consumidor de Presença:', error);

        await log({
          name: error.name || 'PresenceConsumerError',
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

    console.log(`✅ Consumidor de Presença [${QUEUE_NAME}] pronto.`);
  } catch (err: any) {
    console.error(`❌ Erro ao iniciar consumidor de presença [${QUEUE_NAME}]:`, err);
    throw err;
  }
}
