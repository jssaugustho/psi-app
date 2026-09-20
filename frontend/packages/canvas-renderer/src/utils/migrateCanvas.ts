import { CanvasData, Section, NavbarConfig, NavbarLink } from '../types';
import { createDefaultSection, createDefaultDiv, createDefaultComponent, createHeaderSectionTemplate, createFooterSectionTemplate } from '../constants';

/**
 * Converte dados de página no formato legado (siteConfig.sections + dictionary)
 * para a estrutura v2.0 (CanvasData: Section[] -> Div[] / Component[]).
 *
 * Se o canvas_data já for v2.0, retorna sem alterar.
 */
export function migrateLegacyCanvas(legacyData: any): CanvasData {
  const existingCanvas =
    legacyData?.canvas_data ||
    legacyData?.draft_data?.canvas_data ||
    legacyData?.draft_data?.canvasData ||
    legacyData?.siteConfig?.canvas_data ||
    legacyData?.siteConfig?.canvasData ||
    legacyData?.canvasData;

  if (existingCanvas?.version === '2.0' && Array.isArray(existingCanvas.sections)) {
    if (existingCanvas.navbar && existingCanvas.navbar.enabled !== false) {
      const hasHeaderSection = existingCanvas.sections.some(
        (s: any) => s.id === 'sec-header' || s.components?.some((c: any) => c.type === 'navbar_links' || c.components?.some((subC: any) => subC.type === 'navbar_links'))
      );
      if (!hasHeaderSection) {
        const headerSec = convertNavbarConfigToSection(existingCanvas.navbar);
        existingCanvas.sections.unshift(headerSec);
      }
      delete existingCanvas.navbar;
    }
    return existingCanvas as CanvasData;
  }

  const sections: Section[] = [];

  // ==========================================================================
  // 0. NAVBAR / HEADER SECTION (TOPO)
  // ==========================================================================
  const headerSection = createHeaderSectionTemplate('classic');
  headerSection.id = 'sec-header';
  sections.push(headerSection);

  // Seções legadas ativas (ignora 'hero' e 'space' -- tratados separadamente ou ignorados)
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

  // --- Coluna esquerda: conteúdo textual ---
  const heroLeftDiv = createDefaultDiv('Conteúdo Hero');
  heroLeftDiv.layout.flexBasis = '55%';
  heroLeftDiv.layout.gap = '20px';
  heroLeftDiv.mobile = { flexBasis: '100%' };

  const heroBadge = createDefaultComponent('badge');
  heroBadge.props.text = dictionary.hero?.badge || 'ATENDIMENTO ONLINE & PRESENCIAL';
  heroLeftDiv.components.push(heroBadge);

  const heroHeading = createDefaultComponent('heading');
  heroHeading.props.text = dictionary.hero?.title || 'Psicologia Clínica & Saúde Emocional';
  heroHeading.props.level = 1;
  heroLeftDiv.components.push(heroHeading);

  const heroPara = createDefaultComponent('paragraph');
  heroPara.props.html = `<p>${
    dictionary.hero?.description ||
    professional.bio ||
    'Cuidado clínico ético e acolhedor para ajudar você a superar desafios emocionais, desenvolver o autoconhecimento e viver com mais leveza.'
  }</p>`;
  heroLeftDiv.components.push(heroPara);

  // Grupo de botões horizontal
  const heroBtnGroupDiv = createDefaultDiv('Grupo de Botões');
  heroBtnGroupDiv.layout.flexDirection = 'row';
  heroBtnGroupDiv.layout.flexWrap = 'wrap';
  heroBtnGroupDiv.layout.gap = '12px';
  heroBtnGroupDiv.layout.width = '100%';
  heroBtnGroupDiv.mobile = { flexDirection: 'column', gap: '8px' };

  const heroBtn1 = createDefaultComponent('button');
  heroBtn1.props.label   = dictionary.hero?.ctaPrimary || 'Iniciar Triagem';
  heroBtn1.props.variant = 'primary';
  heroBtn1.props.size    = 'lg';
  heroBtn1.props.action  = 'cta_primary';
  heroBtnGroupDiv.components.push(heroBtn1);

  const heroBtn2 = createDefaultComponent('button');
  heroBtn2.props.label          = dictionary.hero?.ctaSecondary || 'Saiba Mais';
  heroBtn2.props.variant        = 'outline';
  heroBtn2.props.size           = 'lg';
  heroBtn2.props.action         = 'scroll_to';
  heroBtn2.props.scrollTargetId = 'sec-about';
  heroBtnGroupDiv.components.push(heroBtn2);

  heroLeftDiv.components.push(heroBtnGroupDiv);

  // --- Coluna direita: imagem hero ---
  const heroRightDiv = createDefaultDiv('Imagem Hero');
  heroRightDiv.layout.flexBasis = '45%';
  heroRightDiv.layout.alignItems = 'center';
  heroRightDiv.layout.justifyContent = 'center';
  heroRightDiv.mobile = { flexBasis: '100%' };

  const heroImg = createDefaultComponent('image');
  heroImg.props.src           = images.hero || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800';
  heroImg.props.alt           = professional.name ? `Foto de ${professional.name}` : 'Psicóloga em atendimento';
  heroImg.props.aspectRatio   = '4/5';
  heroImg.props.borderRadius  = '24px';
  heroImg.props.objectFit     = 'cover';
  heroRightDiv.components.push(heroImg);

  heroSection.components.push(heroLeftDiv, heroRightDiv);

  // Se o modelo legado especificava um cabeçalho / navbar, gera uma seção de cabeçalho
  if (legacyData?.siteConfig?.navbar || legacyData?.navbar) {
    const navConfig = legacyData?.siteConfig?.navbar || legacyData?.navbar;
    if (navConfig.enabled !== false) {
      const headerSection = convertNavbarConfigToSection(navConfig);
      sections.push(headerSection);
    }
  }

  sections.push(heroSection);

  // ==========================================================================
  // 2. DEMAIS SEÇÕES LEGADAS
  // ==========================================================================
  for (const legacySec of legacySections) {
    const secType = legacySec.type;

    if (secType === 'diagnostic') {
      const diagSec = createDefaultSection('Especialidades');
      diagSec.id = 'sec-diagnostic';

      const headerDiv = createDefaultDiv('Cabeçalho Seção');
      headerDiv.layout.alignItems = 'center';
      headerDiv.layout.maxWidth = '700px';

      const hBadge = createDefaultComponent('badge');
      hBadge.props.text = 'COMO POSSO TE AJUDAR';
      headerDiv.components.push(hBadge);

      const hTitle = createDefaultComponent('heading');
      hTitle.props.text = dictionary.diagnostic?.title || 'Áreas de Atuação & Especialidades';
      hTitle.props.level = 2;
      hTitle.style.textAlign = 'center';
      headerDiv.components.push(hTitle);

      const hSub = createDefaultComponent('paragraph');
      hSub.props.html = `<p>${dictionary.diagnostic?.subtitle || 'Tratamentos especializados focados no seu bem-estar.'}</p>`;
      hSub.style.textAlign = 'center';
      headerDiv.components.push(hSub);

      diagSec.components.push(headerDiv);

      const gridDiv = createDefaultDiv('Grid Especialidades');
      gridDiv.layout.flexDirection = 'row';
      gridDiv.layout.flexWrap = 'wrap';
      gridDiv.layout.gap = '20px';
      gridDiv.mobile = { flexDirection: 'column' };

      const items = Array.isArray(dictionary.diagnostic?.items) ? dictionary.diagnostic.items : [
        { title: 'Ansiedade & Estresse', desc: 'Acompanhamento para manejo de crises e controle da ansiedade no dia a dia.' },
        { title: 'Depressão', desc: 'Espaço seguro para acolhimento e reconstrução da qualidade de vida.' },
        { title: 'Autoconhecimento', desc: 'Desenvolvimento pessoal para compreender padrões emocionais e comportamentais.' },
      ];

      for (const item of items) {
        const itemDiv = createDefaultDiv(`Card ${item.title || 'Item'}`);
        itemDiv.layout.flexBasis = 'calc(33.333% - 14px)';
        itemDiv.layout.paddingTop = '24px';
        itemDiv.layout.paddingRight = '24px';
        itemDiv.layout.paddingBottom = '24px';
        itemDiv.layout.paddingLeft = '24px';
        itemDiv.mobile = { flexBasis: '100%' };

        itemDiv.border = {
          borderStyle: 'solid',
          borderWidth: '1px',
          borderColor: 'var(--surface-border)',
          borderRadius: '16px',
        };

        const cardComp = createDefaultComponent('card');
        cardComp.props.title = item.title || item.name || 'Especialidade';
        cardComp.props.description = item.desc || item.description || 'Descrição da especialidade.';
        cardComp.props.icon = 'HeartHandshake';
        itemDiv.components.push(cardComp);

        gridDiv.components.push(itemDiv);
      }

      diagSec.components.push(gridDiv);
      sections.push(diagSec);

    } else if (secType === 'about') {
      const aboutSec = createDefaultSection('Sobre Mim');
      aboutSec.id = 'sec-about';
      aboutSec.layout.flexDirection = 'row';
      aboutSec.layout.alignItems = 'center';
      aboutSec.layout.gap = '40px';
      aboutSec.mobile = { flexDirection: 'column' };

      const imgDiv = createDefaultDiv('Imagem Sobre');
      imgDiv.layout.flexBasis = '40%';
      imgDiv.mobile = { flexBasis: '100%' };

      const portraitImg = createDefaultComponent('image');
      portraitImg.props.src = images.portrait || images.hero || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800';
      portraitImg.props.alt = professional.name ? `Foto de ${professional.name}` : 'Sobre a Psicóloga';
      portraitImg.props.borderRadius = '24px';
      portraitImg.props.aspectRatio = '4/5';
      imgDiv.components.push(portraitImg);

      const textDiv = createDefaultDiv('Texto Sobre');
      textDiv.layout.flexBasis = '60%';
      textDiv.layout.gap = '20px';
      textDiv.mobile = { flexBasis: '100%' };

      const badgeComp = createDefaultComponent('badge');
      badgeComp.props.text = 'TRAJETÓRIA PROFISSIONAL';
      textDiv.components.push(badgeComp);

      const headingComp = createDefaultComponent('heading');
      headingComp.props.text = dictionary.about?.title || `Sobre ${professional.name || 'a Profissional'}`;
      headingComp.props.level = 2;
      textDiv.components.push(headingComp);

      if (professional.crp) {
        const crpPara = createDefaultComponent('paragraph');
        crpPara.props.html = `<p><strong>CRP: ${professional.crp}</strong></p>`;
        textDiv.components.push(crpPara);
      }

      const bioPara = createDefaultComponent('paragraph');
      bioPara.props.html = `<p>${
        dictionary.about?.bio ||
        professional.bio ||
        'Atuo com foco na promoção da saúde mental, oferecendo um espaço seguro, ético e empático para escuta e transformação pessoal.'
      }</p>`;
      textDiv.components.push(bioPara);

      aboutSec.components.push(imgDiv, textDiv);
      sections.push(aboutSec);

    } else if (secType === 'process') {
      const procSec = createDefaultSection('Como Funciona');
      procSec.id = 'sec-process';

      const headerDiv = createDefaultDiv('Cabeçalho Processo');
      headerDiv.layout.alignItems = 'center';

      const pTitle = createDefaultComponent('heading');
      pTitle.props.text = dictionary.process?.title || 'Como Funciona o Atendimento';
      pTitle.props.level = 2;
      pTitle.style.textAlign = 'center';
      headerDiv.components.push(pTitle);

      procSec.components.push(headerDiv);

      const stepsDiv = createDefaultDiv('Passos do Processo');
      stepsDiv.layout.flexDirection = 'row';
      stepsDiv.layout.gap = '24px';
      stepsDiv.mobile = { flexDirection: 'column' };

      const steps = Array.isArray(dictionary.process?.steps) ? dictionary.process.steps : [
        { step: '01', title: 'Primeiro Contato', desc: 'Preencha a triagem ou envie uma mensagem no WhatsApp.' },
        { step: '02', title: 'Alinhamento', desc: 'Ajustamos horários, modalidade e tiramos suas dúvidas iniciais.' },
        { step: '03', title: 'Primeira Sessão', desc: 'Início do acompanhamento em um ambiente acolhedor e seguro.' },
      ];

      for (const s of steps) {
        const stepDiv = createDefaultDiv(`Passo ${s.step || ''}`);
        stepDiv.layout.flexBasis = '33.333%';
        stepDiv.layout.paddingTop = '20px';
        stepDiv.layout.paddingRight = '20px';
        stepDiv.layout.paddingBottom = '20px';
        stepDiv.layout.paddingLeft = '20px';
        stepDiv.mobile = { flexBasis: '100%' };

        stepDiv.border = {
          borderStyle: 'solid',
          borderWidth: '1px',
          borderColor: 'var(--surface-border)',
          borderRadius: '16px',
        };

        const card = createDefaultComponent('card');
        card.props.title = `${s.step ? s.step + '. ' : ''}${s.title || 'Etapa'}`;
        card.props.description = s.desc || s.description || 'Descrição do passo.';
        stepDiv.components.push(card);

        stepsDiv.components.push(stepDiv);
      }

      procSec.components.push(stepsDiv);
      sections.push(procSec);

    } else if (secType === 'faq') {
      const faqSec = createDefaultSection('Perguntas Frequentes');
      faqSec.id = 'sec-faq';

      const headerDiv = createDefaultDiv('Cabeçalho FAQ');
      headerDiv.layout.alignItems = 'center';

      const faqTitle = createDefaultComponent('heading');
      faqTitle.props.text = dictionary.faq?.title || 'Dúvidas Frequentes';
      faqTitle.props.level = 2;
      faqTitle.style.textAlign = 'center';
      headerDiv.components.push(faqTitle);

      faqSec.components.push(headerDiv);

      const itemsDiv = createDefaultDiv('Lista FAQ');
      itemsDiv.layout.maxWidth = '800px';
      itemsDiv.layout.gap = '12px';

      const faqItems = Array.isArray(dictionary.faq?.items) ? dictionary.faq.items : [
        { q: 'Como funciona a primeira consulta?', a: 'A primeira consulta é um momento de escuta inicial para entendermos suas demandas e alinharmos as expectativas do processo terapêutico.' },
        { q: 'Qual a duração e frequência das sessões?', a: 'As sessões têm duração média de 50 minutos e ocorrem semanalmente, adaptando-se às necessidades do paciente.' },
        { q: 'Atende por plano de saúde / convênio?', a: 'O atendimento é particular, mas forneço recibo/comprovante para solicitação de reembolso junto ao seu convênio.' },
      ];

      for (const item of faqItems) {
        const faqComp = createDefaultComponent('faq_item');
        faqComp.props.question = item.q || item.question || 'Pergunta frequente?';
        faqComp.props.answer   = item.a || item.answer   || 'Resposta detalhada.';
        itemsDiv.components.push(faqComp);
      }

      faqSec.components.push(itemsDiv);
      sections.push(faqSec);
    }
  }

  // ==========================================================================
  // 3. CTA FINAL SECTION
  // ==========================================================================
  const ctaSec = createDefaultSection('Chamada Final');
  ctaSec.id = 'sec-cta';

  const ctaContentDiv = createDefaultDiv('Conteúdo CTA Final');
  ctaContentDiv.layout.alignItems = 'center';
  ctaContentDiv.layout.maxWidth = '600px';
  ctaContentDiv.layout.gap = '20px';

  const ctaHeading = createDefaultComponent('heading');
  ctaHeading.props.text = 'Pronto para dar o primeiro passo?';
  ctaHeading.props.level = 2;
  ctaHeading.style.textAlign = 'center';
  ctaContentDiv.components.push(ctaHeading);

  const ctaPara = createDefaultComponent('paragraph');
  ctaPara.props.html = '<p>Agende sua sessão e comece sua jornada de autoconhecimento e bem-estar emocional.</p>';
  ctaPara.style.textAlign = 'center';
  ctaContentDiv.components.push(ctaPara);

  const ctaBtn = createDefaultComponent('button');
  ctaBtn.props.label   = 'Agendar Consulta';
  ctaBtn.props.variant = 'primary';
  ctaBtn.props.size    = 'lg';
  ctaBtn.props.action  = 'cta_primary';
  ctaContentDiv.components.push(ctaBtn);

  ctaSec.components.push(ctaContentDiv);
  sections.push(ctaSec);

  // ==========================================================================
  // 4. FOOTER / RODAPÉ SECTION (BASE)
  // ==========================================================================
  const footerSection = createFooterSectionTemplate();
  footerSection.id = 'sec-footer';
  sections.push(footerSection);

  return {
    version: '2.0',
    sections,
  };
}

