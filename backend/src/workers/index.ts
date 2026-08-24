import { env } from '../config/env';
import { getChannel, assertQuorumQueue } from '../shared/queue';
import { db } from '../shared/db';
import { systemStatusLogs, emailLogs, platformSettings, workspaces, workspaceDomains } from '../shared/schema';
import { lt, sql, eq, gt, and } from 'drizzle-orm';
import { Resend } from 'resend';
import { renderEmailTemplate, TemplateName, TemplatePropsMap } from '../emails/render';
import { deriveEmailDomain } from '../shared/email-domain';

async function main() {
  console.log('⚙️ Inicializando TS Workers...');

  try {
    const channel = await getChannel();

    // Prefetch(1) garante distribuição equilibrada das tarefas entre múltiplos workers
    await channel.prefetch(1);
    console.log('⚖️ Prefetch do canal RabbitMQ configurado para 1.');

    // ── Consumidor: Fila de Status do Sistema ──────────────────────────────────
    const statusQueue = 'system.status';
    const realtimeExchange = 'realtime.broadcast';

    await assertQuorumQueue(statusQueue, statusQueue);
    console.log(`📥 Fila [${statusQueue}] declarada e vinculada.`);

    await channel.consume(statusQueue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString()) as {
          serviceName: string;
          status: 'operational' | 'degraded' | 'down';
          responseTimeMs?: number;
          message?: string | null;
        };

        console.log(`⏱️ Evento de Heartbeat recebido: ${content.serviceName} -> ${content.status}`);

        // 1. Gravar log de status no banco de dados
        const [newLog] = await db
          .insert(systemStatusLogs)
          .values({
            serviceName: content.serviceName,
            status: content.status,
            responseTimeMs: content.responseTimeMs ?? null,
            message: content.message ?? null,
          })
          .returning();

        // 2. Limpar logs mais antigos que 7 dias (pruning automático)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        await db
          .delete(systemStatusLogs)
          .where(lt(systemStatusLogs.createdAt, sql`${sevenDaysAgo}`));

        // 3. Transmitir o evento em tempo real via RabbitMQ fanout exchange para WebSockets
        channel.publish(
          realtimeExchange,
          '',
          Buffer.from(JSON.stringify({ type: 'system_status_update', data: newLog }))
        );

        channel.ack(msg);
      } catch (error) {
        console.error('❌ Erro ao processar evento de status:', error);
        channel.nack(msg, false, false);
      }
    });

    // ── Consumidor: Fila de E-mails Transacionais ──────────────────────────────
    const emailQueue = 'email.transactional';

    await assertQuorumQueue(emailQueue, emailQueue);
    console.log(`📥 Fila [${emailQueue}] declarada e vinculada.`);

    await channel.consume(emailQueue, async (msg) => {
      if (!msg) return;

      let parsedPayload: any = null;

      try {
        parsedPayload = JSON.parse(msg.content.toString());

        const { template, to, props, tenantId } = parsedPayload as {
          template: TemplateName;
          to: string;
          tenantId?: string;
          props: TemplatePropsMap[TemplateName];
        };

        // 1. Buscar configurações do Resend no banco (API key vem SEMPRE da plataforma)
        const settings = await db.query.platformSettings.findFirst();

        if (!settings?.resendApiKey) {
          const errMsg = 'Configurações do Resend ausentes: API Key da plataforma não configurada.';
          console.error(`❌ ${errMsg}`);
          
          await db.insert(emailLogs).values({
            toEmail: to,
            subject: parsedPayload.subject ?? 'Notificação',
            template,
            htmlBody: '',
            status: 'failed',
            error: errMsg,
            metadata: {
              device: (props as any).device ?? null,
              ip: (props as any).ip ?? null,
              loginAt: (props as any).loginAt ?? null,
              tenantId: tenantId ?? null,
            },
          });

          channel.nack(msg, false, false);
          return;
        }

        // 1b. Resolver o domínio de envio efetivo (ordem de prioridade):
        //   1. emailDomain do tenant (explícito)
        //   2. no-reply.<rootDomain> derivado do domínio principal
        //      → no-reply SEMPRE no nível raiz, mesmo se o tenant usa subdomínio
        //      → ex: app.clinica.com.br → no-reply.clinica.com.br
        //   3. resendFromDomain da plataforma (fallback global)
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
          await db.insert(emailLogs).values({
            toEmail: to,
            subject: parsedPayload.subject ?? 'Notificação',
            template,
            htmlBody: '',
            status: 'failed',
            error: errMsg,
            metadata: {
              device: (props as any).device ?? null,
              ip: (props as any).ip ?? null,
              loginAt: (props as any).loginAt ?? null,
              tenantId: tenantId ?? null,
            },
          });
          channel.nack(msg, false, false);
          return;
        }

        // 2. Verificar se o domínio de envio (efetivo) está verificado no Resend
        //    A API key usada é sempre a da plataforma, mesmo para domínios de tenants filhos.
        let isVerified = false;
        let verifyError = '';
        try {
          const listRes = await fetch('https://api.resend.com/domains', {
            headers: { Authorization: `Bearer ${settings.resendApiKey}` },
          });
          if (!listRes.ok) {
            const err = await listRes.json().catch(() => ({}));
            verifyError = `Erro ao listar domínios no Resend: ${(err as any).message || listRes.statusText}`;
          } else {
            const listData = (await listRes.json()) as {
              data?: { id: string; name: string; status: string }[];
            };
            const targetDomain = effectiveFromDomain.toLowerCase();
            const domainEntry = listData.data?.find((d) => d.name.toLowerCase() === targetDomain);
            if (!domainEntry) {
              verifyError = `Domínio de envio "${effectiveFromDomain}" não encontrado na conta do Resend.`;
            } else if (domainEntry.status !== 'verified') {
              verifyError = `Domínio de envio "${effectiveFromDomain}" não está verificado (status atual: ${domainEntry.status}).`;
            } else {
              isVerified = true;
            }
          }
        } catch (err: any) {
          verifyError = `Falha ao conectar com o Resend para verificar domínio: ${err.message}`;
        }

        if (!isVerified) {
          console.error(`❌ Falha de verificação do domínio: ${verifyError}`);
          
          await db.insert(emailLogs).values({
            toEmail: to,
            subject: parsedPayload.subject ?? 'Notificação',
            template,
            htmlBody: '',
            status: 'failed',
            error: verifyError,
            metadata: {
              device: (props as any).device ?? null,
              ip: (props as any).ip ?? null,
              loginAt: (props as any).loginAt ?? null,
            },
          });

          channel.nack(msg, false, false);
          return;
        }

        // 3. Rate Limiting: Máximo de 1 e-mail do mesmo template por minuto para o mesmo destinatário
        const timeWindow = new Date(Date.now() - 1 * 60 * 1000);
        const recentSends = await db
          .select()
          .from(emailLogs)
          .where(
            and(
              eq(emailLogs.toEmail, to),
              eq(emailLogs.template, template),
              eq(emailLogs.status, 'sent'),
              gt(emailLogs.createdAt, timeWindow)
            )
          );

        if (recentSends.length > 0) {
          const errMsg = `Envio bloqueado por limite de taxa (anti-spam). Máximo 1 e-mail por minuto para ${to}.`;
          console.warn(`⚠️ ${errMsg}`);

          await db.insert(emailLogs).values({
            toEmail: to,
            subject: parsedPayload.subject ?? 'Notificação',
            template,
            htmlBody: '',
            status: 'failed',
            error: errMsg,
            metadata: {
              device: (props as any).device ?? null,
              ip: (props as any).ip ?? null,
              loginAt: (props as any).loginAt ?? null,
            },
          });

          // Confirmar para retirar da fila (evitar DLQ e retentativas)
          channel.ack(msg);
          return;
        }

        // 4. Gerar assunto padrão por template
        const subjectMap: Record<TemplateName, string> = {
          login_notification: 'Novo acesso detectado na sua conta',
          invite_member: 'Você foi convidado para colaborar em um espaço clínico',
        };
        const subject = parsedPayload.subject ?? subjectMap[template] ?? 'Notificação';

        // 5. Renderizar HTML a partir do template react
        const htmlBody = renderEmailTemplate(template, props as TemplatePropsMap[typeof template]);

        // 6. Enviar via Resend (sempre com a API key da plataforma, domínio do tenant)
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
          const { error } = await resend.emails.send({
            from: fromAddress,
            to,
            subject,
            html: htmlBody,
          });

          if (error) {
            sendError = error.message;
            emailStatus = 'failed';
            console.error(`❌ Resend retornou erro para [${to}]:`, error);
          } else {
            console.log(`✅ E-mail [${template}] enviado para ${to}`);
          }
        } catch (sendErr: any) {
          sendError = sendErr?.message ?? 'Erro desconhecido no envio';
          emailStatus = 'failed';
          console.error(`❌ Falha ao enviar e-mail para [${to}]:`, sendErr);
        }

        // 7. Persistir log (sempre, independente do resultado)
        await db.insert(emailLogs).values({
          toEmail: to,
          subject,
          template,
          htmlBody,
          status: emailStatus,
          error: sendError,
          metadata: {
            device: (props as any).device ?? null,
            ip: (props as any).ip ?? null,
            loginAt: (props as any).loginAt ?? null,
            tenantId: tenantId ?? null,
            fromDomain: effectiveFromDomain,
          },
        });

        // Sempre ack
        channel.ack(msg);
      } catch (error: any) {
        console.error('❌ Erro crítico ao processar e-mail:', error);
        // Tentar salvar log de falha se temos dados suficientes
        if (parsedPayload?.to) {
          try {
            await db.insert(emailLogs).values({
              toEmail: parsedPayload.to,
              subject: parsedPayload.subject ?? 'Desconhecido',
              template: parsedPayload.template ?? 'unknown',
              htmlBody: '',
              status: 'failed',
              error: error?.message ?? 'Erro de processamento',
              metadata: {},
            });
          } catch { /* ignora erro secundário */ }
        }
        channel.nack(msg, false, false);
      }
    });

    // Envia primeiro heartbeat em 5s e depois a cada 60s
    startWorkerHeartbeats(channel);

    console.log('🚀 Worker ativo e consumindo filas.');

  } catch (error) {
    console.error('❌ Falha crítica ao inicializar workers:', error);
    process.exit(1);
  }
}

// ── Função para Enviar Batimentos do Worker ──────────────────────────────────
function startWorkerHeartbeats(channel: any) {
  const checkWorker = async () => {
    const start = Date.now();
    try {
      const lagStart = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const lag = Date.now() - lagStart;

      const memory = process.memoryUsage();
      const memoryUsagePercent = memory.heapUsed / memory.heapTotal;
      const isDegraded = lag > 250 || memoryUsagePercent > 0.95;

      const payload = {
        serviceName: 'Workers',
        status: isDegraded ? ('degraded' as const) : ('operational' as const),
        responseTimeMs: Date.now() - start,
        message: lag > 100 ? `Worker Event Loop Lag: ${lag}ms` : null,
      };

      channel.publish(
        'psi.direct',
        'system.status',
        Buffer.from(JSON.stringify(payload))
      );
    } catch (e: any) {
      console.error('❌ Erro ao enviar heartbeat do Worker:', e);
    }
  };

  setTimeout(() => {
    checkWorker().catch(err => console.error(err));
  }, 5000);

  setInterval(() => {
    checkWorker().catch(err => console.error(err));
  }, 60000);
}

main();
