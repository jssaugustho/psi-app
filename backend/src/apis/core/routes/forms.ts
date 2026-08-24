import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { screeningForms, capturePages, contacts, pipelineColumns, interactionHistory, workspaceMembers, workspaces, visualIdentities } from '../../../shared/schema';
import { eq, and, count } from 'drizzle-orm';
import { verifyUserJwt } from '../../../shared/auth';
import { publishRealtime } from '../../../shared/queue';

const defaultFormFlow = {
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 100, y: 100 },
      data: { title: "Iniciar Triagem", subtitle: "Leva apenas alguns minutos", isRequired: true }
    },
    {
      id: "nome",
      type: "nome",
      position: { x: 480, y: 100 },
      data: { title: "Qual é o seu nome completo?", placeholder: "Escreva seu nome aqui...", isRequired: true }
    },
    {
      id: "celular",
      type: "celular",
      position: { x: 860, y: 100 },
      data: { title: "Qual o seu número de WhatsApp?", placeholder: "(11) 99999-9999", isRequired: true }
    },
    {
      id: "email",
      type: "email",
      position: { x: 1240, y: 100 },
      data: { title: "Qual o seu e-mail?", placeholder: "exemplo@email.com", isRequired: true }
    },
    {
      id: "cpf",
      type: "cpf",
      position: { x: 1620, y: 100 },
      data: { title: "Qual é o seu CPF?", placeholder: "000.000.000-00", isRequired: true }
    },
    {
      id: "maioridade",
      type: "maioridade",
      position: { x: 2000, y: 100 },
      data: { title: "Você é maior de idade?", subtitle: "Se for menor, solicitaremos os dados do seu responsável legal", options: ["Sim, sou maior de 18 anos", "Não, sou menor de idade"], isRequired: true }
    },
    {
      id: "emergencia",
      type: "emergencia",
      position: { x: 2380, y: 100 },
      data: { title: "Contato de Emergência", subtitle: "Requisito legal para o atendimento psicológico", isRequired: true }
    },
    {
      id: "contrato",
      type: "contrato",
      position: { x: 2760, y: 100 },
      data: { title: "Termo de Consentimento Livre e Esclarecido", subtitle: "Leia e confirme para agendar seu atendimento", isRequired: true }
    },
    {
      id: "end",
      type: "end",
      position: { x: 3140, y: 100 },
      data: { title: "Triagem Concluída!", subtitle: "Obrigado por responder. Em breve entraremos em contato.", showWhatsappButton: true }
    }
  ],
  edges: [
    { id: "e-start-nome", source: "start", target: "nome" },
    { id: "e-nome-celular", source: "nome", target: "celular" },
    { id: "e-celular-email", source: "celular", target: "email" },
    { id: "e-email-cpf", source: "email", target: "cpf" },
    { id: "e-cpf-maioridade", source: "cpf", target: "maioridade" },
    { id: "e-maioridade-emergencia", source: "maioridade", target: "emergencia" },
    { id: "e-emergencia-contrato", source: "emergencia", target: "contrato" },
    { id: "e-contrato-end", source: "contrato", target: "end" }
  ]
};

const CreateFormBodySchema = z.object({
  title: z.string().min(1, 'O título é obrigatório'),
  slug: z.string().optional().default(''),
  workspaceId: z.string().uuid('ID do Workspace inválido').optional(),
  tenantId: z.string().uuid('ID do Workspace inválido').optional(),
  themeConfig: z.record(z.any()).optional(),
  formFlow: z.record(z.any()).optional(),
});

const SubmitFormBodySchema = z.object({
  workspaceId: z.string().uuid('ID do Workspace inválido').optional(),
  tenantId: z.string().uuid('ID do Workspace inválido').optional(),
  formId: z.string().uuid('ID do Formulário inválido').optional(),
  pageId: z.string().uuid('ID da Página inválido').optional(),
  responses: z.record(z.any()),
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  utmTerm: z.string().optional().nullable(),
  utmContent: z.string().optional().nullable(),
});

