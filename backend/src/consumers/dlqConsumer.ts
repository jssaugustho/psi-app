import { getChannel, publishToQueue, publishRealtime, log } from '../shared/queue';
import { db } from '../shared/db';
import { emailLogs } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { TemplateName } from '../emails/render';

const DLQ_QUEUE_NAME = 'messages.dlq';
const EMAIL_QUEUE_ROUTING_KEY = 'email.transactional';
const MAX_DLQ_RETRIES = 2; // Máximo de 2 retentativas a partir da DLQ

export async function startDlqConsumer(): Promise<void> {
  try {
    const channel = await getChannel();
    await channel.assertQueue(DLQ_QUEUE_NAME, {
      durable: true,
      arguments: { 'x-queue-type': 'quorum' },
    });

    await channel.prefetch(1);
    console.log(`📥 Consumidor de Dead Letter Queue (DLQ) iniciado em [${DLQ_QUEUE_NAME}].`);

    await channel.consume(DLQ_QUEUE_NAME, async (msg) => {
      if (!msg) return;

      const rawContent = msg.content.toString();
      let parsedPayload: any = null;

      try {
        parsedPayload = JSON.parse(rawContent);
      } catch {
        parsedPayload = { rawText: rawContent };
      }

      const deathHeaders = msg.properties.headers?.['x-death'] ?? [];
      const originalRoutingKey =
        msg.fields.routingKey ||
        (Array.isArray(deathHeaders) && deathHeaders[0]?.['routing-keys']?.[0]) ||
        '';

      const isEmailPayload =
        originalRoutingKey === EMAIL_QUEUE_ROUTING_KEY ||
        (parsedPayload && typeof parsedPayload === 'object' && 'to' in parsedPayload && 'template' in parsedPayload);

      try {
        if (isEmailPayload) {
          await handleEmailDlqMessage(parsedPayload, deathHeaders);
        } else {
          await handleGenericDlqMessage(parsedPayload, msg.fields, deathHeaders);
        }

        // Sempre ACK mensagens processadas na DLQ para evitar travamento da fila
        channel.ack(msg);
      } catch (error: any) {
        console.error('❌ Falha ao processar mensagem da DLQ:', error);
        await log({
          name: error.name || 'DlqProcessingError',
          type: 'error',
          severity: 'error',
          serviceName: 'dead-letter-queue',
          message: error.message || String(error),
          stack: error.stack,
          metadata: { rawPayload: rawContent, originalRoutingKey },
        }).catch(() => {});
        channel.ack(msg);
      }
    });

    console.log(`✅ Consumidor [${DLQ_QUEUE_NAME}] pronto e ativo.`);
  } catch (err: any) {
    console.error(`❌ Erro ao iniciar consumidor da DLQ [${DLQ_QUEUE_NAME}]:`, err);
  }
}

/**
 * Tratativa especializada para e-mails capturados na DLQ
 */
