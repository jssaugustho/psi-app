import { publishToQueue } from '../shared/queue';
import { LoginNotificationProps } from './templates/login-notification';
import { InviteMemberProps } from './templates/invite-member';
import { ResetPasswordProps } from './templates/reset-password';

// ── Discriminated union de todos os payloads de e-mail ───────────────────
// `tenantId` é opcional: quando fornecido, o worker usará o emailDomain do
// tenant para o endereço remetente. A API key do Resend é sempre a da
// plataforma (platformSettings.resendApiKey) — nunca do tenant filho.
export type EmailPayload =
  | {
      template: 'login_notification';
      to: string;
      subject?: string;
      tenantId?: string;
      props: LoginNotificationProps;
    }
  | {
      template: 'invite_member';
      to: string;
      subject?: string;
      tenantId?: string;
      props: InviteMemberProps;
    }
  | {
      template: 'reset_password';
      to: string;
      subject?: string;
      tenantId?: string;
      props: ResetPasswordProps;
    };
// Ao adicionar novos templates, basta incluir mais variantes aqui.

const QUEUE_NAME = 'email.transactional';
const ROUTING_KEY = 'email.transactional';

/**
 * Enfileira um e-mail transacional para envio assíncrono pelo worker.
 * Retorna `true` se publicado com sucesso, `false` em caso de falha.
 *
 * @example
 * await queueEmail({
 *   template: 'login_notification',
 *   to: 'user@example.com',
 *   props: { userName: 'José', ... },
 * });
 */
export async function queueEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const result = await publishToQueue(ROUTING_KEY, {
      ...payload,
      _queuedAt: new Date().toISOString(),
    });

    if (result) {
      console.log(`📧 E-mail enfileirado [${payload.template}] para ${payload.to}`);
    } else {
      console.warn(`⚠️ Falha ao publicar e-mail [${payload.template}] na fila ${QUEUE_NAME}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Erro ao enfileirar e-mail [${payload.template}]:`, error);
    return false;
  }
}
