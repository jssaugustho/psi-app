/**
 * emailConsumer.ts
 *
 * Consumidor RabbitMQ para processamento e envio assíncrono de e-mails transacionais.
 *
 * Recursos:
 *   - Limitação de taxa global no Resend (Max 2 req/s) com retentativa em HTTP 429
 *   - Retentativa ILIMITADA para erros de Rate Limit / Anti-Spam (mantendo status 'pending')
 *   - Retentativa LIMITADA (máx 3) e encaminhamento para DLQ (messages.dlq) para outros erros
 *   - Cache em memória de verificação de domínios (TTL 10min)
 *   - Sub-filas/Espaçamento justo por Usuário / Tenant (mínimo de 2s entre envios)
 *   - Registro estruturado em `email_logs`, `audit_logs` e `logs`
 */

import { getChannel, assertQuorumQueue, publishToQueue, log } from '../shared/queue';
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
  isRateLimitErrorMessage,
} from '../emails/rate-limiter';

const QUEUE_NAME = 'email.transactional';
const ROUTING_KEY = 'email.transactional';
const MAX_NON_RATE_LIMIT_RETRIES = 3;

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

          const nextRetry = retryCount + 1;
          if (nextRetry <= MAX_NON_RATE_LIMIT_RETRIES) {
            const userMsg = `${errMsg} (tentativa ${nextRetry}/${MAX_NON_RATE_LIMIT_RETRIES})`;
            await updateOrCreateEmailLog({
              emailLogId,
              toEmail: to,
              subject: customSubject ?? 'Notificação',
              template,
              status: 'pending',
              error: userMsg,
              retryCount: nextRetry,
              metadata: {
                ...metadata,
                tenantId: tenantId ?? null,
                userId: userId ?? null,
              },
            });

            setTimeout(async () => {
              await publishToQueue(ROUTING_KEY, {
                ...parsedPayload,
                emailLogId,
                retryCount: nextRetry,
                _requeuedAt: new Date().toISOString(),
              });
            }, 30000);

            channel.ack(msg);
            return;
          }

          // Exaurido -> Enviar para DLQ
          await updateOrCreateEmailLog({
            emailLogId,
            toEmail: to,
            subject: customSubject ?? 'Notificação',
            template,
            status: 'failed',
            error: errMsg,
            retryCount: nextRetry,
            metadata: {
              ...metadata,
              tenantId: tenantId ?? null,
              userId: userId ?? null,
            },
          });

          await log({
            name: 'email.failed',
            type: 'audit',
            severity: 'warning',
            serviceName: 'workers',
            clientApp: metadata?.clientApp || 'workers',
            userRole: metadata?.userRole || 'system',
            message: `[email:email.failed] - ${errMsg}`,
            userId: userId ?? metadata?.userId ?? null,
            workspaceId: tenantId ?? metadata?.workspaceId ?? null,
            sessionId: metadata?.sessionId ?? null,
            metadata: {
              workerName: 'emailConsumer',
              requestId: metadata?.requestId ?? null,
              toEmail: to,
              template,
              error: errMsg,
              emailLogId,
              retryCount: nextRetry,
            },
          }).catch(() => {});

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

          const nextRetry = retryCount + 1;
          if (nextRetry <= MAX_NON_RATE_LIMIT_RETRIES) {
            const userMsg = `${errMsg} (tentativa ${nextRetry}/${MAX_NON_RATE_LIMIT_RETRIES})`;
            await updateOrCreateEmailLog({
              emailLogId,
              toEmail: to,
              subject: customSubject ?? 'Notificação',
              template,
              status: 'pending',
              error: userMsg,
              retryCount: nextRetry,
              metadata: {
                ...metadata,
                tenantId: tenantId ?? null,
                userId: userId ?? null,
              },
            });

            setTimeout(async () => {
              await publishToQueue(ROUTING_KEY, {
                ...parsedPayload,
                emailLogId,
                retryCount: nextRetry,
                _requeuedAt: new Date().toISOString(),
              });
            }, 30000);

            channel.ack(msg);
            return;
          }

          await updateOrCreateEmailLog({
            emailLogId,
            toEmail: to,
            subject: customSubject ?? 'Notificação',
            template,
            status: 'failed',
            error: errMsg,
            retryCount: nextRetry,
            metadata: {
              ...metadata,
              tenantId: tenantId ?? null,
              userId: userId ?? null,
            },
          });

          await log({
            name: 'email.failed',
            type: 'audit',
            severity: 'warning',
            serviceName: 'workers',
            clientApp: metadata?.clientApp || 'workers',
            userRole: metadata?.userRole || 'system',
            message: `[email:email.failed] - ${errMsg}`,
            userId: userId ?? metadata?.userId ?? null,
            workspaceId: tenantId ?? metadata?.workspaceId ?? null,
            sessionId: metadata?.sessionId ?? null,
            metadata: {
              workerName: 'emailConsumer',
              requestId: metadata?.requestId ?? null,
              toEmail: to,
              template,
              error: errMsg,
              emailLogId,
              retryCount: nextRetry,
            },
          }).catch(() => {});

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

          const nextRetry = retryCount + 1;
          if (nextRetry <= MAX_NON_RATE_LIMIT_RETRIES) {
            const userMsg = `${verifyError} (tentativa ${nextRetry}/${MAX_NON_RATE_LIMIT_RETRIES})`;
            await updateOrCreateEmailLog({
              emailLogId,
              toEmail: to,
              subject: customSubject ?? 'Notificação',
              template,
              status: 'pending',
              error: userMsg,
              retryCount: nextRetry,
              metadata: {
                ...metadata,
                tenantId: tenantId ?? null,
                userId: userId ?? null,
              },
            });

            setTimeout(async () => {
              await publishToQueue(ROUTING_KEY, {
                ...parsedPayload,
                emailLogId,
                retryCount: nextRetry,
                _requeuedAt: new Date().toISOString(),
              });
            }, 30000);

            channel.ack(msg);
            return;
          }

          await updateOrCreateEmailLog({
            emailLogId,
            toEmail: to,
            subject: customSubject ?? 'Notificação',
            template,
            status: 'failed',
            error: verifyError,
            retryCount: nextRetry,
            metadata: {
              ...metadata,
              tenantId: tenantId ?? null,
              userId: userId ?? null,
            },
          });

          await log({
            name: 'email.failed',
            type: 'audit',
            severity: 'warning',
            serviceName: 'workers',
            clientApp: metadata?.clientApp || 'workers',
            userRole: metadata?.userRole || 'system',
            message: `[email:email.failed] - ${verifyError}`,
            userId: userId ?? metadata?.userId ?? null,
            workspaceId: tenantId ?? metadata?.workspaceId ?? null,
            sessionId: metadata?.sessionId ?? null,
            metadata: {
              workerName: 'emailConsumer',
              requestId: metadata?.requestId ?? null,
              toEmail: to,
              template,
              error: verifyError,
              emailLogId,
              retryCount: nextRetry,
            },
          }).catch(() => {});

          channel.nack(msg, false, false);
          return;
        }

        // 5. Anti-Spam Check por Destinatário
        const antiSpamCheck = await checkRecipientAntiSpamLimit(to, template);
        if (!antiSpamCheck.allowed) {
          const nextRetry = retryCount + 1;
          const delayMs = 60 * 1000; // 60 segundos de janela anti-spam
          const errMsg = antiSpamCheck.reason || 'Envio bloqueado por limites anti-spam.';
          const userMsg = `${errMsg} (Reagendado automaticamente em 60s - Tentativa ${nextRetry})`;

          console.warn(`⏳ ${userMsg}`);

          // Manter status PENDING no banco com aviso amigável
          await updateOrCreateEmailLog({
            emailLogId,
            toEmail: to,
            subject: customSubject ?? 'Notificação',
            template,
            status: 'pending',
            error: userMsg,
            retryCount: nextRetry,
            metadata: {
              ...metadata,
              device: (props as any)?.device ?? null,
              ip: (props as any)?.ip ?? null,
              loginAt: (props as any)?.loginAt ?? null,
              tenantId: tenantId ?? null,
              userId: userId ?? null,
              rateLimited: true,
              nextRetryAt: new Date(Date.now() + delayMs).toISOString(),
            },
          });

          await log({
            name: 'email.rate_limited',
            type: 'info',
            severity: 'info',
            serviceName: 'workers',
            clientApp: metadata?.clientApp || 'workers',
            userRole: metadata?.userRole || 'system',
            message: `[email:email.rate_limited] - Reagendando e-mail [${template}] para [${to}] em 60s (Tentativa ${nextRetry})`,
            userId: userId ?? metadata?.userId ?? null,
            workspaceId: tenantId ?? metadata?.workspaceId ?? null,
            sessionId: metadata?.sessionId ?? null,
            metadata: {
              workerName: 'emailConsumer',
              requestId: metadata?.requestId ?? null,
              toEmail: to,
              template,
              error: errMsg,
              emailLogId,
              retryCount: nextRetry,
              delayMs,
            },
          }).catch(() => {});

          // Re-enfileirar assincronamente após 60s (retentativa ILIMITADA para anti-spam)
          setTimeout(async () => {
            await publishToQueue(ROUTING_KEY, {
              ...parsedPayload,
              emailLogId,
              retryCount: nextRetry,
              _requeuedFromRateLimitAt: new Date().toISOString(),
            });
          }, delayMs);

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
        let emailStatus: 'sent' | 'failed' | 'pending' = 'sent';
        let externalErrorDetails: any = null;

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
            externalErrorDetails = resendResponse.error;
            console.error(`❌ Resend retornou erro para [${to}]:`, resendResponse.error);
          } else {
            console.log(`✅ E-mail [${template}] enviado com sucesso para ${to} (ID: ${emailLogId ?? 's/id'})`);
            recordSenderSend(senderKey);
          }
        } catch (sendErr: any) {
          sendError = sendErr?.message ?? 'Erro desconhecido no envio';
          emailStatus = 'failed';
          externalErrorDetails = { message: sendErr?.message, stack: sendErr?.stack, name: sendErr?.name };
          console.error(`❌ Falha ao enviar e-mail para [${to}]:`, sendErr);
        }

        // 9. Verificar se o erro foi de Rate-Limit HTTP 429
        const isRateLimit = sendError && isRateLimitErrorMessage(externalErrorDetails || sendError);

        if (emailStatus === 'failed' && isRateLimit) {
          const nextRetry = retryCount + 1;
          const delayMs = 30 * 1000; // 30 segundos
          const userMsg = `Resend Rate-Limit (429): ${sendError}. Reagendado (Tentativa ${nextRetry})`;

          console.warn(`⏳ ${userMsg}`);

          await updateOrCreateEmailLog({
            emailLogId,
            toEmail: to,
            subject,
            template,
            htmlBody,
            status: 'pending', // Manter PENDING para retentativa ilimitada de 429
            error: userMsg,
            retryCount: nextRetry,
            metadata: {
              ...metadata,
              device: (props as any)?.device ?? null,
              ip: (props as any)?.ip ?? null,
              loginAt: (props as any)?.loginAt ?? null,
              tenantId: tenantId ?? null,
              userId: userId ?? null,
              fromDomain: effectiveFromDomain,
              rateLimited: true,
              ...(externalErrorDetails ? { externalErrorResponse: externalErrorDetails } : {}),
            },
          });

          await log({
            name: 'email.rate_limited',
            type: 'info',
            severity: 'info',
            serviceName: 'workers',
            clientApp: metadata?.clientApp || 'workers',
            userRole: metadata?.userRole || 'system',
            message: `[email:email.rate_limited] - Resend 429 para [${to}]. Reagendando em 30s (Tentativa ${nextRetry})`,
            userId: userId ?? metadata?.userId ?? null,
            workspaceId: tenantId ?? metadata?.workspaceId ?? null,
            sessionId: metadata?.sessionId ?? null,
            metadata: {
              workerName: 'emailConsumer',
              requestId: metadata?.requestId ?? null,
              toEmail: to,
              subject,
              template,
              error: sendError,
              emailLogId,
              retryCount: nextRetry,
            },
          }).catch(() => {});

          setTimeout(async () => {
            await publishToQueue(ROUTING_KEY, {
              ...parsedPayload,
              emailLogId,
              retryCount: nextRetry,
              _requeuedFromRateLimitAt: new Date().toISOString(),
            });
          }, delayMs);

          channel.ack(msg);
          return;
        }

        // 10. Tratar outros erros de envio (não-rate-limit)
        if (emailStatus === 'failed') {
          const nextRetry = retryCount + 1;
          if (nextRetry <= MAX_NON_RATE_LIMIT_RETRIES) {
            const userMsg = `${sendError} (tentativa ${nextRetry}/${MAX_NON_RATE_LIMIT_RETRIES})`;
            console.warn(`🔄 ${userMsg}`);

            await updateOrCreateEmailLog({
              emailLogId,
              toEmail: to,
              subject,
              template,
              htmlBody,
              status: 'pending',
              error: userMsg,
              retryCount: nextRetry,
              metadata: {
                ...metadata,
                fromDomain: effectiveFromDomain,
                ...(externalErrorDetails ? { externalErrorResponse: externalErrorDetails } : {}),
              },
            });

            await log({
              name: 'email.retrying',
              type: 'audit',
              severity: 'warning',
              serviceName: 'workers',
              clientApp: metadata?.clientApp || 'workers',
              userRole: metadata?.userRole || 'system',
              message: `[email:email.retrying] - ${userMsg}`,
              userId: userId ?? metadata?.userId ?? null,
              workspaceId: tenantId ?? metadata?.workspaceId ?? null,
              sessionId: metadata?.sessionId ?? null,
              metadata: {
                workerName: 'emailConsumer',
                requestId: metadata?.requestId ?? null,
                toEmail: to,
                subject,
                template,
                error: sendError,
                emailLogId,
                retryCount: nextRetry,
              },
            }).catch(() => {});

            setTimeout(async () => {
              await publishToQueue(ROUTING_KEY, {
                ...parsedPayload,
                emailLogId,
                retryCount: nextRetry,
                _requeuedAt: new Date().toISOString(),
              });
            }, nextRetry * 30000);

            channel.ack(msg);
            return;
          }

          // Se excedeu retentativas para erro não-rate-limit -> Marcar failed e enviar para DLQ via nack
          const finalError = `[Falha Permanente] ${sendError} (Excedido ${MAX_NON_RATE_LIMIT_RETRIES} tentativas)`;
          await updateOrCreateEmailLog({
            emailLogId,
            toEmail: to,
            subject,
            template,
            htmlBody,
            status: 'failed',
            error: finalError,
            retryCount: nextRetry,
            metadata: {
              ...metadata,
              fromDomain: effectiveFromDomain,
              ...(externalErrorDetails ? { externalErrorResponse: externalErrorDetails } : {}),
            },
          });

          await log({
            name: 'email.failed',
            type: 'audit',
            severity: 'error',
            serviceName: 'workers',
            clientApp: metadata?.clientApp || 'workers',
            userRole: metadata?.userRole || 'system',
            message: `[email:email.failed] - ${finalError}`,
            userId: userId ?? metadata?.userId ?? null,
            workspaceId: tenantId ?? metadata?.workspaceId ?? null,
            sessionId: metadata?.sessionId ?? null,
            metadata: {
              workerName: 'emailConsumer',
              requestId: metadata?.requestId ?? null,
              toEmail: to,
              subject,
              template,
              error: finalError,
              emailLogId,
              retryCount: nextRetry,
            },
          }).catch(() => {});

          channel.nack(msg, false, false);
          return;
        }

        // 11. Envio realizado com Sucesso!
        await updateOrCreateEmailLog({
          emailLogId,
          toEmail: to,
          subject,
          template,
          htmlBody,
          status: 'sent',
          error: null,
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

        await log({
          name: 'email.sent',
          type: 'audit',
          severity: 'info',
          serviceName: 'workers',
          clientApp: metadata?.clientApp || 'workers',
          userRole: metadata?.userRole || 'system',
          message: '[email:email.sent] - success',
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
              retryCount: (parsedPayload.retryCount ?? 0) + 1,
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
