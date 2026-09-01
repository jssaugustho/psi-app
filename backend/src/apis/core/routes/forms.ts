import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { screeningForms, capturePages, contacts, pipelineColumns, interactionHistory, workspaceMembers, workspaces, visualIdentities, customFieldDefinitions } from '../../../shared/schema';
import { eq, and, count } from 'drizzle-orm';
import { verifyUserJwt } from '../../../shared/auth';
import { publishRealtime } from '../../../shared/queue';
import { resolveTrafficSource } from '../../../shared/resolveTrafficSource';

const defaultFormFlow = {
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 80, y: 150 },
      data: {
        title: "Triagem Clínica Inicial",
        subtitle: "Preencha as informações abaixo para agendarmos sua primeira sessão.",
        isRequired: true,
        buttonText: "Iniciar Triagem"
      }
    },
    {
      id: "nome",
      type: "nome",
      position: { x: 460, y: 150 },
      data: {
        title: "Qual é o seu nome completo?",
        placeholder: "Escreva seu nome completo...",
        isRequired: true,
        buttonText: "Avançar"
      }
    },
    {
      id: "maioridade",
      type: "maioridade",
      position: { x: 840, y: 150 },
      data: {
        title: "Você é maior de idade?",
        subtitle: "Caso seja menor de 18 anos, solicitaremos os dados do responsável legal.",
        isRequired: true,
        options: [
          { label: "Sim, sou maior de 18 anos", value: "Sim" },
          { label: "Não, sou menor de idade", value: "Não" }
        ],
        buttonText: "Avançar"
      }
    },
    {
      id: "celular",
      type: "celular",
      position: { x: 1220, y: 150 },
      data: {
        title: "Qual é o seu WhatsApp para contato?",
        subtitle: "Usaremos para confirmar o horário e enviar o link da sessão.",
        placeholder: "(11) 99999-9999",
        isRequired: true,
        buttonText: "Avançar"
      }
    },
    {
      id: "emergencia",
      type: "emergencia",
      position: { x: 1600, y: 150 },
      data: {
        title: "Contato de Emergência",
        subtitle: "Informe nome, telefone e parentesco de uma pessoa de confiança para suporte em caso de necessidade.",
        isRequired: false,
        buttonText: "Avançar"
      }
    },
    {
      id: "contrato",
      type: "contrato",
      position: { x: 1980, y: 150 },
      data: {
        title: "Termo de Consentimento e Sigilo Profissional",
        subtitle: "Leia e confirme para concluir sua solicitação de agendamento.",
        contractText: "Ao prosseguir, você declara estar ciente de que os atendimentos psicológicos são realizados em conformidade com o Código de Ética Profissional do Psicólogo e as diretrizes do Conselho Federal de Psicologia (CFP). As informações fornecidas são confidenciais, protegidas por sigilo profissional e tratadas nos termos da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).",
        isRequired: true,
        buttonText: "Concluir Triagem"
      }
    }
  ],
  edges: [
    { id: "e-start-nome", source: "start", target: "nome" },
    { id: "e-nome-maioridade", source: "nome", target: "maioridade" },
    { id: "e-maioridade-celular", source: "maioridade", target: "celular", sourceHandle: "source-maior" },
    { id: "e-celular-emergencia", source: "celular", target: "emergencia" },
    { id: "e-emergencia-contrato", source: "emergencia", target: "contrato" }
  ],
  settings: {
    successAction: "whatsapp" as const,
    whatsappMessageTemplate: "Olá! Preenchi a triagem inicial pelo seu site e gostaria de agendar minha sessão. Meu nome é {{nome}}."
  }
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

function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.substring(10, 11))) return false;

  return true;
}

