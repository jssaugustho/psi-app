import { CanvasData, Section, NavbarConfig, NavbarLink } from '../types';
import { createDefaultSection, createDefaultDiv, createDefaultComponent } from '../constants';


/**
 * Converte dados de pagina no formato legado (siteConfig.sections + dictionary)
 * para a estrutura v2.0 (CanvasData: Section[] -> Div[] / Component[]).
 *
 * Se o canvas_data ja for v2.0, retorna sem alterar.
 */
export function migrateLegacyCanvas(legacyData: any): CanvasData {
  const existingCanvas =
    legacyData?.canvas_data ||
    legacyData?.draft_data?.canvas_data ||
    legacyData?.draft_data?.canvasData ||
    legacyData?.siteConfig?.canvas_data;

  if (existingCanvas?.version === '2.0' && Array.isArray(existingCanvas.sections)) {
    return existingCanvas as CanvasData;
  }

  const sections: Section[] = [];

  // Secoes legadas ativas (ignora 'hero' e 'space' -- tratados separadamente ou ignorados)
  const legacySections = Array.isArray(legacyData?.siteConfig?.sections)
    ? legacyData.siteConfig.sections.filter((s: any) => s.isActive !== false && s.type !== 'hero' && s.type !== 'space')
    : [
        { id: 'diagnostic', type: 'diagnostic', isActive: true },
        { id: 'about',      type: 'about',      isActive: true },
        { id: 'process',    type: 'process',    isActive: true },
        { id: 'faq',        type: 'faq',        isActive: true },
      ];

  const dictionary    = legacyData?.dictionary || {};
  const images        = legacyData?.siteConfig?.images || {};
  const professional  = legacyData?.siteConfig?.professional || {};

  // ==========================================================================
  // 1. HERO SECTION
  // ==========================================================================
  const heroSection = createDefaultSection('Hero Principal');
  heroSection.id = 'sec-hero';
  heroSection.layout.flexDirection = 'row';
  heroSection.layout.alignItems = 'center';
  heroSection.layout.gap = '40px';
  heroSection.mobile = { flexDirection: 'column', gap: '32px' };

  // --- Coluna esquerda: conteudo textual ---
  const heroLeftDiv = createDefaultDiv('Conteudo Hero');
  heroLeftDiv.layout.flexBasis = '55%';
  heroLeftDiv.layout.gap = '20px';
  heroLeftDiv.mobile = { flexBasis: '100%' };

  const heroBadge = createDefaultComponent('badge');
  heroBadge.props.text = 'ATENDIMENTO ONLINE & PRESENCIAL';
  heroLeftDiv.components.push(heroBadge);

  const heroHeading = createDefaultComponent('heading');
  heroHeading.props.text = 'Psicologia Clinica & Saude Emocional';
  heroHeading.props.level = 1;
  heroHeading.style.fontSize = '2.75rem';
  heroHeading.style.lineHeight = '1.15';
  heroLeftDiv.components.push(heroHeading);

  const heroPara = createDefaultComponent('paragraph');
  heroPara.props.html = `<p>${
    professional.bio ||
    'Cuidado clinico etico e acolhedor para ajudar voce a superar desafios emocionais, desenvolver o autoconhecimento e viver com mais leveza.'
  }</p>`;
  heroLeftDiv.components.push(heroPara);

  // Grupo de botoes horizontal
  const heroBtnGroupDiv = createDefaultDiv('Grupo de Botoes');
  heroBtnGroupDiv.layout.flexDirection = 'row';
  heroBtnGroupDiv.layout.flexWrap = 'wrap';
  heroBtnGroupDiv.layout.gap = '12px';
  heroBtnGroupDiv.layout.width = '100%';
  heroBtnGroupDiv.mobile = { flexDirection: 'column', gap: '8px' };

  const heroBtn1 = createDefaultComponent('button');
  heroBtn1.props.label   = 'Iniciar Triagem';
  heroBtn1.props.variant = 'primary';
  heroBtn1.props.size    = 'lg';
  heroBtn1.props.action  = 'cta_primary';
  heroBtnGroupDiv.components.push(heroBtn1);

  const heroBtn2 = createDefaultComponent('button');
  heroBtn2.props.label          = 'Saiba Mais';
  heroBtn2.props.variant        = 'outline';
  heroBtn2.props.size           = 'lg';
  heroBtn2.props.action         = 'scroll_to';
  heroBtn2.props.scrollTargetId = 'sec-about';
  heroBtn2.style.backgroundColor = 'transparent';
  heroBtn2.style.borderStyle     = 'solid';
  heroBtn2.style.borderWidth     = '2px';
  heroBtn2.style.borderColor     = 'var(--brand-gradient-start)';
  heroBtn2.style.color           = 'var(--brand-gradient-start)';
  heroBtnGroupDiv.components.push(heroBtn2);

  heroLeftDiv.components.push(heroBtnGroupDiv);
  heroSection.components.push(heroLeftDiv);

  // --- Coluna direita: imagem (sempre presente para manter layout 2-col) ---
  const heroRightDiv = createDefaultDiv('Imagem Hero');
  heroRightDiv.layout.flexBasis = '45%';
  heroRightDiv.mobile = { flexBasis: '100%' };

  if (images.hero || images.portrait) {
    const heroImg = createDefaultComponent('image');
    heroImg.props.src         = images.hero || images.portrait;
    heroImg.props.alt         = professional.name ? `Foto de ${professional.name}` : 'Psicologa';
    heroImg.props.aspectRatio = '4/3';
    heroImg.props.objectFit   = 'cover';
    heroImg.style.borderRadius = '24px';
    heroImg.style.width        = '100%';
    heroRightDiv.components.push(heroImg);
  } else {
    heroRightDiv.layout.alignItems     = 'center';
    heroRightDiv.layout.justifyContent = 'center';
    heroRightDiv.layout.minHeight      = '320px';
    heroRightDiv.background = {
      type:  'color',
      color: 'color-mix(in srgb, var(--brand-gradient-start) 8%, var(--site-bg))',
    };
    heroRightDiv.border = {
      borderStyle:  'solid',
      borderWidth:  '1px',
      borderColor:  'var(--surface-border)',
      borderRadius: '24px',
    };
    const placeholderIcon = createDefaultComponent('icon');
    placeholderIcon.props.name        = 'UserRound';
    placeholderIcon.props.size        = '96px';
    placeholderIcon.props.strokeWidth = 1;
    placeholderIcon.style.color       = 'color-mix(in srgb, var(--brand-gradient-start) 40%, transparent)';
    heroRightDiv.components.push(placeholderIcon);
  }

  heroSection.components.push(heroRightDiv);
  sections.push(heroSection);

  // ==========================================================================
  // 2. ITERAR SECOES LEGADAS
  // ==========================================================================
  for (const legacySec of legacySections) {
    const type    = legacySec.type;
    const secDict = dictionary[type] || {};

    // ------------------------------------------------------------------------
    // DIAGNOSTIC -- Especialidades / Demandas atendidas
    // ------------------------------------------------------------------------
    if (type === 'diagnostic') {
      const diagSection = createDefaultSection('Especialidades');
      diagSection.id = 'sec-diagnostic';

      const headerDiv = createDefaultDiv('Cabecalho Especialidades');
      headerDiv.layout.alignItems = 'center';
      headerDiv.layout.gap        = '8px';
      headerDiv.layout.width      = '100%';

      if (secDict.badge) {
        const b = createDefaultComponent('badge');
        b.props.text = secDict.badge;
        headerDiv.components.push(b);
      }

      const h = createDefaultComponent('heading');
      h.props.text      = secDict.title || 'Como a terapia pode ajudar voce';
      h.props.level     = 2;
      h.style.textAlign = 'center';
      headerDiv.components.push(h);

      if (secDict.description) {
        const p = createDefaultComponent('paragraph');
        p.props.html      = `<p>${secDict.description}</p>`;
        p.style.textAlign = 'center';
        headerDiv.components.push(p);
      }

      diagSection.components.push(headerDiv);

      const cardsGridDiv = createDefaultDiv('Grid de Cards');
      cardsGridDiv.layout.flexDirection  = 'row';
      cardsGridDiv.layout.flexWrap       = 'wrap';
      cardsGridDiv.layout.gap            = '24px';
      cardsGridDiv.layout.width          = '100%';
      cardsGridDiv.layout.justifyContent = 'center';
      cardsGridDiv.mobile = { flexDirection: 'column' };

      const defaultCards = [
        { title: 'Ansiedade e Cansaco Mental',    desc: 'Sente que esta sempre no seu limite, com a mente acelerada e o corpo exausto? A terapia ajuda a identificar gatilhos e encontrar formas saudaveis de lidar com o estresse.', icon: 'Brain' },
        { title: 'Autoconhecimento & Autoestima', desc: 'Desenvolva uma relacao mais acolhedora e confiante consigo mesmo, compreendendo suas emocoes e construindo autonomia nas suas escolhas.', icon: 'Heart' },
        { title: 'Relacionamentos & Conflitos',   desc: 'Aprenda a estabelecer limites saudaveis, melhorar a comunicacao e vivenciar conexoes interpessoais mais profundas e equilibradas.', icon: 'Users' },
      ];

      for (let i = 1; i <= 3; i++) {
        const title    = secDict[`card${i}Title`] || defaultCards[i - 1].title;
        const desc     = secDict[`card${i}Desc`]  || defaultCards[i - 1].desc;
        const iconName = defaultCards[i - 1].icon;

        const cardDiv = createDefaultDiv(`Card ${i}`);
        cardDiv.layout.flexBasis = '30%';
        cardDiv.mobile = { flexBasis: '100%' };

        const c = createDefaultComponent('card');
        c.props.title    = title;
        c.props.body     = desc;
        c.props.iconName = iconName;
        c.props.variant  = 'glass';
        cardDiv.components.push(c);
        cardsGridDiv.components.push(cardDiv);
      }

      diagSection.components.push(cardsGridDiv);
      sections.push(diagSection);

    // ------------------------------------------------------------------------
    // ABOUT -- Sobre Mim
    // ------------------------------------------------------------------------
    } else if (type === 'about') {
      const aboutSection = createDefaultSection('Sobre Mim');
      aboutSection.id = 'sec-about';
      aboutSection.layout.flexDirection = 'row';
      aboutSection.layout.alignItems    = 'center';
      aboutSection.layout.gap           = '48px';
      aboutSection.mobile = { flexDirection: 'column', gap: '24px' };

      const imgDiv = createDefaultDiv('Foto Retrato');
      imgDiv.layout.flexBasis = '40%';
      imgDiv.mobile = { flexBasis: '100%' };

      if (images.portrait) {
        const img = createDefaultComponent('image');
        img.props.src         = images.portrait;
        img.props.alt         = professional.name ? `Foto de ${professional.name}` : 'Psicologa';
        img.props.aspectRatio = '3/4';
        img.props.objectFit   = 'cover';
        img.style.borderRadius = '24px';
        img.style.width        = '100%';
        imgDiv.components.push(img);
      } else {
        imgDiv.layout.alignItems     = 'center';
        imgDiv.layout.justifyContent = 'center';
        imgDiv.layout.minHeight      = '360px';
        imgDiv.background = {
          type:  'color',
          color: 'color-mix(in srgb, var(--brand-gradient-start) 8%, var(--site-bg))',
        };
        imgDiv.border = {
          borderStyle:  'solid',
          borderWidth:  '1px',
          borderColor:  'var(--surface-border)',
          borderRadius: '24px',
        };
        const ph = createDefaultComponent('icon');
        ph.props.name        = 'UserRound';
        ph.props.size        = '80px';
        ph.props.strokeWidth = 1;
        ph.style.color       = 'color-mix(in srgb, var(--brand-gradient-start) 40%, transparent)';
        imgDiv.components.push(ph);
      }

      aboutSection.components.push(imgDiv);

      const contentDiv = createDefaultDiv('Conteudo Sobre Mim');
      contentDiv.layout.flexBasis = '60%';
      contentDiv.layout.gap       = '16px';
      contentDiv.mobile = { flexBasis: '100%' };

      if (secDict.badge) {
        const b = createDefaultComponent('badge');
        b.props.text = secDict.badge;
        contentDiv.components.push(b);
      }

      const h = createDefaultComponent('heading');
      h.props.text  = secDict.title || (professional.name ? `Sobre ${professional.name}` : 'Sobre Mim');
      h.props.level = 2;
      contentDiv.components.push(h);

      const p1 = createDefaultComponent('paragraph');
      p1.props.html = `<p>${
        secDict.description1 ||
        'Sou psicologa clinica com formacao em Terapia Cognitivo-Comportamental (TCC) e experiencia no atendimento de adultos em diversas demandas da vida emocional e relacional.'
      }</p>`;
      contentDiv.components.push(p1);

      if (secDict.description2) {
        const p2 = createDefaultComponent('paragraph');
        p2.props.html = `<p>${secDict.description2}</p>`;
        contentDiv.components.push(p2);
      }

      const listItems = Array.isArray(secDict.points) && secDict.points.length > 0
        ? secDict.points.map((pt: string) => ({ text: pt, iconName: 'Check' }))
        : [
            { text: 'CRP ativo e regular',                  iconName: 'Check' },
            { text: 'Atendimento online e presencial',       iconName: 'Check' },
            { text: 'Sigilo e etica profissional garantidos', iconName: 'Check' },
            { text: 'Abordagem baseada em evidencias (TCC)', iconName: 'Check' },
          ];

      const listComp = createDefaultComponent('list');
      listComp.props.items    = listItems;
      listComp.props.listType = 'check';
      contentDiv.components.push(listComp);

      aboutSection.components.push(contentDiv);
      sections.push(aboutSection);

    // ------------------------------------------------------------------------
    // PROCESS -- Como Funciona o Atendimento
    // ------------------------------------------------------------------------
    } else if (type === 'process') {
      const procSection = createDefaultSection('Como Funciona');
      procSection.id = 'sec-process';

      const headerDiv = createDefaultDiv('Cabecalho Processo');
      headerDiv.layout.alignItems = 'center';
      headerDiv.layout.gap        = '8px';
      headerDiv.layout.width      = '100%';

      const h = createDefaultComponent('heading');
      h.props.text      = secDict.title || 'Como Funciona o Atendimento';
      h.props.level     = 2;
      h.style.textAlign = 'center';
      headerDiv.components.push(h);

      if (secDict.description) {
        const p = createDefaultComponent('paragraph');
        p.props.html      = `<p>${secDict.description}</p>`;
        p.style.textAlign = 'center';
        headerDiv.components.push(p);
      }

      procSection.components.push(headerDiv);

      const stepsGridDiv = createDefaultDiv('Grid de Etapas');
      stepsGridDiv.layout.flexDirection  = 'row';
      stepsGridDiv.layout.flexWrap       = 'wrap';
      stepsGridDiv.layout.gap            = '24px';
      stepsGridDiv.layout.width          = '100%';
      stepsGridDiv.layout.justifyContent = 'center';
      stepsGridDiv.mobile = { flexDirection: 'column' };

      const defaultSteps = [
        { title: 'Primeiro Contato',        desc: 'Realizamos um breve alinhamento inicial para tirar duvidas e agendar seu primeiro atendimento.' },
        { title: 'Sessao de Acolhimento',   desc: 'Um espaco seguro e sigiloso para ouvir suas demandas e estabelecer os objetivos do acompanhamento.' },
        { title: 'Acompanhamento Continuo', desc: 'Encontros semanais de 50 minutos com foco no seu desenvolvimento emocional e bem-estar.' },
      ];

      [0, 1, 2].forEach((idx) => {
        const stepKey  = `step${idx + 1}`;
        const stepData = secDict[stepKey] || defaultSteps[idx];

        const stepDiv = createDefaultDiv(`Etapa ${idx + 1}`);
        stepDiv.layout.flexBasis      = '30%';
        stepDiv.layout.alignItems     = 'center';
        stepDiv.layout.gap            = '8px';
        stepDiv.mobile = { flexBasis: '100%' };

        const counter = createDefaultComponent('stat_counter');
        counter.props.value     = `0${idx + 1}`;
        counter.props.label     = stepData.title || `Etapa ${idx + 1}`;
        counter.style.textAlign = 'center';
        stepDiv.components.push(counter);

        const desc = createDefaultComponent('paragraph');
        desc.props.html      = `<p>${stepData.desc || stepData.description || ''}</p>`;
        desc.style.textAlign = 'center';
        stepDiv.components.push(desc);

        stepsGridDiv.components.push(stepDiv);
      });

      procSection.components.push(stepsGridDiv);
      sections.push(procSection);

    // ------------------------------------------------------------------------
    // FAQ -- Perguntas Frequentes
    // ------------------------------------------------------------------------
    } else if (type === 'faq') {
      const faqSection = createDefaultSection('Perguntas Frequentes (FAQ)');
      faqSection.id = 'sec-faq';

      const headerDiv = createDefaultDiv('Cabecalho FAQ');
      headerDiv.layout.alignItems = 'center';
      headerDiv.layout.gap        = '8px';
      headerDiv.layout.width      = '100%';

      const h = createDefaultComponent('heading');
      h.props.text      = secDict.title || 'Perguntas Frequentes';
      h.props.level     = 2;
      h.style.textAlign = 'center';
      headerDiv.components.push(h);

      if (secDict.subtitle) {
        const sub = createDefaultComponent('paragraph');
        sub.props.html      = `<p>${secDict.subtitle}</p>`;
        sub.style.textAlign = 'center';
        headerDiv.components.push(sub);
      }

      faqSection.components.push(headerDiv);

      const itemsList = secDict.items || secDict.faq || [
        { question: 'Como funciona a primeira sessao de psicoterapia?', answer: 'Na primeira sessao realizamos uma escuta acolhedora para compreender suas demandas e alinhar os objetivos do acompanhamento. Nao ha julgamentos -- e um espaco inteiramente seu.' },
        { question: 'As sessoes sao online ou presenciais?',            answer: 'Oferecemos atendimentos no formato online via plataforma segura, alem de consultorio presencial. Voce escolhe o que for mais confortavel.' },
        { question: 'Qual a duracao de cada sessao?',                   answer: 'Cada atendimento possui duracao media de 50 minutos, ocorrendo geralmente com frequencia semanal.' },
        { question: 'Como agendar uma consulta?',                       answer: 'Basta clicar no botao de agendamento nesta pagina. Voce sera direcionado ao formulario de triagem para nos contar um pouco sobre voce.' },
      ];

      const faqListDiv = createDefaultDiv('Lista de FAQs');
      faqListDiv.layout.maxWidth = '800px';
      faqListDiv.layout.width    = '100%';
      faqListDiv.layout.gap      = '12px';

      itemsList.forEach((item: any) => {
        const faqComp = createDefaultComponent('faq_item');
        faqComp.props.question    = item.question || 'Pergunta?';
        faqComp.props.answer      = item.answer   || 'Resposta.';
        faqComp.props.defaultOpen = false;
        faqListDiv.components.push(faqComp);
      });

      faqSection.components.push(faqListDiv);
      sections.push(faqSection);
    }
    // Tipos desconhecidos (ex: 'space', entradas legadas sem handler) sao ignorados silenciosamente.
  }

  // ==========================================================================
  // ULTIMA SECAO: CTA (Chamada para Acao) -- sempre presente
  // ==========================================================================
  const ctaSection = createDefaultSection('Chamada para Acao');
  ctaSection.id = 'sec-cta';
  ctaSection.layout.alignItems = 'center';
  ctaSection.layout.gap        = '24px';

  const ctaContentDiv = createDefaultDiv('Conteudo CTA');
  ctaContentDiv.layout.alignItems = 'center';
  ctaContentDiv.layout.maxWidth   = '640px';
  ctaContentDiv.layout.width      = '100%';
  ctaContentDiv.layout.gap        = '20px';

  const ctaHeading = createDefaultComponent('heading');
  ctaHeading.props.text      = 'Pronto para dar o primeiro passo?';
  ctaHeading.props.level     = 2;
  ctaHeading.style.textAlign = 'center';
  ctaContentDiv.components.push(ctaHeading);

  const ctaPara = createDefaultComponent('paragraph');
  ctaPara.props.html      = '<p>Agende sua sessao de acolhimento e comece sua jornada de autoconhecimento com suporte especializado e acolhedor.</p>';
  ctaPara.style.textAlign = 'center';
  ctaContentDiv.components.push(ctaPara);

  const ctaBtn = createDefaultComponent('button');
  ctaBtn.props.label   = 'Quero Agendar Minha Consulta';
  ctaBtn.props.variant = 'primary';
  ctaBtn.props.size    = 'lg';
  ctaBtn.props.action  = 'cta_primary';
  ctaContentDiv.components.push(ctaBtn);

  ctaSection.components.push(ctaContentDiv);
  sections.push(ctaSection);

  // ==========================================================================
  // NAVBAR — sempre ativa no template inicial
  // ==========================================================================
  const defaultNavbar: NavbarConfig = {
    enabled: true,
    logoMode: 'workspace',
    sticky: true,
    showCtaButton: true,
    ctaButtonText: 'Agendar Consulta',
    ctaButtonAction: 'cta_primary',
    links: [
      { id: 'nav-link-1', label: 'Especialidades', targetType: 'section', sectionId: 'sec-diagnostic' },
      { id: 'nav-link-2', label: 'Sobre Mim',      targetType: 'section', sectionId: 'sec-about'      },
      { id: 'nav-link-3', label: 'Como Funciona',  targetType: 'section', sectionId: 'sec-process'    },
      { id: 'nav-link-4', label: 'FAQ',            targetType: 'section', sectionId: 'sec-faq'        },
    ] as NavbarLink[],
  };

  return {
    version: '2.0',
    navbar: defaultNavbar,
    sections,
  };
}