export async function formsRoutes(fastifyApp: FastifyInstance) {
  const fastify = fastifyApp.withTypeProvider<ZodTypeProvider>();

  // GET /v1/crm/forms?workspaceId=...
  fastify.get(
    '/',
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Não autorizado' });
      }

      try {
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const queryWorkspaceId = (request.query as any)?.workspaceId || (request.query as any)?.tenantId;

        if (!queryWorkspaceId) {
          return reply.status(400).send({ error: 'workspaceId é obrigatório' });
        }

        const member = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, decoded.sub),
            eq(workspaceMembers.workspaceId, queryWorkspaceId)
          ),
        });

        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, queryWorkspaceId),
        });

        if (!member && workspace?.ownerId !== decoded.sub) {
          return reply.status(403).send({ error: 'Acesso negado ao workspace' });
        }

        const forms = await db.query.screeningForms.findMany({
          where: eq(screeningForms.workspaceId, queryWorkspaceId),
          orderBy: (screeningForms, { desc }) => [desc(screeningForms.createdAt)],
        });

        const pages = await db.query.capturePages.findMany({
          where: eq(capturePages.workspaceId, queryWorkspaceId),
        });

        const formMetrics = await Promise.all(
          forms.map(async (form) => {
            const linkedPages = pages.filter((p) => p.formId === form.id);
            const [leadCountResult] = await db
              .select({ value: count() })
              .from(contacts)
              .where(eq(contacts.workspaceId, queryWorkspaceId));

            return {
              ...form,
              linkedPagesCount: linkedPages.length,
              leadsCount: leadCountResult?.value || 0,
            };
          })
        );

        return reply.send({ success: true, forms: formMetrics });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );

  // POST /v1/crm/forms
  fastify.post(
    '/',
    { schema: { body: CreateFormBodySchema } },
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Não autorizado' });
      }

      try {
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const body = request.body as any;
        const targetWorkspaceId = body.workspaceId || body.tenantId;
        const { title, slug, themeConfig, formFlow } = body;

        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, targetWorkspaceId),
        });

        if (!workspace) {
          return reply.status(404).send({ error: 'Workspace não encontrado' });
        }

        const member = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, decoded.sub),
            eq(workspaceMembers.workspaceId, targetWorkspaceId)
          ),
        });

        if (!member && workspace.ownerId !== decoded.sub) {
          return reply.status(403).send({ error: 'Acesso negado' });
        }

        const rawSlug = slug || title.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
        const normalizedSlug = rawSlug.trim().toLowerCase().replace(/^\/+|\/+$/g, '') || 'form';

        let finalSlug = normalizedSlug;
        const existingFormWithSlug = await db.query.screeningForms.findFirst({
          where: and(
            eq(screeningForms.workspaceId, targetWorkspaceId),
            eq(screeningForms.slug, normalizedSlug)
          ),
        });

        if (existingFormWithSlug) {
          finalSlug = `${normalizedSlug}-${Date.now().toString().slice(-4)}`;
        }

        const visualIdentity = await db.query.visualIdentities.findFirst({
          where: and(
            eq(visualIdentities.workspaceId, targetWorkspaceId),
            eq(visualIdentities.isWorkspaceDefault, true)
          ),
        });

        const activeTheme = {
          primaryStart: themeConfig?.primaryStart || visualIdentity?.primaryColor || '#7C3AED',
          primaryEnd: themeConfig?.primaryEnd || visualIdentity?.secondaryColor || '#A855F7',
          contrast: themeConfig?.contrast || visualIdentity?.contrastColor || '#FFFFFF',
          fontHeading: themeConfig?.fontHeading || visualIdentity?.fontHeading || 'serif',
          fontBody: themeConfig?.fontBody || visualIdentity?.fontBody || 'sans',
        };

        const activeFlow = formFlow || defaultFormFlow;

        const [newForm] = await db
          .insert(screeningForms)
          .values({
            workspaceId: targetWorkspaceId,
            visualIdentityId: visualIdentity?.id || null,
            title,
            slug: finalSlug,
            isActive: true,
            themeConfig: activeTheme,
            formFlow: activeFlow,
            draftData: {
              title,
              slug: finalSlug,
              themeConfig: activeTheme,
              formFlow: activeFlow,
            },
          })
          .returning();

        publishRealtime({
          entity: 'form',
          action: 'created',
          tenantId: targetWorkspaceId,
          data: newForm,
        });

        return reply.status(201).send({ success: true, form: newForm });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );

  // POST /v1/crm/forms/public/submit
  fastify.post(
    '/public/submit',
    { schema: { body: SubmitFormBodySchema } },
    async (request, reply) => {
      const body = request.body as any;
      const targetWorkspaceId = body.workspaceId || body.tenantId;
      const { formId, pageId, responses, utmSource, utmMedium, utmCampaign, utmTerm, utmContent } = body;

      try {
        const rawName = (responses.nome || '').trim();
        const rawPhone = (responses.celular || '').trim();
        const rawEmail = (responses.email || '').trim();
        const rawCpf = (responses.cpf || '').trim();
        const rawIsMinor = responses.maioridade === 'Não' || responses.maioridade === 'Sim, sou menor de idade';

        if (!rawName) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'O nome do paciente é obrigatório para a triagem.',
          });
        }

        const firstColumn = await db.query.pipelineColumns.findFirst({
          where: and(
            eq(pipelineColumns.workspaceId, targetWorkspaceId),
            eq(pipelineColumns.category, 'pendente')
          ),
          orderBy: [pipelineColumns.order],
        });

        const initialStatus = firstColumn ? firstColumn.name : 'Triagem Pendente';

        let screeningNotes = '=== RESPOSTAS DA TRIAGEM ===\n';
        for (const [key, val] of Object.entries(responses)) {
          if (['nome', 'celular', 'email', 'cpf'].includes(key)) continue;
          if (typeof val === 'object' && val !== null) {
            screeningNotes += `• ${key}: ${JSON.stringify(val)}\n`;
          } else {
            screeningNotes += `• ${key}: ${val}\n`;
          }
        }

        const emergencyObj = responses.emergencia || {};

        const [newContact] = await db
          .insert(contacts)
          .values({
            workspaceId: targetWorkspaceId,
            pipelineColumnId: firstColumn?.id || null,
            name: rawName,
            phone: rawPhone || null,
            email: rawEmail || null,
            status: initialStatus,
            source: pageId ? 'Landing Page (Triagem)' : 'Formulário Direto (Link)',
            screeningNotes,
            isMinor: rawIsMinor,
            acceptedContractAt: responses.contrato ? new Date() : null,
            emergencyContactName: emergencyObj.nome || null,
            emergencyContactRelation: emergencyObj.relacao || null,
            emergencyContactPhone: emergencyObj.telefone || null,
            formId: formId || null,
            capturePageId: pageId || null,
            utmSource: utmSource || null,
            utmMedium: utmMedium || null,
            utmCampaign: utmCampaign || null,
            utmTerm: utmTerm || null,
            utmContent: utmContent || null,
          })
          .returning();

        await db.insert(interactionHistory).values({
          contactId: newContact.id,
          workspaceId: targetWorkspaceId,
          type: 'comment',
          notes: `Triagem concluída e enviada via formulário público.`,
        });

        publishRealtime({
          entity: 'lead',
          action: 'created',
          tenantId: targetWorkspaceId,
          data: newContact,
        });

        return reply.status(201).send({
          success: true,
          contactId: newContact.id,
          name: newContact.name,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Erro interno',
          message: err.message || 'Falha ao processar o envio da triagem.',
        });
      }
    }
  );
}