function validateFlow(formFlow: any): string[] {
  const errors: string[] = [];
  const nodes = formFlow?.nodes || [];
  const edges = formFlow?.edges || [];

  if (nodes.length === 0) {
    errors.push("O formulário não possui blocos.");
    return errors;
  }

  // 1. Check for required template nodes (Nome, WhatsApp/Celular e Maioridade)
  const requiredTypes = ['nome', 'celular', 'maioridade'];
  for (const rType of requiredTypes) {
    const hasNode = nodes.some((n: any) => n.type === rType);
    if (!hasNode) {
      const labelMap: Record<string, string> = {
        nome: 'NOME COMPLETO',
        celular: 'WHATSAPP / CELULAR',
        maioridade: 'MAIORIDADE'
      };
      errors.push(`O bloco obrigatório '${labelMap[rType] || rType.toUpperCase()}' deve estar presente no fluxo.`);
    }
  }

  // 2. Check connections
  const startNode = nodes.find((n: any) => n.type === 'start');
  if (!startNode) {
    errors.push("O bloco de 'Início' é obrigatório.");
  } else {
    const hasStartEdge = edges.some((e: any) => e.source === startNode.id);
    if (!hasStartEdge) {
      errors.push("O bloco de 'Início' deve estar conectado a outro bloco.");
    }
  }

  for (const node of nodes) {
    if (node.type === 'end' || node.type === 'start') continue;

    // Check if the node has an incoming connection (except start node)
    const hasIncoming = edges.some((e: any) => e.target === node.id);
    if (!hasIncoming) {
      errors.push(`O bloco '${node.data?.title || node.id}' está órfão (não possui conexão de entrada).`);
    }

    // Node-specific checks
    if (node.type === 'seletor') {
      const options = node.data?.options || [];
      if (options.length === 0) {
        errors.push(`O bloco de escolha única '${node.data?.title || node.id}' deve conter pelo menos uma opção.`);
      }
    }

    if (node.type === 'contrato') {
      const contractText = node.data?.contractText || '';
      if (!contractText.trim()) {
        errors.push(`O termo do bloco de contrato está em branco.`);
      }
    }

    // Check if custom field node has a variableKey mapped
    const isCustomField = ['texto', 'paragrafo', 'seletor'].includes(node.type);
    if (isCustomField && !node.data?.variableKey) {
      errors.push(`O bloco personalizado '${node.data?.title || node.id}' deve estar associado a uma variável do CRM.`);
    }
  }

  return errors;
}

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
          fontHeading: themeConfig?.fontHeading || visualIdentity?.fontHeading || 'Playfair Display',
          fontBody: themeConfig?.fontBody || visualIdentity?.fontBody || 'Inter',
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

  // GET /v1/crm/forms/:id
  fastify.get(
    '/:id',
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Não autorizado' });
      }

      try {
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const { id } = request.params as any;

        const form = await db.query.screeningForms.findFirst({
          where: eq(screeningForms.id, id),
        });

        if (!form) {
          return reply.status(404).send({ error: 'Formulário não encontrado' });
        }

        const member = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, decoded.sub),
            eq(workspaceMembers.workspaceId, form.workspaceId)
          ),
        });

        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, form.workspaceId),
        });

        if (!member && workspace?.ownerId !== decoded.sub) {
          return reply.status(403).send({ error: 'Acesso negado' });
        }

        return reply.send({ success: true, form });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );

  // PUT /v1/crm/forms/:id
  fastify.put(
    '/:id',
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Não autorizado' });
      }

      try {
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const { id } = request.params as any;
        const body = request.body as any;
        const { titleDraft, slugDraft, themeConfigDraft, formFlowDraft, isPublish } = body;

        const form = await db.query.screeningForms.findFirst({
          where: eq(screeningForms.id, id),
        });

        if (!form) {
          return reply.status(404).send({ error: 'Formulário não encontrado' });
        }

        const member = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, decoded.sub),
            eq(workspaceMembers.workspaceId, form.workspaceId)
          ),
        });

        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, form.workspaceId),
        });

        if (!member && workspace?.ownerId !== decoded.sub) {
          return reply.status(403).send({ error: 'Acesso negado' });
        }

        if (isPublish) {
          const errors = validateFlow(formFlowDraft);
          if (errors.length > 0) {
            return reply.status(400).send({
              error: 'Bad Request',
              message: 'Erro de validação do formulário.',
              validationErrors: errors,
            });
          }
        }

        // Auto-register custom fields
        const draftNodes = formFlowDraft?.nodes || [];
        for (const node of draftNodes) {
          if (node.data?.variableKey) {
            const key = node.data.variableKey;
            const name = node.data.variableLabel || node.data.title || key;
            const type = node.data.variableType || (node.type === 'seletor' ? 'select' : 'text');
            const options = node.data.options ? node.data.options.map((o: any) => o.value || o.label) : null;

            const existing = await db.query.customFieldDefinitions.findFirst({
              where: and(
                eq(customFieldDefinitions.workspaceId, form.workspaceId),
                eq(customFieldDefinitions.key, key)
              ),
            });

            if (!existing) {
              await db.insert(customFieldDefinitions).values({
                workspaceId: form.workspaceId,
                key,
                name,
                type,
                options,
              });
            }
          }
        }

        const currentDraft = (form.draftData as any) || {};
        const newDraft = {
          title: titleDraft !== undefined ? titleDraft : currentDraft.title,
          slug: slugDraft !== undefined ? slugDraft : currentDraft.slug,
          themeConfig: themeConfigDraft !== undefined ? themeConfigDraft : currentDraft.themeConfig,
          formFlow: formFlowDraft !== undefined ? formFlowDraft : currentDraft.formFlow,
        };

        const updatePayload: Record<string, any> = {
          draftData: newDraft,
          updatedAt: new Date(),
        };

        if (isPublish) {
          updatePayload.title = newDraft.title || form.title;
          updatePayload.slug = newDraft.slug || form.slug;
          updatePayload.themeConfig = newDraft.themeConfig || form.themeConfig;
          updatePayload.formFlow = newDraft.formFlow || form.formFlow;
          updatePayload.isActive = true;
        }

        const [updatedForm] = await db
          .update(screeningForms)
          .set(updatePayload)
          .where(eq(screeningForms.id, id))
          .returning();

        publishRealtime({
          entity: 'form',
          action: 'updated',
          tenantId: form.workspaceId,
          data: updatedForm,
        });

        return reply.send({ success: true, form: updatedForm });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );

  // DELETE /v1/crm/forms/:id
  fastify.delete(
    '/:id',
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Não autorizado' });
      }

      try {
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const { id } = request.params as any;

        const form = await db.query.screeningForms.findFirst({
          where: eq(screeningForms.id, id),
        });

        if (!form) {
          return reply.status(404).send({ error: 'Formulário não encontrado' });
        }

        const member = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, decoded.sub),
            eq(workspaceMembers.workspaceId, form.workspaceId)
          ),
        });

        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, form.workspaceId),
        });

        if (!member && workspace?.ownerId !== decoded.sub) {
          return reply.status(403).send({ error: 'Acesso negado' });
        }

        await db.delete(screeningForms).where(eq(screeningForms.id, id));

        return reply.send({ success: true, message: 'Formulário removido com sucesso.' });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );

  // GET /v1/crm/forms/public/:slug — busca formulário por slug sem autenticação
  fastify.get('/public/:slug', async (request, reply) => {
    const { slug } = request.params as any;
    try {
      const form = await db.query.screeningForms.findFirst({
        where: and(
          eq(screeningForms.slug, slug),
          eq(screeningForms.isActive, true)
        ),
      });
      if (!form) {
        return reply.status(404).send({ error: 'Formulário não encontrado' });
      }
      // Retorna apenas dados necessários para o frontend público (sem dados sensíveis)
      return reply.send({
        success: true,
        form: {
          id: form.id,
          workspaceId: form.workspaceId,
          title: form.title,
          slug: form.slug,
          formFlow: form.formFlow,
          themeConfig: form.themeConfig,
          isActive: form.isActive,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro interno', message: err.message });
    }
  });

  // GET /v1/crm/forms/custom-fields?workspaceId=...
  fastify.get('/custom-fields', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Não autorizado' });
    }
    try {
      verifyUserJwt(authHeader.split(' ')[1]);
      const queryWorkspaceId = (request.query as any)?.workspaceId || (request.query as any)?.tenantId;
      if (!queryWorkspaceId) {
        return reply.status(400).send({ error: 'workspaceId é obrigatório' });
      }
      const fields = await db.query.customFieldDefinitions.findMany({
        where: eq(customFieldDefinitions.workspaceId, queryWorkspaceId),
        orderBy: (customFieldDefinitions, { asc }) => [asc(customFieldDefinitions.name)],
      });
      return reply.send({ success: true, fields });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro interno', message: err.message });
    }
  });

  // POST /v1/crm/forms/public/submit
  fastify.post(
    '/public/submit',
    { schema: { body: SubmitFormBodySchema } },
    async (request, reply) => {
      const body = request.body as any;
      let targetWorkspaceId = body.workspaceId || body.tenantId;
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

        if (rawCpf && !validateCPF(rawCpf)) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'O CPF informado é inválido.',
          });
        }

        // Resolver workspaceId a partir do formId quando não informado diretamente
        if (!targetWorkspaceId && formId) {
          const formRecord = await db.query.screeningForms.findFirst({
            where: eq(screeningForms.id, formId),
          });
          if (formRecord) targetWorkspaceId = formRecord.workspaceId;
        }
        if (!targetWorkspaceId) {
          return reply.status(400).send({ error: 'workspaceId é obrigatório' });
        }


        const firstColumn = await db.query.pipelineColumns.findFirst({
          where: and(
            eq(pipelineColumns.workspaceId, targetWorkspaceId),
            eq(pipelineColumns.category, 'pendente')
          ),
          orderBy: [pipelineColumns.order],
        });

        const initialStatus = firstColumn ? firstColumn.name : 'Triagem Pendente';

        // Mapeamento de variáveis personalizadas (Typebot-like variables mapping)
        let formFlow = null;
        if (formId) {
          const formRecord = await db.query.screeningForms.findFirst({
            where: eq(screeningForms.id, formId),
          });
          if (formRecord) {
            formFlow = formRecord.formFlow;
          }
        } else if (pageId) {
          const pageRecord = await db.query.capturePages.findFirst({
            where: eq(capturePages.id, pageId),
          });
          if (pageRecord) {
            formFlow = pageRecord.formFlow;
          }
        }

        const customFieldValues: Record<string, any> = {};
        const flowNodes = (formFlow as any)?.nodes || [];
        
        let signedContractContent = null;
        const contratoNode = flowNodes.find((n: any) => n.type === 'contrato');
        if (contratoNode) {
          signedContractContent = contratoNode.data?.contractText || 'Termo de Consentimento aceito pelo paciente.';
        }

        for (const [key, val] of Object.entries(responses)) {
          if (['nome', 'celular', 'email', 'cpf', 'maioridade', 'emergencia', 'contrato', 'responsavelNome', 'responsavelCpf', 'responsavelTelefone'].includes(key)) {
            continue;
          }
          const node = flowNodes.find((n: any) => n.id === key);
          if (node && node.data?.variableKey) {
            customFieldValues[node.data.variableKey] = val;
          } else {
            customFieldValues[key] = val;
          }
        }

        // Responsável Legal
        const parentName = responses.responsavelNome || null;
        const parentCpf = responses.responsavelCpf || null;
        const parentPhone = responses.responsavelTelefone || null;

        const cleanParentCpf = parentCpf ? parentCpf.replace(/\D/g, '') : null;
        const cleanParentPhone = parentPhone ? ('+' + parentPhone.replace(/\D/g, '')) : null;

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

        // Buscar workspace e resolver fonte de tráfego
        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, targetWorkspaceId),
        });
        if (!workspace) {
          return reply.status(404).send({ error: 'Workspace não encontrado' });
        }
        const resolvedSource = resolveTrafficSource(
          workspace as any,
          utmSource,
          pageId ? 'Landing Page (Triagem)' : 'Formulário Direto (Link)'
        );

        const [newContact] = await db
          .insert(contacts)
          .values({
            workspaceId: targetWorkspaceId,
            pipelineColumnId: firstColumn?.id || null,
            name: rawName,
            phone: rawPhone ? ('+' + rawPhone.replace(/\D/g, '')) : null,
            email: rawEmail || null,
            status: initialStatus,
            source: resolvedSource,
            screeningNotes,
            isMinor: rawIsMinor,
            acceptedContractAt: responses.contrato ? new Date() : null,
            ageConfirmedAt: responses.maioridade ? new Date() : null,
            signedContractContent,
            consentIp: request.ip,
            consentUserAgent: request.headers['user-agent'] || null,
            parentName,
            parentCpf: cleanParentCpf,
            parentPhone: cleanParentPhone,
            emergencyContactName: emergencyObj.nome || null,
            emergencyContactRelation: emergencyObj.relacao || null,
            emergencyContactPhone: emergencyObj.telefone ? ('+' + emergencyObj.telefone.replace(/\D/g, '')) : null,
            customFieldValues,
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
