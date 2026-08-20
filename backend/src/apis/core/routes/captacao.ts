import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { capturePages, contacts, pipelineColumns, interactionHistory, tenantMembers, tenants } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { verifyUserJwt } from '../../../shared/auth';

// Validation Schemas
const CreatePageBodySchema = z.object({
  title: z.string().min(1, 'O título é obrigatório'),
  slug: z.string().optional().default(''),
  tenantId: z.string().uuid('ID do Tenant inválido'),
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
});

const SubmitFormBodySchema = z.object({
  tenantId: z.string().uuid('ID do Tenant inválido'),
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
      data: { title: "Você é maior de idade?", isRequired: true }
    },
    {
      id: "emergencia",
      type: "emergencia",
      position: { x: 2380, y: 100 },
      data: { title: "Informe um contato de emergência", isRequired: true }
    },
    {
      id: "contrato",
      type: "contrato",
      position: { x: 2760, y: 100 },
      data: { title: "Termo de Consentimento Terapêutico", isRequired: true }
    }
  ],
  edges: [
    { id: "start-nome", source: "start", target: "nome" },
    { id: "nome-celular", source: "nome", target: "celular" },
    { id: "celular-email", source: "celular", target: "email" },
    { id: "email-cpf", source: "email", target: "cpf" },
    { id: "cpf-maioridade", source: "cpf", target: "maioridade" },
    { id: "maioridade-emergencia", source: "maioridade", target: "emergencia" },
    { id: "emergencia-contrato", source: "emergencia", target: "contrato" }
  ],
  settings: {
    successAction: "whatsapp" as const,
    whatsappMessageTemplate: "Olá, acabei de enviar minha triagem inicial no seu site. Meu nome é {{nome}}."
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
        const { title, slug, tenantId, crp, approach, address, titlePart1, titlePart2, description, whatsappMessageTemplate, logoText, primaryStart, primaryEnd, contrast, logoUrl } = request.body;

        // 1. Resolver tenant e verificar permissão
        const targetTenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, tenantId),
        });

        if (!targetTenant) {
          return reply.status(404).send({
            error: 'Não Encontrado',
            message: 'Tenant não cadastrado.',
          });
        }

        const isOwner = targetTenant.ownerId === decoded.sub;

        const member = await db.query.tenantMembers.findFirst({
          where: and(
            eq(tenantMembers.userId, decoded.sub),
            eq(tenantMembers.tenantId, tenantId)
          ),
        });

        const hasAccess = isOwner || member;

        if (!hasAccess) {
          return reply.status(403).send({
            error: 'Proibido',
            message: 'Você não possui acesso para criar páginas neste tenant.',
          });
        }

        // 2. Verificar duplicidade de slug no mesmo tenant
        const normalizedSlug = (slug || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9-]/g, '');

        const duplicate = await db.query.capturePages.findFirst({
          where: and(
            eq(capturePages.tenantId, tenantId),
            eq(capturePages.slug, normalizedSlug)
          ),
        });

        if (duplicate) {
          return reply.status(409).send({
            error: 'Conflito',
            message: normalizedSlug === ''
              ? 'Já existe uma Página Principal (Home) cadastrada para o seu site.'
              : 'Já existe uma página com este endereço neste tenant.',
          });
        }

        let primaryTenant = null;
        if (!targetTenant.defaultSiteLogoUrl && !targetTenant.defaultSiteFaviconUrl && !targetTenant.defaultSiteLogoConfig) {
          const settings = await db.query.platformSettings.findFirst();
          if (settings?.primaryTenantId) {
            primaryTenant = await db.query.tenants.findFirst({
              where: eq(tenants.id, settings.primaryTenantId),
            }) ?? null;
          }
        }

        const activeLogoUrl = logoUrl || targetTenant.defaultSiteLogoUrl || primaryTenant?.defaultSiteLogoUrl || undefined;
        const activeFaviconUrl = targetTenant.defaultSiteFaviconUrl || primaryTenant?.defaultSiteFaviconUrl || undefined;
        const activeLogoConfig = targetTenant.defaultSiteLogoConfig || primaryTenant?.defaultSiteLogoConfig || {
          mode: 'html',
          text: logoText || targetTenant.name || title,
          iconType: 'psi',
        };

        const customSiteConfig = {
          ...defaultSiteConfig,
          logoUrl: activeLogoUrl,
          faviconUrl: activeFaviconUrl,
          logoConfig: activeLogoConfig,
          theme: {
            colors: {
              primaryStart: primaryStart || targetTenant.defaultSitePrimaryColor || primaryTenant?.defaultSitePrimaryColor || '#CC8667',
              primaryEnd: primaryEnd || targetTenant.defaultSiteSecondaryColor || primaryTenant?.defaultSiteSecondaryColor || '#AA5533',
              contrast: contrast || targetTenant.contrastColor || primaryTenant?.contrastColor || '#FFFFFF',
            },
          },
          professional: {
            ...defaultSiteConfig.professional,
            name: logoText || targetTenant.name || title,
            crp: crp || defaultSiteConfig.professional.crp,
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
            tenantId,
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
      const { tenantId, pageId, responses } = request.body;

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

        // 2. Resolver o estágio clínico inicial do tenant (categoria "pendente")
        const firstColumn = await db.query.pipelineColumns.findFirst({
          where: and(
            eq(pipelineColumns.tenantId, tenantId),
            eq(pipelineColumns.category, 'pendente')
          ),
          orderBy: [pipelineColumns.order],
        });

        const initialStatus = firstColumn ? firstColumn.name : 'Triagem Pendente';

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
            tenantId,
            name: rawName,
            phone: rawPhone || null,
            email: rawEmail || null,
            status: initialStatus,
            source: 'Landing Page (Triagem)',
            screeningNotes,
            isMinor: rawIsMinor,
            acceptedContractAt: responses.contrato ? new Date() : null,
            emergencyContactName: emergencyName,
            emergencyContactRelation: emergencyRelation,
            emergencyContactPhone: emergencyPhone,
            // CPF
            utmSource: 'Landing Page',
          })
          .returning();

        // 5. Inserir log inicial no histórico de interações do lead
        await db.insert(interactionHistory).values({
          contactId: newContact.id,
          tenantId,
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

  // GET /v1/crm/captacao/check-subdomain?slug=...&tenantId=...
  // Verifica se um subdomínio (slug) está livre para uso
  fastify.get(
    '/check-subdomain',
    async (request, reply) => {
      try {
        const querySlug = (request.query as any)?.slug;
        const queryTenantId = (request.query as any)?.tenantId;

        if (!querySlug || typeof querySlug !== 'string') {
          return reply.status(400).send({ error: 'Bad Request', message: 'Slug é obrigatório.' });
        }

        const normalizedSlug = querySlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (normalizedSlug.length < 2) {
          return reply.send({ available: false, reason: 'Slug muito curto (mínimo 2 caracteres).' });
        }

        // Tentar identificar o tenant do usuário via query ou token JWT
        let currentTenantId: string | null = typeof queryTenantId === 'string' ? queryTenantId : null;
        const authHeader = request.headers.authorization;
        if (!currentTenantId && authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const decoded = verifyUserJwt(authHeader.split(' ')[1]);
            const member = await db.query.tenantMembers.findFirst({
              where: eq(tenantMembers.userId, decoded.sub),
            });
            if (member) {
              currentTenantId = member.tenantId;
            }
          } catch {
            // Se token for inválido, segue verificação global
          }
        }

        // 1. Checar se já existe em algum tenant
        const existingTenant = await db.query.tenants.findFirst({
          where: eq(tenants.slug, normalizedSlug),
        });

        // 2. Checar se já existe em alguma página de captação
        const existingPage = await db.query.capturePages.findFirst({
          where: eq(capturePages.slug, normalizedSlug),
        });

        let isAvailable = true;
        let reason = 'Subdomínio disponível!';

        if (existingTenant) {
          if (currentTenantId && existingTenant.id === currentTenantId) {
            isAvailable = true;
            reason = 'Subdomínio pertence ao seu próprio tenant e está disponível!';
          } else {
            isAvailable = false;
            reason = 'Subdomínio já em uso por outro tenant.';
          }
        }

        if (isAvailable && existingPage) {
          if (currentTenantId && existingPage.tenantId === currentTenantId) {
            isAvailable = true;
            reason = 'Subdomínio pertence ao seu tenant e está disponível!';
          } else {
            isAvailable = false;
            reason = 'Subdomínio já em uso por outro site.';
          }
        }

        const platformSet = await db.query.platformSettings.findFirst();
        const baseDomain = platformSet?.baseDomain || 'psiapp.com.br';

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

        // Verificar se usuário pertence ao tenant da página
        const member = await db.query.tenantMembers.findFirst({
          where: and(
            eq(tenantMembers.userId, decoded.sub),
            eq(tenantMembers.tenantId, page.tenantId)
          ),
        });

        const tenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, page.tenantId),
        });

        const isOwner = tenant?.ownerId === decoded.sub;

        if (!member && !isOwner) {
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
  // Registra um domínio próprio no Cloudflare Custom Hostnames
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

        // Atualizar rascunho da página se pageId fornecido
        if (pageId) {
          await db
            .update(capturePages)
            .set({ customDomainDraft: cleanDomain, updatedAt: new Date() })
            .where(eq(capturePages.id, pageId));
        }

        // Se não houver credenciais do Cloudflare configuradas no admin, retornar instruções estáticas de CNAME
        if (!settings?.cloudflareApiToken || !settings?.cloudflareZoneId) {
          return reply.send({
            success: true,
            status: 'pending_validation',
            hostname: cleanDomain,
            cnameTarget,
            dnsRecords: [
              {
                type: 'CNAME',
                name: cleanDomain.includes('.') ? cleanDomain.split('.')[0] : '@',
                value: cnameTarget,
                description: 'Apontamento principal do seu domínio no seu provedor de DNS',
              },
            ],
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
              ssl: {
                method: 'http',
                type: 'dv',
              },
            }),
          }
        );

        const createData: any = await createRes.json().catch(() => ({}));

        if (createRes.ok && createData.result) {
          cfResult = createData.result;
        } else {
          // Se já existe ou deu erro 1406, buscar o Custom Hostname existente por hostname
          const listRes = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames?hostname=${cleanDomain}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          const listData: any = await listRes.json().catch(() => ({}));
          if (listData.result && listData.result.length > 0) {
            cfResult = listData.result[0];
          }
        }

        const dnsRecords: Array<{ type: string; name: string; value: string; description: string }> = [
          {
            type: 'CNAME',
            name: cleanDomain.includes('.') ? cleanDomain.split('.')[0] : '@',
            value: cnameTarget,
            description: 'Apontamento CNAME do seu subdomínio para o servidor da plataforma',
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
            });
          }

          // Registros de Validação SSL (DCV)
          if (cfResult.ssl && cfResult.ssl.validation_records && Array.isArray(cfResult.ssl.validation_records)) {
            cfResult.ssl.validation_records.forEach((rec: any) => {
              if (rec.txt_name && rec.txt_value) {
                dnsRecords.push({
                  type: 'TXT',
                  name: rec.txt_name,
                  value: rec.txt_value,
                  description: 'Validação de emissão do certificado SSL de segurança',
                });
              }
            });
          }
        }

        const userPayload: any = verifyUserJwt(authHeader.split('Bearer ')[1]);
        const targetTenantId = userPayload?.tenant_id || userPayload?.tenantId;
        if (targetTenantId && cleanDomain) {
          await db
            .update(tenants)
            .set({ domain: cleanDomain, cfHostnameId: hostnameId, updatedAt: new Date() })
            .where(eq(tenants.id, targetTenantId));
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
  // Revalida o status do Custom Hostname no Cloudflare
  fastify.post(
    '/custom-hostname/verify',
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        verifyUserJwt(authHeader.split(' ')[1]);

        const body: any = request.body || {};
        const { domain } = body;

        if (!domain || typeof domain !== 'string') {
          return reply.status(400).send({ error: 'Bad Request', message: 'Domínio é obrigatório.' });
        }

        const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        const settings = await db.query.platformSettings.findFirst();
        const baseDomain = settings?.baseDomain || 'psiapp.com.br';
        const cnameTarget = `custom.${baseDomain}`;

        if (!settings?.cloudflareApiToken || !settings?.cloudflareZoneId) {
          return reply.send({
            success: true,
            status: 'pending_validation',
            hostname: cleanDomain,
            cnameTarget,
            sslActive: false,
            message: 'Cloudflare não configurado no painel admin. Verificação concluída manualmente.',
          });
        }

        const token = settings.cloudflareApiToken;
        const zoneId = settings.cloudflareZoneId;

        const listRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames?hostname=${cleanDomain}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const listData: any = await listRes.json().catch(() => ({}));
        const cfResult = listData.result && listData.result.length > 0 ? listData.result[0] : null;

        if (!cfResult) {
          return reply.send({
            success: true,
            status: 'not_found',
            hostname: cleanDomain,
            cnameTarget,
            sslActive: false,
          });
        }

        const sslActive = cfResult.ssl?.status === 'active' || cfResult.status === 'active';

        return reply.send({
          success: true,
          status: cfResult.status,
          sslStatus: cfResult.ssl?.status,
          sslActive,
          hostname: cleanDomain,
          hostnameId: cfResult.id,
          cnameTarget,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );
}
