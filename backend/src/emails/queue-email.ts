import { publishToQueue } from '../shared/queue';
import { db } from '../shared/db';
import { emailLogs } from '../shared/schema';
import { LoginNotificationProps } from './templates/login-notification';
import { InviteMemberProps } from './templates/invite-member';
import { ResetPasswordProps } from './templates/reset-password';

// ── Base de Metadados de E-mail para Tracing ──────────────────────────────
export interface EmailTracingMetadata {
  requestId?: string;
  sessionId?: string;
  workspaceId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export type BaseEmailPayload = {
  emailLogId?: string;
  to: string;
  subject?: string;
  tenantId?: string;
  userId?: string;
  senderId?: string;
  retryCount?: number;
  metadata?: EmailTracingMetadata;
};

// ── Discriminated union de todos os payloads de e-mail ───────────────────
export type EmailPayload =
  | (BaseEmailPayload & { template: 'login_notification'; props: LoginNotificationProps })
  | (BaseEmailPayload & { template: 'invite_member'; props: InviteMemberProps })
  | (BaseEmailPayload & { template: 'reset_password'; props: ResetPasswordProps });

const QUEUE_NAME = 'email.transactional';
const ROUTING_KEY = 'email.transactional';

const subjectMap: Record<string, string> = {
  login_notification: 'Novo acesso detectado na sua conta',
  invite_member: 'Você foi convidado para colaborar em um espaço clínico',
  reset_password: 'Redefinição de senha solicitada',
};

/**
 * Enfileira um e-mail transacional para envio assíncrono pelo worker.
 * Cria o registro inicial pendente no banco para garantir id de rastreio atômico.
 */
export async function queueEmail(payload: EmailPayload): Promise<boolean> {
  try {
    let emailLogId = payload.emailLogId;

    // Se ainda não temos um emailLogId, cria o registro inicial pendente no banco
    if (!emailLogId) {
      try {
        const defaultSubject = subjectMap[payload.template] ?? 'Notificação';
        const [inserted] = await db
          .insert(emailLogs)
          .values({
            toEmail: payload.to,
            subject: payload.subject ?? defaultSubject,
            template: payload.template,
            htmlBody: '',
            status: 'pending',
            retryCount: payload.retryCount ?? 0,
            metadata: {
              ...(payload.metadata || {}),
              tenantId: payload.tenantId ?? null,
              userId: payload.userId ?? null,
            },
          })
          .returning({ id: emailLogs.id });
        
        emailLogId = inserted?.id;
      } catch (dbErr) {
        console.warn('⚠️ Falha ao criar registro pendente em email_logs, prosseguindo com envio assíncrono:', dbErr);
      }
    }

    const result = await publishToQueue(ROUTING_KEY, {
      ...payload,
      emailLogId,
      _queuedAt: new Date().toISOString(),
    });

    if (result) {
      console.log(`📧 E-mail enfileirado [${payload.template}] para ${payload.to} (ID: ${emailLogId ?? 's/id'})`);
    } else {
      console.warn(`⚠️ Falha ao publicar e-mail [${payload.template}] na fila ${QUEUE_NAME}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Erro ao enfileirar e-mail [${payload.template}]:`, error);
    return false;
  }
}
