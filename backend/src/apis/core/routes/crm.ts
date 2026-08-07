import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { contacts, pipelineColumns, interactionHistory, tenants } from '../../../shared/schema';
import { eq, and, or } from 'drizzle-orm';

const WebhookQuerySchema = z.object({
  tenant_id: z.string().uuid('ID do Tenant inválido'),
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
});

export async function crmRoutes(fastifyApp: FastifyInstance) {
  const fastify = fastifyApp.withTypeProvider<ZodTypeProvider>();

  // POST /v1/crm/webhook?tenant_id={{TENANT_ID}}
  fastify.post(
    '/webhook',
    {
      schema: {
        querystring: WebhookQuerySchema,
        body: WebhookBodySchema,
      },
    },
    async (request, reply) => {
      const { tenant_id } = request.query;
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
      } = request.body;

      try {
        // 1. Normalizar telefone e e-mail para comparação
        const normalizedPhone = phone ? phone.trim().replace(/\D/g, '') : null;
        const normalizedEmail = email ? email.trim().toLowerCase() : null;

        // 2. Verificar duplicados (por telefone ou por e-mail no mesmo tenant)
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
              eq(contacts.tenantId, tenant_id),
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
            tenantId: tenant_id,
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

        // 3. Buscar tenant para obter origens de tráfego configuradas
        const tenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, tenant_id),
        });

        if (!tenant) {
          return reply.status(404).send({
            error: 'Tenant não encontrado',
            message: 'O tenant_id fornecido não corresponde a nenhuma clínica registrada.',
          });
        }

        // 4. Mapear e resolver origem do lead com base nas UTMs enviadas
        let resolvedSource = source;
        const utmSource = utm_source;

        // trafficSources pode ser string[] ou objeto[] {id, name, utm_source, ...}
        const rawSources = tenant.trafficSources || [];
        type SourceObj = { id?: string; name: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; };
        const sourcesNormalized: SourceObj[] = rawSources.map((s: string | SourceObj) =>
          typeof s === 'string' ? { name: s } : s
        );

        if (utmSource) {
          const utmLower = utmSource.toLowerCase();

          // 1. Tenta match direto no campo utm_source dos objetos cadastrados
          const byUtmField = sourcesNormalized.find(
            (s) => s.utm_source && s.utm_source.toLowerCase() === utmLower
          );

          if (byUtmField) {
            resolvedSource = byUtmField.name;
          } else {
            // 2. Tenta match parcial no nome da origem
            const byName = sourcesNormalized.find((s) => {
              const sLower = s.name.toLowerCase();
              return sLower.includes(utmLower) || utmLower.includes(sLower);
            });

            if (byName) {
              resolvedSource = byName.name;
            } else {
              // 3. Aliases comuns
              if (utmLower === 'ig' || utmLower === 'instagram') {
                const igSource = sourcesNormalized.find((s) => s.name.toLowerCase().includes('instagram'));
                resolvedSource = igSource ? igSource.name : 'Instagram';
              } else if (utmLower === 'fb' || utmLower === 'facebook' || utmLower === 'meta') {
                const fbSource = sourcesNormalized.find((s) => s.name.toLowerCase().includes('facebook'));
                resolvedSource = fbSource ? fbSource.name : 'Facebook Ads';
              } else if (utmLower === 'google' || utmLower === 'gads') {
                const gSource = sourcesNormalized.find((s) => s.name.toLowerCase().includes('google'));
                resolvedSource = gSource ? gSource.name : 'Google Ads';
              } else {
                // Capitaliza e usa a própria utm_source como nome de origem
                resolvedSource = utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
              }
            }
          }
        } else if (!resolvedSource) {
          resolvedSource = tenant.defaultTrafficSource || 'Webhook';
        }

        // 5. Lead Novo: busca primeiro estágio do funil do tenant
        const firstColumn = await db.query.pipelineColumns.findFirst({
          where: eq(pipelineColumns.tenantId, tenant_id),
          orderBy: [pipelineColumns.order],
        });

        const initialStatus = firstColumn ? firstColumn.name : 'Contato Inicial';

        // 6. Inserir novo contato no CRM
        const [newContact] = await db
          .insert(contacts)
          .values({
            tenantId: tenant_id,
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
          })
          .returning();

        // 5. Inserir log inicial na timeline do contato
        const startLogNotes = `Contato criado automaticamente via Webhook.\n` +
          `Origem da Campanha (UTM): ${utm_source || 'Direto'} / ${utm_medium || '-'} / ${utm_campaign || '-'}`;

        await db.insert(interactionHistory).values({
          contactId: newContact.id,
          tenantId: tenant_id,
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
        return reply.status(500).send({
          error: 'Erro interno',
          message: err.message || 'Falha ao processar a captura do contato.',
        });
      }
    }
  );
}
