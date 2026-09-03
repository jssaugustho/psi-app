/**
 * emailConsumer.ts
 *
 * Consumidor RabbitMQ para processamento e envio assíncrono de e-mails transacionais.
 *
 * Recursos:
 *   - Limitação de taxa global no Resend (Max 2 req/s) com retentativa em HTTP 429
 *   - Cache em memória de verificação de domínios (TTL 10min)
 *   - Sub-filas/Espaçamento justo por Usuário / Tenant (mínimo de 2s entre envios)
 *   - Proteção anti-spam por destinatário (máx 1 e-mail do mesmo template/min, 3 no total/5min)
 *   - Registro estruturado em `email_logs`, `audit_logs` e `logs`
 */

import { getChannel, assertQuorumQueue, log } from '../shared/queue';
import { db } from '../shared/db';
import { emailLogs, workspaceDomains } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { renderEmailTemplate, TemplateName, TemplatePropsMap } from '../emails/render';
import { deriveEmailDomain } from '../shared/email-domain';
import {
  checkDomainVerifiedCached,
  executeWithResendRateLimit,
  checkRecipientAntiSpamLimit,
  getSenderThrottleWaitMs,
  recordSenderSend,
} from '../emails/rate-limiter';

const QUEUE_NAME = 'email.transactional';
const ROUTING_KEY = 'email.transactional';

async function updateOrCreateEmailLog(data: {
  emailLogId?: string;
  toEmail: string;
  subject: string;
  template: string;
  htmlBody?: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string | null;
  retryCount?: number;
  metadata?: Record<string, any>;
}) {
  if (data.emailLogId) {
    await db
      .update(emailLogs)
      .set({
        status: data.status,
        error: data.error ?? null,
        retryCount: data.retryCount ?? 0,
        htmlBody: data.htmlBody ?? '',
        sentAt: data.status === 'sent' ? new Date() : null,
        metadata: data.metadata ?? {},
      })
      .where(eq(emailLogs.id, data.emailLogId));
  } else {
    await db.insert(emailLogs).values({
      toEmail: data.toEmail,
      subject: data.subject,
      template: data.template,
      htmlBody: data.htmlBody ?? '',
      status: data.status,
      error: data.error ?? null,
      retryCount: data.retryCount ?? 0,
      sentAt: data.status === 'sent' ? new Date() : null,
      metadata: data.metadata ?? {},
    });
  }
}

