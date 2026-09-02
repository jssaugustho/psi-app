import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { capturePages, contacts, pipelineColumns, interactionHistory, workspaceMembers, workspaces, workspaceDomains, visualIdentities, profiles } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { verifyUserJwt } from '../../../shared/auth';
import { checkDomainOnCloudflare, persistDomainStatus } from '../../../shared/domainVerifier';
import { scheduleDomainVerification } from '../../../consumers/domainVerifyConsumer';

// Validation Schemas
const CreatePageBodySchema = z.object({
  title: z.string().min(1, 'O título é obrigatório'),
  slug: z.string().optional().default(''),
  workspaceId: z.string().uuid('ID do Workspace inválido').optional(),
  tenantId: z.string().uuid('ID do Tenant inválido').optional(),
  crp: z.string().optional(),
  approach: z.string().optional(),
  address: z.string().optional(),
  titlePart1: z.string().optional(),
  titlePart2: z.string().optional(),
  description: z.string().optional(),
  whatsappMessageTemplate: z.string().optional(),
  logoText: z.string().optional(),
  primaryStart: z.string().optional(),
  primaryEnd: z.string().optional(),
  contrast: z.string().optional(),
  logoUrl: z.string().optional(),
  siteConfig: z.any().optional(),
});

const SubmitFormBodySchema = z.object({
  workspaceId: z.string().uuid('ID do Workspace inválido').optional(),
  tenantId: z.string().uuid('ID do Tenant inválido').optional(),
  pageId: z.string().uuid('ID da Página inválido'),
  responses: z.record(z.any()),
});

// Default template configs based on Geovanna Bastos landing page layout
const defaultSiteConfig = {
  images: {
    heroBanner: "/LIGHT-THEME-LOGO.webp",
    portrait: "/LIGHT-THEME-LOGO.webp",
    officeSpace: "/LIGHT-THEME-LOGO.webp"
  },
  professional: {
    crp: "06/00000-0",
    approach: "Psicoterapia",
    mapsIframeUrl: "",
    address: "Atendimento Online"
  }
};