function convertNavbarConfigToSection(nav: NavbarConfig): Section {
  const headerSec = createDefaultSection('Cabeçalho / Navbar');
  headerSec.id = 'sec-header';
  headerSec.layout.paddingTop = '16px';
  headerSec.layout.paddingBottom = '16px';
  headerSec.layout.paddingLeft = '24px';
  headerSec.layout.paddingRight = '24px';
  headerSec.layout.maxContentWidth = '1200px';
  headerSec.layout.position = 'sticky';
  headerSec.layout.verticalAnchor = 'top';
  headerSec.layout.verticalOffset = '0px';
  headerSec.layout.top = '0px';
  headerSec.layout.zIndex = 50;

  const headerDiv = createDefaultDiv('Barra de Navegação');
  headerDiv.layout.flexDirection = 'row';
  headerDiv.layout.alignItems = 'center';
  headerDiv.layout.justifyContent = 'space-between';
  headerDiv.layout.width = '100%';

  const logoComp = createDefaultComponent('logo');
  headerDiv.components.push(logoComp);

  if (Array.isArray(nav.links) && nav.links.length > 0) {
    const navLinksComp = createDefaultComponent('navbar_links');
    navLinksComp.props.links = nav.links;
    headerDiv.components.push(navLinksComp);
  }

  if (nav.showCtaButton !== false) {
    const navBtn = createDefaultComponent('button');
    navBtn.props.label = nav.ctaButtonText || 'Agendar';
    navBtn.props.variant = 'primary';
    navBtn.props.size = 'sm';
    navBtn.props.action = (nav.ctaButtonAction as any) || 'cta_primary';
    headerDiv.components.push(navBtn);
  }

  headerSec.components.push(headerDiv);
  return headerSec;
}
