import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { contacts, pipelineColumns, interactionHistory, workspaces } from '../../../shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { resolveTrafficSource } from '../../../shared/resolveTrafficSource';
import { log } from '../../../shared/queue';

const WebhookQuerySchema = z.object({
  workspace_id: z.string().uuid('ID do Workspace inválido').optional(),
  tenant_id: z.string().uuid('ID do Workspace inválido').optional(),
});

const WebhookBodySchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  phone: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  custom_field_values: z.record(z.any()).optional().default({}),
});

export async function crmRoutes(fastifyApp: FastifyInstance) {
  const fastify = fastifyApp.withTypeProvider<ZodTypeProvider>();

  // POST /v1/crm/webhook?workspace_id={{WORKSPACE_ID}}
  fastify.post(
    '/webhook',
    {
      schema: {
        querystring: WebhookQuerySchema,
        body: WebhookBodySchema,
      },
    },
    async (request, reply) => {
      const query = request.query as any;
      const targetWorkspaceId = query.workspace_id || query.tenant_id;
      if (!targetWorkspaceId) {
        return reply.status(400).send({ error: 'Bad Request', message: 'workspace_id é obrigatório.' });
      }

      const {
        name,
        phone,
        email,
        notes,
        source,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        custom_field_values,
      } = request.body;

      try {
        // 1. Buscar workspace para verificar se existe e validar o webhookSecret
        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, targetWorkspaceId),
        });

        if (!workspace) {
          return reply.status(404).send({
            error: 'Workspace não encontrado',
            message: 'O workspace_id fornecido não corresponde a nenhuma clínica registrada.',
          });
        }

        // 2. Validar Secret enviado via Header
        const incomingSecret =
          (request.headers['x-webhook-secret'] as string) ||
          (request.headers['x-secret'] as string) ||
          (request.headers['authorization'] as string)?.replace(/^Bearer\s+/i, '');

        if (!workspace.webhookSecret || workspace.webhookSecret.trim() === '') {
          log({
            name: 'crm.webhook_secret_not_configured',
            type: 'audit',
            severity: 'warning',
            serviceName: 'core-api',
            message: `Tentativa de acesso por webhook no workspace [${workspace.name}] sem segredo (secret) configurado.`,
            workspaceId: targetWorkspaceId,
            metadata: { requestId: (request.raw as any).requestId, workspaceName: workspace.name },
          }).catch(() => {});
          return reply.status(401).send({
            error: 'Não autorizado',
            message: 'O secret do webhook não foi configurado para este workspace.',
          });
        }

        if (incomingSecret !== workspace.webhookSecret) {
          log({
            name: 'crm.webhook_unauthorized',
            type: 'audit',
            severity: 'warning',
            serviceName: 'core-api',
            message: `Tentativa não autorizada de webhook com segredo (secret) inválido no workspace [${workspace.name}].`,
            workspaceId: targetWorkspaceId,
            metadata: { requestId: (request.raw as any).requestId, workspaceName: workspace.name },
          }).catch(() => {});
          return reply.status(401).send({
            error: 'Não autorizado',
            message: 'Secret do webhook inválido ou ausente.',
          });
        }

        // 3. Normalizar telefone e e-mail para comparação
        const normalizedPhone = phone ? phone.trim().replace(/\D/g, '') : null;
        const normalizedEmail = email ? email.trim().toLowerCase() : null;

        // 4. Verificar duplicados (por telefone ou por e-mail no mesmo workspace)
        let existingContact = null;

        if (normalizedPhone || normalizedEmail) {
          const conditions = [];
          if (normalizedPhone) {
            conditions.push(eq(contacts.phone, normalizedPhone));
          }
          if (normalizedEmail) {
            conditions.push(eq(contacts.email, normalizedEmail));
          }

          existingContact = await db.query.contacts.findFirst({
            where: and(
              eq(contacts.workspaceId, targetWorkspaceId),
              or(...conditions)
            ),
          });
        }

        if (existingContact) {
          // Lead Duplicado: registra observações na timeline e não duplica cartão
          const logNotes = `Tentativa de re-cadastro via Webhook.\n` +
            `Origem: ${source || 'Não especificada'}\n` +
            `UTM Source: ${utm_source || '-'}\n` +
            `UTM Medium: ${utm_medium || '-'}\n` +
            `UTM Campaign: ${utm_campaign || '-'}\n` +
            `Observações recebidas: ${notes || 'Nenhuma'}`;

          await db.insert(interactionHistory).values({
            contactId: existingContact.id,
            workspaceId: targetWorkspaceId,
            type: 'comment',
            notes: logNotes,
          });

          return reply.status(200).send({
            success: true,
            duplicate: true,
            contact: {
              id: existingContact.id,
              name: existingContact.name,
              status: existingContact.status,
            },
          });
        }


        // 4. Resolver origem do lead com base nas UTMs enviadas
        const resolvedSource = resolveTrafficSource(workspace as any, utm_source, 'Webhook') || source || 'Webhook';


        // 5. Lead Novo: busca primeiro estágio do funil do workspace
        const firstColumn = await db.query.pipelineColumns.findFirst({
          where: eq(pipelineColumns.workspaceId, targetWorkspaceId),
          orderBy: [pipelineColumns.order],
        });

        const initialStatus = firstColumn ? firstColumn.name : 'Contato Inicial';

        // 6. Inserir novo contato no CRM
        const [newContact] = await db
          .insert(contacts)
          .values({
            workspaceId: targetWorkspaceId,
            pipelineColumnId: firstColumn?.id || null,
            name: name.trim(),
            phone: phone ? phone.trim() : null,
            email: normalizedEmail || null,
            status: initialStatus,
            source: resolvedSource,
            screeningNotes: notes || null,
            utmSource: utm_source || null,
            utmMedium: utm_medium || null,
            utmCampaign: utm_campaign || null,
            utmTerm: utm_term || null,
            utmContent: utm_content || null,
            customFieldValues: custom_field_values || {},
          })
          .returning();

        // 7. Inserir log inicial na timeline do contato
        const startLogNotes = `Contato criado automaticamente via Webhook.\n` +
          `Origem da Campanha (UTM): ${utm_source || 'Direto'} / ${utm_medium || '-'} / ${utm_campaign || '-'}`;

        await db.insert(interactionHistory).values({
          contactId: newContact.id,
          workspaceId: targetWorkspaceId,
          type: 'comment',
          notes: startLogNotes,
        });

        return reply.status(201).send({
          success: true,
          duplicate: false,
          contact: {
            id: newContact.id,
            name: newContact.name,
            status: newContact.status,
            source: newContact.source,
          },
        });
      } catch (err: any) {
        fastify.log.error(err);
        log({
          name: 'crm.webhook_error',
          type: 'error',
          severity: 'error',
          serviceName: 'core-api',
          message: err.message || String(err),
          stack: err.stack,
          workspaceId: targetWorkspaceId,
          url: request.url,
          userAgent: (request.headers['user-agent'] as string) || null,
          metadata: { requestId: (request.raw as any).requestId },
        }).catch(() => {});
        return reply.status(500).send({
          error: 'Erro interno',
          message: err.message || 'Falha ao processar a captura do contato.',
        });
      }
    }
  );
}