const defaultDictionary = {
  nav: {
    about: "Sobre",
    services: "Serviços",
    faq: "Dúvidas",
    contact: "Agendar",
    space: "Consultório"
  },
  hero: {
    badge: "Atendimento Online & Presencial",
    titlePart1: "Terapia para recuperar o seu ",
    titlePart2: "equilíbrio interior",
    description: "Cuidado clínico ético e acolhedor para ajudar você a superar desafios emocionais, desenvolver o autoconhecimento e viver com mais leveza.",
    ctaPrimary: "Agendar Consulta",
    ctaSecondary: "Saiba Mais",
    badgeCrp: "CRP Ativo",
    badgeApproach: "Abordagem TCC",
    badgeEthic: "Sigilo Ético"
  },
  diagnostic: {
    badge: "Especialidades",
    title: "Como a terapia pode ajudar você",
    description: "Encontre um espaço clínico especializado para trabalhar as demandas que impedem o seu bem-estar diário.",
    card1Title: "Ansiedade e Cansaço Físico",
    card1Desc: "Sente que está sempre no seu limite, com a mente acelerada e o corpo exausto? A terapia ajuda a identificar os gatilhos e encontrar formas saudáveis de lidar com o estresse.",
    card2Title: "Dificuldade de Relacionamento",
    card2Desc: "Conflitos frequentes no trabalho, na família ou no namoro? Compreender a sua forma de se relacionar é o primeiro passo para construir conexões mais saudáveis.",
    card3Title: "Busca de Sentido e Propósito",
    card3Desc: "Momento de transição de carreira, luto ou crises existenciais? O suporte terapêutico oferece um espaço de escuta sem julgamentos para você se reconectar consigo mesmo."
  },
  about: {
    badge: "Sua Psicóloga",
    title: "Conheça mais sobre a sua terapeuta",
    description1: "Sou graduada em Psicologia com foco em psicoterapia clínica. Meu compromisso é fornecer um espaço acolhedor e sigiloso para que possamos juntos trabalhar nas suas dores e metas de crescimento pessoal.",
    description2: "Acredito em uma psicologia acessível, ética e integrada, respeitando a subjetividade de cada paciente e oferecendo ferramentas práticas para o dia a dia.",
    badgeTitle: "Psicologia Clínica",
    points: [
      "Especialista em Saúde Mental",
      "Experiência com ansiedade, relacionamentos e burnout",
      "Registro ativo no CRP e atendimento ético"
    ],
    cta: "Fazer Triagem"
  },
  process: {
    badge: "O Processo",
    title: "Como funciona a jornada de terapia",
    description: "Um passo a passo simples focado no seu acolhimento desde o primeiro contato.",
    step1: {
      title: "Triagem Inicial",
      description: "Você preenche o formulário online clicando no botão para que eu entenda suas necessidades principais antes da primeira conversa.",
      cta: "Preencher Formulário"
    },
    step2: {
      title: "Primeiro Contato",
      description: "Eu entrarei em contato pessoalmente via WhatsApp para alinharmos o formato do atendimento (online ou presencial), valores e horários."
    },
    step3: {
      title: "Sessões Regulares",
      description: "Damos início ao processo terapêutico com sessões focadas na sua demanda, construindo ferramentas práticas para a sua saúde mental."
    }
  },
  faq: {
    badge: "FAQ",
    title: "Dúvidas Frequentes",
    description: "Esclareça suas principais dúvidas sobre o processo terapêutico.",
    items: [
      {
        question: "Como funciona o atendimento online?",
        answer: "As sessões online ocorrem por meio de videochamadas seguras (como Google Meet ou Zoom) em salas virtuais criptografadas, garantindo total privacidade e o mesmo nível de acolhimento das sessões presenciais."
      },
      {
        question: "Vocês atendem convênios ou planos de saúde?",
        answer: "Realizamos atendimentos na modalidade particular e emitimos recibos e relatórios específicos para que você possa solicitar o reembolso integral ou parcial junto ao seu plano de saúde."
      },
      {
        question: "Qual é a frequência recomendada das sessões?",
        answer: "Geralmente, as sessões de psicoterapia ocorrem de forma semanal, com duração aproximada de 50 minutos. A frequência pode ser reavaliada ao longo do processo clínico dependendo da necessidade do paciente."
      }
    ]
  },
  space: {
    badge: "O Consultório",
    title: "Nosso Espaço Físico",
    description: "Um ambiente aconchegante, tranquilo e planejado para garantir o seu conforto e privacidade em cada sessão presencial.",
    addressLabel: "Endereço Clínico"
  },
  footer: {
    description: "Cuidado e ética para a sua saúde mental.",
    crpLabel: "Conselho Regional de Psicologia",
    navHeader: "Navegação",
    serviceHeader: "Especialidades",
    servicePoints: ["Terapia TCC", "Ansiedade & Burnout", "Relacionamentos"],
    scheduleLabel: "Horário de Atendimento",
    rights: "Todos os direitos reservados.",
    dev: "Desenvolvido por Psi App",
    devLink: "https://psiapp.com.br"
  }
};

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
    { id: "start-nome", source: "start", target: "nome" },
    { id: "nome-maioridade", source: "nome", target: "maioridade" },
    { id: "maioridade-celular", source: "maioridade", target: "celular", sourceHandle: "source-maior" },
    { id: "celular-emergencia", source: "celular", target: "emergencia" },
    { id: "emergencia-contrato", source: "emergencia", target: "contrato" }
  ],
  settings: {
    successAction: "whatsapp" as const,
    whatsappMessageTemplate: "Olá! Preenchi a triagem inicial pelo seu site e gostaria de agendar minha sessão. Meu nome é {{nome}}."
  }
};