async function handleEmailDlqMessage(payload: any, deathHeaders: any[]): Promise<void> {
  const {
    emailLogId,
    to,
    template,
    props,
    tenantId,
    userId,
    subject,
    retryCount = 0,
    _dlqRetryCount = 0,
    metadata = {},
  } = payload as {
    emailLogId?: string;
    to: string;
    template: TemplateName;
    props: any;
    tenantId?: string;
    userId?: string;
    subject?: string;
    retryCount?: number;
    _dlqRetryCount?: number;
    metadata?: Record<string, any>;
  };

  const currentRetry = Math.max(retryCount, _dlqRetryCount);
  const nextRetryCount = currentRetry + 1;
  const reason = deathHeaders[0]?.reason || payload.lastError || 'Falha de entrega no worker';

  console.warn(
    `⚠️ E-mail [${template}] para [${to}] capturado na DLQ. Tentativa: ${nextRetryCount}/${MAX_DLQ_RETRIES}. Razão: ${reason}`
  );

  // Atualizar registro existente em email_logs com o motivo do erro e contador
  if (emailLogId) {
    try {
      await db
        .update(emailLogs)
        .set({
          status: 'failed',
          error: reason,
          retryCount: nextRetryCount,
        })
        .where(eq(emailLogs.id, emailLogId));
    } catch (dbErr) {
      console.warn('⚠️ Falha ao atualizar email_logs na DLQ:', dbErr);
    }
  }

  // Verificar se a falha é transitória (re-enfileirável)
  const isTransientError =
    reason === 'rejected' ||
    reason === 'expired' ||
    String(payload.lastError || '').includes('429') ||
    String(payload.lastError || '').includes('timeout') ||
    String(payload.lastError || '').includes('ECONNRESET');

  const shouldRetry = isTransientError && nextRetryCount <= MAX_DLQ_RETRIES;

  if (shouldRetry) {
    const retryDelayMs = nextRetryCount * 30 * 1000; // 30s na 1ª tentativa, 60s na 2ª tentativa

    console.log(
      `🔄 Reenfileirando e-mail [${template}] para [${to}] da DLQ em ${retryDelayMs / 1000}s (tentativa ${nextRetryCount}/${MAX_DLQ_RETRIES})...`
    );

    await log({
      name: 'email.dlq_retry',
      type: 'dlq',
      severity: 'warning',
      serviceName: 'dead-letter-queue',
      message: `Reenfileirando e-mail [${template}] para [${to}] da DLQ em ${retryDelayMs / 1000}s (tentativa ${nextRetryCount}/${MAX_DLQ_RETRIES})`,
      userId: userId ?? metadata?.userId ?? null,
      workspaceId: tenantId ?? metadata?.workspaceId ?? null,
      sessionId: metadata?.sessionId ?? null,
      metadata: {
        requestId: metadata?.requestId ?? null,
        toEmail: to,
        template,
        emailLogId,
        retryCount: nextRetryCount,
        reason,
      },
    }).catch(() => {});

    setTimeout(async () => {
      await publishToQueue(EMAIL_QUEUE_ROUTING_KEY, {
        ...payload,
        emailLogId,
        retryCount: nextRetryCount,
        _dlqRetryCount: nextRetryCount,
        _requeuedFromDlqAt: new Date().toISOString(),
      });
    }, retryDelayMs);

    return;
  }

  // Falha permanente ou retentativas exauridas -> Registrar estado final e alertar
  const errorMessage = `[DLQ Falha Permanente] ${nextRetryCount > MAX_DLQ_RETRIES ? 'Máximo de retentativas DLQ excedido.' : reason}`;

  if (emailLogId) {
    await db
      .update(emailLogs)
      .set({
        status: 'failed',
        error: errorMessage,
        retryCount: nextRetryCount,
      })
      .where(eq(emailLogs.id, emailLogId));
  } else {
    await db.insert(emailLogs).values({
      toEmail: to || 'desconhecido@domain.com',
      subject: subject ?? 'Notificação',
      template: template ?? 'unknown',
      htmlBody: '',
      status: 'failed',
      error: errorMessage,
      retryCount: nextRetryCount,
      metadata: {
        dlq: true,
        dlqRetriesExhausted: nextRetryCount > MAX_DLQ_RETRIES,
        deathHeaders,
        tenantId: tenantId ?? null,
        userId: userId ?? null,
      },
    });
  }

  // Notificar via log unificado
  await log({
    name: 'email.dlq_exhausted',
    type: 'audit',
    severity: 'error',
    serviceName: 'dead-letter-queue',
    message: `[email:email.dlq_exhausted] - failure`,
    userId: userId ?? metadata?.userId ?? null,
    workspaceId: tenantId ?? metadata?.workspaceId ?? null,
    sessionId: metadata?.sessionId ?? null,
    metadata: {
      requestId: metadata?.requestId ?? null,
      toEmail: to,
      template,
      subject,
      error: errorMessage,
      emailLogId,
      retryCount: nextRetryCount,
    },
  }).catch(() => {});

  // Transmitir evento Realtime para o frontend (notificação de falha grave)
  await publishRealtime({
    entity: 'email',
    action: 'dlq_failure',
    tenantId: tenantId ?? null,
    data: {
      toEmail: to,
      template,
      subject,
      error: errorMessage,
      failedAt: new Date().toISOString(),
    },
  }).catch(() => {});

  console.error(`❌ E-mail [${template}] para [${to}] finalizado com falha permanente na DLQ.`);
}

/**
 * Tratativa genérica para outras mensagens capturadas na DLQ
 */
async function handleGenericDlqMessage(payload: any, fields: any, deathHeaders: any[]): Promise<void> {
  console.warn(`⚠️ Mensagem não-email resgatada da DLQ [${fields.routingKey}]:`, payload);

  await log({
    name: 'dlq.generic_message_captured',
    type: 'dlq',
    severity: 'warning',
    message: payload?.message || 'Mensagem falhou no processamento de fila e foi recuperada da DLQ.',
    serviceName: 'workers',
    clientApp: payload?.metadata?.clientApp || 'workers',
    userRole: payload?.metadata?.userRole || 'system',
    metadata: {
      workerName: 'dlqConsumer',
      requestId: payload?.metadata?.requestId || null,
      clientApp: payload?.metadata?.clientApp || null,
      userRole: payload?.metadata?.userRole || null,
      routingKey: fields.routingKey,
      exchange: fields.exchange,
      payload,
      deathHeader: deathHeaders,
    },
  });
}