export async function startEmailConsumer(): Promise<void> {
  try {
    await assertQuorumQueue(QUEUE_NAME, ROUTING_KEY);
    const channel = await getChannel();

    // Prefetch(1) garante distribuição equilibrada das tarefas entre workers
    await channel.prefetch(1);
    console.log(`📥 Consumidor de e-mails ativado na fila [${QUEUE_NAME}].`);

    await channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      let parsedPayload: any = null;

      try {
        parsedPayload = JSON.parse(msg.content.toString());

        const {
          emailLogId,
          template,
          to,
          props,
          tenantId,
          userId,
          senderId,
          subject: customSubject,
          retryCount = 0,
          metadata = {},
        } = parsedPayload as {
          emailLogId?: string;
          template: TemplateName;
          to: string;
          tenantId?: string;
          userId?: string;
          senderId?: string;
          subject?: string;
          retryCount?: number;
          metadata?: Record<string, any>;
          props: TemplatePropsMap[TemplateName];
        };

        const senderKey = senderId || userId || tenantId || null;

        // 1. Escalonamento justo: Aplicar throttle por remetente (usuário/tenant) se necessário
        const throttleWaitMs = getSenderThrottleWaitMs(senderKey);
        if (throttleWaitMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, throttleWaitMs));
        }

        // 2. Buscar configurações do Resend no banco (API key vem SEMPRE da plataforma)
        const settings = await db.query.platformSettings.findFirst();

        if (!settings?.resendApiKey) {
          const errMsg = 'Configurações do Resend ausentes: API Key da plataforma não configurada.';
          console.error(`❌ ${errMsg}`);

          await updateOrCreateEmailLog({
            emailLogId,
            toEmail: to,
            subject: customSubject ?? 'Notificação',
            template,
            status: 'failed',
            error: errMsg,
            retryCount,
            metadata: {
              ...metadata,
              device: (props as any)?.device ?? null,
              ip: (props as any)?.ip ?? null,
              loginAt: (props as any)?.loginAt ?? null,
              tenantId: tenantId ?? null,
              userId: userId ?? null,
            },
          });

          channel.nack(msg, false, false);
          return;
        }

        // 3. Resolver o domínio de envio efetivo
        let effectiveFromDomain: string | null = null;
        if (tenantId) {
          const domainRecord = await db.query.workspaceDomains.findFirst({
            where: eq(workspaceDomains.workspaceId, tenantId),
          });
          if (domainRecord?.customDomain) {
            effectiveFromDomain = deriveEmailDomain(domainRecord.customDomain);
          }
        }
        if (!effectiveFromDomain) {
          effectiveFromDomain = settings.resendFromDomain ?? null;
        }

        if (!effectiveFromDomain) {
          const errMsg = 'Domínio de envio não configurado (nem no tenant nem na plataforma).';
          console.error(`❌ ${errMsg}`);
          await updateOrCreateEmailLog({
            emailLogId,
            toEmail: to,
            subject: customSubject ?? 'Notificação',
            template,
            status: 'failed',
            error: errMsg,
            retryCount,
            metadata: {
              ...metadata,
              device: (props as any)?.device ?? null,
              ip: (props as any)?.ip ?? null,
              loginAt: (props as any)?.loginAt ?? null,
              tenantId: tenantId ?? null,
              userId: userId ?? null,
            },
          });
          channel.nack(msg, false, false);
          return;
        }

        // 4. Verificar se o domínio de envio está verificado no Resend (usando CACHE em memória)
        const { isVerified, verifyError } = await checkDomainVerifiedCached(
          effectiveFromDomain,
          settings.resendApiKey
        );

        if (!isVerified) {
          console.error(`❌ Falha de verificação do domínio: ${verifyError}`);

          await updateOrCreateEmailLog({
            emailLogId,
            toEmail: to,
            subject: customSubject ?? 'Notificação',
            template,
            status: 'failed',
            error: verifyError,
            retryCount,
            metadata: {
              ...metadata,
              device: (props as any)?.device ?? null,
              ip: (props as any)?.ip ?? null,
              loginAt: (props as any)?.loginAt ?? null,
              tenantId: tenantId ?? null,
              userId: userId ?? null,
            },
          });

          channel.nack(msg, false, false);
          return;
        }

        // 5. Anti-Spam Check por Destinatário
        const antiSpamCheck = await checkRecipientAntiSpamLimit(to, template);
        if (!antiSpamCheck.allowed) {
          console.warn(`⚠️ ${antiSpamCheck.reason}`);

          await updateOrCreateEmailLog({
            emailLogId,
            toEmail: to,
            subject: customSubject ?? 'Notificação',
            template,
            status: 'failed',
            error: antiSpamCheck.reason || 'Envio bloqueado por limites anti-spam.',
            retryCount,
            metadata: {
              ...metadata,
              device: (props as any)?.device ?? null,
              ip: (props as any)?.ip ?? null,
              loginAt: (props as any)?.loginAt ?? null,
              tenantId: tenantId ?? null,
              userId: userId ?? null,
            },
          });

          channel.ack(msg);
          return;
        }

        // 6. Gerar assunto padrão por template
        const subjectMap: Record<TemplateName, string> = {
          login_notification: 'Novo acesso detectado na sua conta',
          invite_member: 'Você foi convidado para colaborar em um espaço clínico',
          reset_password: 'Redefinição de senha solicitada',
        };
        const subject = customSubject ?? subjectMap[template] ?? 'Notificação';

        // 7. Renderizar HTML a partir do template React Email
        const htmlBody = renderEmailTemplate(template, props as TemplatePropsMap[typeof template]);

        // 8. Enviar via Resend (com Rate Limit Global + Exponential Backoff)
        const resend = new Resend(settings.resendApiKey);
        const cleanFromAddress = effectiveFromDomain.includes('@')
          ? effectiveFromDomain
          : `no-reply@${effectiveFromDomain}`;

        const senderBrandName = (props as any)?.brandName ?? 'Plataforma';
        const safeBrandName = senderBrandName.replace(/"/g, '');
        const fromAddress = `"${safeBrandName}" <${cleanFromAddress}>`;

        let sendError: string | null = null;
        let emailStatus: 'sent' | 'failed' = 'sent';

        try {
          const resendResponse = await executeWithResendRateLimit(async () => {
            return await resend.emails.send({
              from: fromAddress,
              to,
              subject,
              html: htmlBody,
            });
          });

          if (resendResponse.error) {
            sendError = resendResponse.error.message;
            emailStatus = 'failed';
            console.error(`❌ Resend retornou erro para [${to}]:`, resendResponse.error);
          } else {
            console.log(`✅ E-mail [${template}] enviado com sucesso para ${to} (ID: ${emailLogId ?? 's/id'})`);
            recordSenderSend(senderKey);
          }
        } catch (sendErr: any) {
          sendError = sendErr?.message ?? 'Erro desconhecido no envio';
          emailStatus = 'failed';
          console.error(`❌ Falha ao enviar e-mail para [${to}]:`, sendErr);
        }

        // 9. Persistir/Atualizar log no banco de dados
        await updateOrCreateEmailLog({
          emailLogId,
          toEmail: to,
          subject,
          template,
          htmlBody,
          status: emailStatus,
          error: sendError,
          retryCount,
          metadata: {
            ...metadata,
            device: (props as any)?.device ?? null,
            ip: (props as any)?.ip ?? null,
            loginAt: (props as any)?.loginAt ?? null,
            tenantId: tenantId ?? null,
            userId: userId ?? null,
            fromDomain: effectiveFromDomain,
          },
        });

        // 10. Publicar evento de log unificado
        await log({
          name: emailStatus === 'sent' ? 'email.sent' : 'email.failed',
          type: 'audit',
          severity: emailStatus === 'sent' ? 'info' : 'warning',
          serviceName: 'workers',
          clientApp: metadata?.clientApp || 'workers',
          userRole: metadata?.userRole || 'system',
          message: `[email:${emailStatus === 'sent' ? 'email.sent' : 'email.failed'}] - ${emailStatus === 'sent' ? 'success' : 'failure'}`,
          userId: userId ?? metadata?.userId ?? null,
          workspaceId: tenantId ?? metadata?.workspaceId ?? null,
          sessionId: metadata?.sessionId ?? null,
          metadata: {
            workerName: 'emailConsumer',
            requestId: metadata?.requestId ?? null,
            clientApp: metadata?.clientApp ?? null,
            userRole: metadata?.userRole ?? null,
            toEmail: to,
            subject,
            template,
            fromDomain: effectiveFromDomain,
            error: sendError,
            emailLogId,
            retryCount,
          },
        }).catch(() => {});

        channel.ack(msg);
      } catch (error: any) {
        console.error('❌ Erro crítico ao processar e-mail:', error);

        await log({
          name: error.name || 'WorkerEmailError',
          type: 'error',
          severity: 'error',
          serviceName: 'workers',
          clientApp: parsedPayload?.metadata?.clientApp || 'workers',
          userRole: parsedPayload?.metadata?.userRole || 'system',
          message: error.message || String(error),
          stack: error.stack,
          userId: parsedPayload?.userId ?? parsedPayload?.metadata?.userId ?? null,
          workspaceId: parsedPayload?.tenantId ?? parsedPayload?.metadata?.workspaceId ?? null,
          sessionId: parsedPayload?.metadata?.sessionId ?? null,
          metadata: {
            workerName: 'emailConsumer',
            requestId: parsedPayload?.metadata?.requestId ?? null,
            clientApp: parsedPayload?.metadata?.clientApp ?? null,
            userRole: parsedPayload?.metadata?.userRole ?? null,
            queue: QUEUE_NAME,
            payload: parsedPayload,
          },
        }).catch((pubErr) => console.error('Erro ao reportar erro do worker:', pubErr));

        if (parsedPayload?.to) {
          try {
            await updateOrCreateEmailLog({
              emailLogId: parsedPayload.emailLogId,
              toEmail: parsedPayload.to,
              subject: parsedPayload.subject ?? 'Desconhecido',
              template: parsedPayload.template ?? 'unknown',
              status: 'failed',
              error: error?.message ?? 'Erro de processamento',
              retryCount: parsedPayload.retryCount ?? 0,
            });
          } catch {
            /* ignora erro secundário */
          }
        }
        channel.nack(msg, false, false);
      }
    });

    console.log(`✅ Consumidor [${QUEUE_NAME}] pronto e ativo.`);
  } catch (err: any) {
    console.error(`❌ Erro ao iniciar consumidor de e-mails [${QUEUE_NAME}]:`, err);
    throw err;
  }
}