export async function captacaoRoutes(fastifyApp: FastifyInstance) {
  const fastify = fastifyApp.withTypeProvider<ZodTypeProvider>();

  // POST /v1/crm/captacao
  // Ação administrativa: cria nova página baseada no template padrão
  fastify.post(
    '/',
    {
      schema: {
        body: CreatePageBodySchema,
      },
    },
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Não autorizado' });
      }

      try {
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const body = request.body as any;
        const targetWorkspaceId = body.workspaceId || body.tenantId;
        const { title, slug, crp, approach, address, titlePart1, titlePart2, description, whatsappMessageTemplate, logoText, primaryStart, primaryEnd, contrast, logoUrl, siteConfig } = body;

        // 1. Resolver workspace e verificar permissão
        const targetWorkspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, targetWorkspaceId),
        });

        if (!targetWorkspace) {
          return reply.status(404).send({
            error: 'Não Encontrado',
            message: 'Workspace não cadastrado.',
          });
        }

        const isOwner = targetWorkspace.ownerId === decoded.sub;

        const member = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, decoded.sub),
            eq(workspaceMembers.workspaceId, targetWorkspaceId)
          ),
        });

        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, decoded.sub),
        });
        const isAdmin = profile?.role === 'admin';

        const hasAccess = isOwner || member || isAdmin;

        if (!hasAccess) {
          return reply.status(403).send({
            error: 'Proibido',
            message: 'Você não possui acesso para criar páginas neste workspace.',
          });
        }

        // 2. Verificar duplicidade de slug no mesmo workspace
        const normalizedSlug = (slug || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9-]/g, '');

        const duplicate = await db.query.capturePages.findFirst({
          where: and(
            eq(capturePages.workspaceId, targetWorkspaceId),
            eq(capturePages.slug, normalizedSlug)
          ),
        });

        if (duplicate) {
          return reply.status(409).send({
            error: 'Conflito',
            message: normalizedSlug === ''
              ? 'Já existe uma Página Principal (Home) cadastrada para o seu site.'
              : 'Já existe uma página com este endereço neste workspace.',
          });
        }



        const visualIdentity = await db.query.visualIdentities.findFirst({
          where: and(
            eq(visualIdentities.workspaceId, targetWorkspaceId),
            eq(visualIdentities.isWorkspaceDefault, true)
          ),
        });

        const activeLogoUrl = logoUrl || visualIdentity?.logoUrl || targetWorkspace.defaultSiteAvatarUrl || undefined;
        const activeFaviconUrl = visualIdentity?.faviconUrl || undefined;
        const activeLogoConfig = visualIdentity?.logoConfig || {
          mode: 'html',
          text: logoText || targetWorkspace.name || title,
          iconType: 'psi',
        };

        const ownerProfile = targetWorkspace.ownerId ? await db.query.profiles.findFirst({
          where: eq(profiles.id, targetWorkspace.ownerId)
        }) : null;
        const resolvedCrp = ownerProfile?.hasNoCrp ? '' : (ownerProfile?.crp || (targetWorkspace as any).crp || '');

        const customSiteConfig = {
          ...defaultSiteConfig,
          status: siteConfig?.status || 'active',
          isWizardDraft: siteConfig?.isWizardDraft || false,
          currentStep: siteConfig?.currentStep || 1,
          logoUrl: activeLogoUrl,
          faviconUrl: activeFaviconUrl,
          logoConfig: activeLogoConfig,
          theme: {
            colors: {
              primaryStart: primaryStart || visualIdentity?.primaryColor || '#7C3AED',
              primaryEnd: primaryEnd || visualIdentity?.secondaryColor || '#A855F7',
              contrast: contrast || visualIdentity?.contrastColor || '#FFFFFF',
            },
          },
          professional: {
            ...defaultSiteConfig.professional,
            name: logoText || targetWorkspace.name || title,
            crp: crp || resolvedCrp || defaultSiteConfig.professional.crp,
            approach: approach || defaultSiteConfig.professional.approach,
            address: address || defaultSiteConfig.professional.address,
          }
        };

        const customDictionary = {
          ...defaultDictionary,
          hero: {
            ...defaultDictionary.hero,
            titlePart1: titlePart1 || defaultDictionary.hero.titlePart1,
            titlePart2: titlePart2 || defaultDictionary.hero.titlePart2,
            description: description || defaultDictionary.hero.description,
          }
        };

        const customFormFlow = {
          ...defaultFormFlow,
          settings: {
            ...defaultFormFlow.settings,
            whatsappMessageTemplate: whatsappMessageTemplate || defaultFormFlow.settings.whatsappMessageTemplate,
          }
        };

        // 3. Inserir nova página com os presets padrões
        const [newPage] = await db
          .insert(capturePages)
          .values({
            workspaceId: targetWorkspaceId,
            title,
            slug: normalizedSlug,
            isActive: true,
            seoConfig: {
              metaTitle: `${title} | Consultório de Psicologia`,
              metaDescription: description || `Agende sua psicoterapia online ou presencial. Triagem inicial rápida.`,
            },
            siteConfig: customSiteConfig,
            dictionary: customDictionary,
            formFlow: customFormFlow,
          })
          .returning();

        return reply.status(201).send({
          success: true,
          page: newPage,
        });

      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(401).send({ error: 'Não autorizado', message: err.message });
      }
    }
  );

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

  // POST /v1/crm/captacao/public/submit
  // Rota pública para submissão da triagem do paciente
  fastify.post(
    '/public/submit',
    {
      schema: {
        body: SubmitFormBodySchema,
      },
    },
    async (request, reply) => {
      const body = request.body as any;
      const targetWorkspaceId = body.workspaceId || body.tenantId;
      const { pageId, responses } = body;

      try {
        // 1. Extrair informações básicas do paciente
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

        // 2. Resolver o estágio clínico inicial do workspace (categoria "pendente")
        const firstColumn = await db.query.pipelineColumns.findFirst({
          where: and(
            eq(pipelineColumns.workspaceId, targetWorkspaceId),
            eq(pipelineColumns.category, 'pendente')
          ),
          orderBy: [pipelineColumns.order],
        });

        const initialStatus = firstColumn ? firstColumn.name : 'Triagem Pendente';

        // Mapeamento de variáveis personalizadas (Typebot-like variables mapping)
        const pageRecord = await db.query.capturePages.findFirst({
          where: eq(capturePages.id, pageId),
        });
        const formFlow = pageRecord?.formFlow;
        const flowNodes = (formFlow as any)?.nodes || [];

        let signedContractContent = null;
        const contratoNode = flowNodes.find((n: any) => n.type === 'contrato');
        if (contratoNode) {
          signedContractContent = contratoNode.data?.contractText || 'Termo de Consentimento aceito pelo paciente.';
        }

        const customFieldValues: Record<string, any> = {};
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

        // 3. Montar as anotações consolidadas do caso clínico (screeningNotes)
        let screeningNotes = '=== RESPOSTAS DA TRIAGEM ===\n';
        for (const [key, val] of Object.entries(responses)) {
          if (['nome', 'celular', 'email', 'cpf'].includes(key)) continue; // Dados diretos da tabela
          if (typeof val === 'object' && val !== null) {
            screeningNotes += `• ${key}: ${JSON.stringify(val)}\n`;
          } else {
            screeningNotes += `• ${key}: ${val}\n`;
          }
        }

        // Emergência
        const emergencyObj = responses.emergencia || {};
        const emergencyName = emergencyObj.nome || null;
        const emergencyRelation = emergencyObj.relacao || null;
        const emergencyPhone = emergencyObj.telefone || null;

        // 4. Inserir novo lead de triagem na tabela de contatos
        const [newContact] = await db
          .insert(contacts)
          .values({
            workspaceId: targetWorkspaceId,
            pipelineColumnId: firstColumn?.id || null,
            name: rawName,
            phone: rawPhone ? ('+' + rawPhone.replace(/\D/g, '')) : null,
            email: rawEmail || null,
            status: initialStatus,
            source: 'Landing Page (Triagem)',
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
            emergencyContactName: emergencyName,
            emergencyContactRelation: emergencyRelation,
            emergencyContactPhone: emergencyPhone ? ('+' + emergencyPhone.replace(/\D/g, '')) : null,
            customFieldValues,
            capturePageId: pageId || null,
            utmSource: 'Landing Page',
          })
          .returning();

        // 5. Inserir log inicial no histórico de interações do lead
        await db.insert(interactionHistory).values({
          contactId: newContact.id,
          workspaceId: targetWorkspaceId,
          type: 'comment',
          notes: `Triagem concluída e enviada com sucesso pelo paciente via formulário público.`,
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

  // GET /v1/crm/captacao/check-subdomain?slug=...&workspaceId=...
  // Verifica se um subdomínio (slug) está livre para uso
  fastify.get(
    '/check-subdomain',
    async (request, reply) => {
      try {
        const querySlug = (request.query as any)?.slug;
        const queryWorkspaceId = (request.query as any)?.workspaceId || (request.query as any)?.tenantId;

        if (!querySlug || typeof querySlug !== 'string') {
          return reply.status(400).send({ error: 'Bad Request', message: 'Slug é obrigatório.' });
        }

        const normalizedSlug = querySlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (normalizedSlug.length < 2) {
          return reply.send({ available: false, reason: 'Slug muito curto (mínimo 2 caracteres).' });
        }

        // Tentar identificar o workspace do usuário via query ou token JWT
        let currentWorkspaceId: string | null = typeof queryWorkspaceId === 'string' ? queryWorkspaceId : null;
        const authHeader = request.headers.authorization;
        if (!currentWorkspaceId && authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const decoded = verifyUserJwt(authHeader.split(' ')[1]);
            const member = await db.query.workspaceMembers.findFirst({
              where: eq(workspaceMembers.userId, decoded.sub),
            });
            if (member) {
              currentWorkspaceId = member.workspaceId;
            }
          } catch {
            // Se token for inválido, segue verificação global
          }
        }

        // 1. Checar se já existe em algum workspace_domains
        const existingDomain = await db.query.workspaceDomains.findFirst({
          where: eq(workspaceDomains.subdomain, normalizedSlug),
        });

        // 2. Checar se já existe em alguma página de captação
        const existingPage = await db.query.capturePages.findFirst({
          where: eq(capturePages.slug, normalizedSlug),
        });

        let isAvailable = true;
        let reason = 'Subdomínio disponível!';

        if (existingDomain) {
          if (currentWorkspaceId && existingDomain.workspaceId === currentWorkspaceId) {
            isAvailable = true;
            reason = 'Subdomínio pertence ao seu próprio workspace e está disponível!';
          } else {
            isAvailable = false;
            reason = 'Subdomínio já em uso por outro workspace.';
          }
        }

        if (isAvailable && existingPage) {
          if (currentWorkspaceId && existingPage.workspaceId === currentWorkspaceId) {
            isAvailable = true;
            reason = 'Subdomínio pertence ao seu workspace e está disponível!';
          } else {
            isAvailable = false;
            reason = 'Subdomínio já em uso por outro site.';
          }
        }

        const platformSet = await db.query.platformSettings.findFirst();
        const baseDomain = platformSet?.baseDomain || 'theraos.app';

        return reply.send({
          available: isAvailable,
          slug: normalizedSlug,
          fullUrl: `https://${normalizedSlug}.${baseDomain}`,
          reason,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );

  // DELETE /v1/crm/captacao/pages/:id
  // Exclui uma página de captação e limpa registros associados
  fastify.delete(
    '/pages/:id',
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const { id } = request.params as any;

        const page = await db.query.capturePages.findFirst({
          where: eq(capturePages.id, id),
        });

        if (!page) {
          return reply.status(404).send({ error: 'Não Encontrado', message: 'Página de captação não encontrada.' });
        }

        // Verificar se usuário pertence ao workspace da página
        const member = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, decoded.sub),
            eq(workspaceMembers.workspaceId, page.workspaceId)
          ),
        });

        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, page.workspaceId),
        });

        const isOwner = workspace?.ownerId === decoded.sub;

        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, decoded.sub),
        });
        const isAdmin = profile?.role === 'admin';

        if (!member && !isOwner && !isAdmin) {
          return reply.status(403).send({ error: 'Proibido', message: 'Sem permissão para excluir esta página.' });
        }

        // Limpar Hostname no Cloudflare se houver domínio customizado
        if (page.customDomain) {
          try {
            const settings = await db.query.platformSettings.findFirst();
            if (settings?.cloudflareApiToken && settings?.cloudflareZoneId) {
              const listRes = await fetch(
                `https://api.cloudflare.com/client/v4/zones/${settings.cloudflareZoneId}/custom_hostnames?hostname=${page.customDomain}`,
                {
                  method: 'GET',
                  headers: { Authorization: `Bearer ${settings.cloudflareApiToken}` },
                }
              );
              const listData: any = await listRes.json().catch(() => ({}));
              if (listData.result && listData.result.length > 0) {
                const hostnameId = listData.result[0].id;
                await fetch(
                  `https://api.cloudflare.com/client/v4/zones/${settings.cloudflareZoneId}/custom_hostnames/${hostnameId}`,
                  {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${settings.cloudflareApiToken}` },
                  }
                );
              }
            }
          } catch (cfErr) {
            fastify.log.error(cfErr, 'Erro ao excluir custom hostname da Cloudflare');
          }
        }

        // Excluir a página de captação
        await db.delete(capturePages).where(eq(capturePages.id, id));

        return reply.send({ success: true, message: 'Página removida com sucesso.' });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );


  // POST /v1/crm/captacao/custom-hostname/register
  // Registra um domínio próprio no Cloudflare Custom Hostnames e persiste no banco
  fastify.post(
    '/custom-hostname/register',
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        verifyUserJwt(authHeader.split(' ')[1]);

        const body: any = request.body || {};
        const { pageId, domain } = body;

        if (!domain || typeof domain !== 'string') {
          return reply.status(400).send({ error: 'Bad Request', message: 'Domínio é obrigatório.' });
        }

        const cleanDomain = domain
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/\/.*$/, '');

        const settings = await db.query.platformSettings.findFirst();
        const baseDomain = settings?.baseDomain || 'psiapp.com.br';
        const cnameTarget = `custom.${baseDomain}`;

        // Atualizar domínio da página se pageId fornecido
        if (pageId) {
          await db
            .update(capturePages)
            .set({ customDomain: cleanDomain, updatedAt: new Date() })
            .where(eq(capturePages.id, pageId));
        }

        // Resolver workspaceId do token JWT
        const userPayload: any = verifyUserJwt(authHeader.split('Bearer ')[1]);
        const targetWorkspaceId = userPayload?.workspace_id || userPayload?.workspaceId || userPayload?.tenant_id || userPayload?.tenantId;

        // Se não houver credenciais do Cloudflare configuradas no admin, retornar instruções estáticas de CNAME
        if (!settings?.cloudflareApiToken || !settings?.cloudflareZoneId) {
          const staticRecords = [
            {
              type: 'CNAME',
              name: cleanDomain.includes('.') ? cleanDomain.split('.')[0] : '@',
              value: cnameTarget,
              description: 'Apontamento principal do seu domínio no seu provedor de DNS',
              status: 'pending' as const,
            },
          ];

          // Persistir mesmo sem Cloudflare configurado
          if (targetWorkspaceId) {
            await db.insert(workspaceDomains).values({
              workspaceId: targetWorkspaceId,
              subdomain: cleanDomain.split('.')[0],
              customDomain: cleanDomain,
              dnsStatus: 'pending',
              dnsRecords: staticRecords,
            }).onConflictDoUpdate({
              target: workspaceDomains.workspaceId,
              set: { customDomain: cleanDomain, dnsStatus: 'pending', dnsRecords: staticRecords, updatedAt: new Date() },
            });
          }

          return reply.send({
            success: true,
            status: 'pending_validation',
            hostname: cleanDomain,
            cnameTarget,
            dnsRecords: staticRecords,
            message: 'Domínio salvo! Complete o apontamento CNAME no seu provedor de DNS.',
          });
        }

        const token = settings.cloudflareApiToken;
        const zoneId = settings.cloudflareZoneId;

        // 1. Tentar criar o Custom Hostname no Cloudflare API
        let cfResult: any = null;
        let cfStatus = 'pending_validation';
        let hostnameId = null;

        const createRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              hostname: cleanDomain,
              ssl: { method: 'http', type: 'dv' },
            }),
          }
        );

        const createData: any = await createRes.json().catch(() => ({}));

        if (createRes.ok && createData.result) {
          cfResult = createData.result;
        } else {
          // Se já existe (erro 1406), buscar o Custom Hostname existente por hostname
          const listRes = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames?hostname=${cleanDomain}`,
            {
              method: 'GET',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            }
          );
          const listData: any = await listRes.json().catch(() => ({}));
          if (listData.result && listData.result.length > 0) {
            cfResult = listData.result[0];
          }
        }

        const dnsRecords: any[] = [
          {
            type: 'CNAME',
            name: cleanDomain.includes('.') ? cleanDomain.split('.')[0] : '@',
            value: cnameTarget,
            description: 'Apontamento CNAME do seu subdomínio para o servidor da plataforma',
            status: 'pending',
          },
        ];

        if (cfResult) {
          hostnameId = cfResult.id;
          cfStatus = cfResult.status || 'pending_validation';

          // Registro de propriedade (Ownership Verification)
          if (cfResult.ownership_verification) {
            dnsRecords.push({
              type: (cfResult.ownership_verification.type || 'TXT').toUpperCase(),
              name: cfResult.ownership_verification.name || `_cf-custom-hostname.${cleanDomain}`,
              value: cfResult.ownership_verification.value,
              description: 'Validação de propriedade do domínio junto ao Cloudflare',
              status: 'pending',
            });
          }

          // Registros de Validação SSL (DCV)
          if (cfResult.ssl?.validation_records && Array.isArray(cfResult.ssl.validation_records)) {
            cfResult.ssl.validation_records.forEach((rec: any) => {
              if (rec.txt_name && rec.txt_value) {
                dnsRecords.push({
                  type: 'TXT',
                  name: rec.txt_name,
                  value: rec.txt_value,
                  description: 'Validação de emissão do certificado SSL de segurança',
                  status: 'pending',
                });
              }
            });
          }
        }

        // 2. Persistir no banco — inclui dnsStatus e dnsRecords
        if (targetWorkspaceId && cleanDomain) {
          await db
            .insert(workspaceDomains)
            .values({
              workspaceId: targetWorkspaceId,
              subdomain: cleanDomain.split('.')[0],
              customDomain: cleanDomain,
              cfHostnameId: hostnameId,
              dnsStatus: cfStatus === 'active' ? 'active' : 'pending',
              dnsRecords,
            })
            .onConflictDoUpdate({
              target: workspaceDomains.workspaceId,
              set: {
                customDomain: cleanDomain,
                cfHostnameId: hostnameId,
                dnsStatus: cfStatus === 'active' ? 'active' : 'pending',
                dnsRecords,
                updatedAt: new Date(),
              },
            });

          // 3. Enfileirar verificação automática via RabbitMQ (polling a cada 3 min)
          if (cfStatus !== 'active') {
            await scheduleDomainVerification(
              targetWorkspaceId,
              cleanDomain,
              hostnameId,
              60_000, // Primeira tentativa após 1 minuto
              0
            );
          }
        }

        return reply.send({
          success: true,
          status: cfStatus,
          hostname: cleanDomain,
          hostnameId,
          cnameTarget,
          dnsRecords,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );


  // POST /v1/crm/captacao/custom-hostname/verify
  // Verificação manual: consulta CF, persiste resultado (mesmo se pendente), retorna status
  fastify.post(
    '/custom-hostname/verify',
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const userPayload: any = verifyUserJwt(authHeader.split(' ')[1]);

        const body: any = request.body || {};
        const { domain } = body;

        if (!domain || typeof domain !== 'string') {
          return reply.status(400).send({ error: 'Bad Request', message: 'Domínio é obrigatório.' });
        }

        const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

        // Buscar cf_hostname_id do banco para consulta mais eficiente
        const targetWorkspaceId = userPayload?.workspace_id || userPayload?.workspaceId || userPayload?.tenant_id || userPayload?.tenantId;
        let cfHostnameId: string | null = null;
        if (targetWorkspaceId) {
          const domainRecord = await db.query.workspaceDomains.findFirst({
            where: eq(workspaceDomains.workspaceId, targetWorkspaceId),
          });
          cfHostnameId = domainRecord?.cfHostnameId || null;
        }

        // Consultar Cloudflare via helper compartilhado (com rate limiter embutido)
        const result = await checkDomainOnCloudflare(cleanDomain, cfHostnameId);

        const settings = await db.query.platformSettings.findFirst();
        const baseDomain = settings?.baseDomain || 'psiapp.com.br';
        const cnameTarget = `custom.${baseDomain}`;

        // Sem Cloudflare configurado → retornar status sem salvar mudança de status
        if (result.status === 'no_cloudflare') {
          return reply.send({
            success: true,
            status: 'pending_validation',
            hostname: cleanDomain,
            cnameTarget,
            sslActive: false,
            dnsRecords: [],
            rateLimited: false,
            message: 'Cloudflare não configurado no painel admin.',
          });
        }

        // Rate limited → retornar dados atuais do banco sem nova consulta
        if (result.rateLimited) {
          const domainRecord = targetWorkspaceId
            ? await db.query.workspaceDomains.findFirst({ where: eq(workspaceDomains.workspaceId, targetWorkspaceId) })
            : null;
          return reply.send({
            success: true,
            status: domainRecord?.dnsStatus || 'pending',
            hostname: cleanDomain,
            cnameTarget,
            sslActive: domainRecord?.dnsStatus === 'active',
            dnsRecords: domainRecord?.dnsRecords || [],
            rateLimited: true,
            message: 'Aguarde alguns segundos antes de verificar novamente.',
          });
        }

        // Persistir resultado no banco — sempre, mesmo que ainda pendente
        if (targetWorkspaceId) {
          await persistDomainStatus(targetWorkspaceId, cleanDomain, result);
        }

        return reply.send({
          success: true,
          status: result.status,
          sslStatus: result.sslStatus,
          sslActive: result.isActive,
          hostname: cleanDomain,
          hostnameId: result.hostnameId,
          cnameTarget: result.cnameTarget || cnameTarget,
          dnsRecords: result.dnsRecords,
          rateLimited: false,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );

  // GET /v1/crm/captacao/workspace-domain?workspaceId=...
  // Retorna o estado atual de DNS de um workspace (carregado do banco, sem consultar CF)
  fastify.get(
    '/workspace-domain',
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const userPayload: any = verifyUserJwt(authHeader.split(' ')[1]);

        const query: any = request.query || {};
        const workspaceId = query.workspaceId || userPayload?.workspace_id || userPayload?.workspaceId || userPayload?.tenant_id || userPayload?.tenantId;

        if (!workspaceId) {
          return reply.status(400).send({ error: 'Bad Request', message: 'workspaceId é obrigatório.' });
        }

        const domainRecord = await db.query.workspaceDomains.findFirst({
          where: eq(workspaceDomains.workspaceId, workspaceId),
        });

        if (!domainRecord) {
          return reply.send({ found: false, domain: null });
        }

        return reply.send({
          found: true,
          id: domainRecord.id,
          workspaceId: domainRecord.workspaceId,
          subdomain: domainRecord.subdomain,
          customDomain: domainRecord.customDomain,
          cfHostnameId: domainRecord.cfHostnameId,
          dnsStatus: domainRecord.dnsStatus,
          dnsRecords: domainRecord.dnsRecords || [],
          updatedAt: domainRecord.updatedAt,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );
}

