import {
  SectionLayout,
  SectionBackground,
  Section,
  DivLayout,
  DivComponent,
  CarouselComponent,
  AtomicComponent,
  GlobalInstanceComponent,
  ComponentType
} from './types';

// ============================================================================
// DEFAULT LAYOUT & BACKGROUND DEFAULTS
// ============================================================================

export const DEFAULT_SECTION_LAYOUT: SectionLayout = {
  flexDirection: 'column',
  flexWrap: 'nowrap',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: '32px',
  minHeight: 'auto',
  maxContentWidth: '1200px',
  fullWidth: false,
  paddingTop: '80px',
  paddingRight: '24px',
  paddingBottom: '80px',
  paddingLeft: '24px',
  marginTop: '0px',
  marginBottom: '0px',
};

export const DEFAULT_SECTION_BACKGROUND: SectionBackground = {
  type: 'none',
};

export const DEFAULT_DIV_LAYOUT: DivLayout = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 'auto',
  alignSelf: 'auto',
  flexDirection: 'column',
  flexWrap: 'nowrap',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  gap: '16px',
  width: '100%',
  paddingTop: '0px',
  paddingRight: '0px',
  paddingBottom: '0px',
  paddingLeft: '0px',
};

// ============================================================================
// CONSTRUTORES DE SEÇÕES E COMPONENTES
// ============================================================================

export function createDefaultSection(label: string = 'Nova Seção'): Section {
  return {
    id: crypto.randomUUID(),
    type: 'section',
    label,
    layout: { ...DEFAULT_SECTION_LAYOUT },
    background: { ...DEFAULT_SECTION_BACKGROUND },
    components: [],
  };
}

export function createDefaultDiv(label: string = 'Container (Div)'): DivComponent {
  return {
    id: crypto.randomUUID(),
    type: 'div',
    label,
    props: {},
    layout: { ...DEFAULT_DIV_LAYOUT },
    components: [],
  };
}

export function createDefaultCarousel(label: string = 'Galeria / Carrossel'): CarouselComponent {
  const slide1 = createDefaultDiv('Slide 1');
  slide1.layout = {
    ...DEFAULT_DIV_LAYOUT,
    width: '100%',
    paddingTop: '16px',
    paddingRight: '16px',
    paddingBottom: '16px',
    paddingLeft: '16px',
    gap: '12px',
  };
  slide1.border = {
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'var(--surface-border)',
    borderRadius: '16px',
  };
  slide1.components = [createDefaultComponent('card')];

  const slide2 = createDefaultDiv('Slide 2');
  slide2.layout = {
    ...DEFAULT_DIV_LAYOUT,
    width: '100%',
    paddingTop: '16px',
    paddingRight: '16px',
    paddingBottom: '16px',
    paddingLeft: '16px',
    gap: '12px',
  };
  slide2.border = {
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'var(--surface-border)',
    borderRadius: '16px',
  };
  slide2.components = [createDefaultComponent('card')];

  const slide3 = createDefaultDiv('Slide 3');
  slide3.layout = {
    ...DEFAULT_DIV_LAYOUT,
    width: '100%',
    paddingTop: '16px',
    paddingRight: '16px',
    paddingBottom: '16px',
    paddingLeft: '16px',
    gap: '12px',
  };
  slide3.border = {
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'var(--surface-border)',
    borderRadius: '16px',
  };
  slide3.components = [createDefaultComponent('card')];

  return {
    id: crypto.randomUUID(),
    type: 'carousel',
    label,
    props: {
      itemsPerView: 3,
      itemsPerViewMobile: 1,
      gap: '16px',
      showArrows: true,
      arrowColor: 'var(--brand-contrast-color)',
      arrowBgColor: 'var(--brand-gradient-start)',
      arrowSpacing: '12px',
      showPagination: true,
      paginationColor: 'var(--brand-gradient-start)',
      paginationVariant: 'dots',
      autoplay: true,
      autoplayInterval: 4000,
      transitionSpeed: 500,
      pauseOnHover: true,
    },
    layout: {
      ...DEFAULT_DIV_LAYOUT,
      width: '100%',
    },
    components: [slide1, slide2, slide3],
  };
}

export function createDefaultComponent(type: ComponentType | string, preset?: string): AtomicComponent {
  const baseId = crypto.randomUUID();
  const defaultStyle = {};

  switch (type) {
    case 'heading':
      return {
        id: baseId,
        type: 'heading',
        label: 'Título (Heading)',
        props: {
          text: 'Digite seu título aqui',
          level: 2,
          highlightWords: [],
        },
        style: {
          ...defaultStyle,
        },
      };

    case 'paragraph':
      return {
        id: baseId,
        type: 'paragraph',
        label: 'Parágrafo',
        props: {
          html: '<p>Escreva seu texto aqui com acolhimento e clareza para seus pacientes.</p>',
        },
        style: {
          ...defaultStyle,
        },
      };

    case 'label':
      return {
        id: baseId,
        type: 'label',
        label: 'Legenda / Label',
        props: {
          text: 'SUBTÍTULO / ETIQUETA',
          htmlTag: 'span',
        },
        style: {
          ...defaultStyle,
        },
      };

    case 'button':
    case 'button_primary':
    case 'button_secondary': {
      const variant = preset || (type === 'button_secondary' ? 'secondary' : 'primary');
      const isSecondary = variant === 'secondary';
      const isPrimary = !isSecondary;
      return {
        id: baseId,
        type: 'button',
        label: isSecondary ? 'Botão Secundário' : 'Botão Primário',
        props: {
          label: isSecondary ? 'Saiba Mais' : 'Agendar Consulta',
          variant,
          size: 'md',
          action: isSecondary ? 'scroll_to' : 'cta_primary',
        },
        style: {
          marginTop: '0px',
          marginBottom: '0px',
          paddingTop: '12px',
          paddingRight: '24px',
          paddingBottom: '12px',
          paddingLeft: '24px',
          borderRadius: '12px',
          borderStyle: 'solid',
          borderWidth: '2px',

          background: isPrimary ? 'linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))' : 'transparent',
          color: isPrimary ? 'var(--brand-contrast-color)' : 'var(--brand-gradient-start)',
          borderColor: 'var(--brand-gradient-start)',

          hoverBackgroundColor: isPrimary ? 'transparent' : 'linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))',
          hoverColor: isPrimary ? 'var(--brand-gradient-start)' : 'var(--brand-contrast-color)',
          hoverBorderColor: isPrimary ? 'var(--brand-gradient-start)' : 'transparent',
        },
      };
    }

    case 'image':
      return {
        id: baseId,
        type: 'image',
        label: 'Imagem',
        props: {
          src: '',
          alt: 'Imagem ilustrativa',
          objectFit: 'cover',
          aspectRatio: '16/9',
          lazyLoad: true,
        },
        style: {
          ...defaultStyle,
          width: '100%',
        },
      };

    case 'video':
      return {
        id: baseId,
        type: 'video',
        label: 'Vídeo',
        props: {
          src: '',
          embedType: 'youtube',
          controls: true,
          aspectRatio: '16/9',
        },
        style: {
          ...defaultStyle,
          width: '100%',
        },
      };

    case 'icon':
      return {
        id: baseId,
        type: 'icon',
        label: 'Ícone',
        props: {
          name: 'Sparkles',
          size: '24px',
          strokeWidth: 2,
        },
        style: {
          ...defaultStyle,
          color: 'var(--brand-gradient-start)',
        },
      };

    case 'divider':
      return {
        id: baseId,
        type: 'divider',
        label: 'Separador (HR)',
        props: {
          style: 'solid',
          orientation: 'horizontal',
          thickness: '1px',
          color: 'var(--surface-border)',
          width: '100%',
        },
        style: {
          ...defaultStyle,
          marginTop: '16px',
          marginBottom: '16px',
        },
      };

    case 'spacer':
      return {
        id: baseId,
        type: 'spacer',
        label: 'Espaçador',
        props: {
          height: '32px',
          mobileHeight: '16px',
        },
        style: {
          ...defaultStyle,
        },
      };

    case 'logo':
      return {
        id: baseId,
        type: 'logo',
        label: 'Logotipo',
        props: {
          mode: 'workspace',
          width: '180px',
          align: 'left',
          linkHome: true,
        },
        style: {
          ...defaultStyle,
        },
      };

    case 'avatar': {
      const container = createDefaultDiv('Foto de Perfil / Avatar');
      container.layout = {
        ...DEFAULT_DIV_LAYOUT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
      };

      const avatarImg = createDefaultComponent('image');
      avatarImg.props = { src: '', alt: 'Foto de perfil', aspectRatio: '1/1', objectFit: 'cover' };
      avatarImg.style = { width: '56px', height: '56px', borderRadius: '9999px' };

      const textDiv = createDefaultDiv('Informações do Perfil');
      textDiv.layout = {
        ...DEFAULT_DIV_LAYOUT,
        flexDirection: 'column',
        gap: '2px',
        alignSelf: 'center',
      };

      const avatarName = createDefaultComponent('heading');
      avatarName.props = { text: 'Dra. Mariana Silva', level: 4 };
      avatarName.style = { fontSize: '16px', fontWeight: '600' };

      const avatarRole = createDefaultComponent('paragraph');
      avatarRole.props = { html: '<p>Psicóloga Clínica - CRP 06/123456</p>' };
      avatarRole.style = { fontSize: '13px', color: 'var(--mix-base)' };

      textDiv.components = [avatarName, avatarRole];
      container.components = [avatarImg, textDiv];
      return container as any;
    }

    case 'badge': {
      const container = createDefaultDiv('Selo / Badge');
      container.layout = {
        ...DEFAULT_DIV_LAYOUT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: '8px',
        width: 'auto',
        alignSelf: 'flex-start',
        paddingTop: '4px',
        paddingRight: '12px',
        paddingBottom: '4px',
        paddingLeft: '12px',
      };
      container.border = {
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: 'var(--surface-border)',
        borderRadius: '9999px',
      };
      container.style = {
        background: 'color-mix(in srgb, var(--brand-gradient-start) 10%, transparent)',
      };
      const badgeIcon = createDefaultComponent('icon');
      badgeIcon.props = { name: 'Sparkles', size: '14px', strokeWidth: 2 };
      badgeIcon.style = { color: 'var(--brand-gradient-start)' };

      const badgeLabel = createDefaultComponent('label');
      badgeLabel.props = { text: 'Atendimento Online & Presencial', htmlTag: 'span' };
      badgeLabel.style = { fontSize: '13px', fontWeight: '500', color: 'var(--brand-gradient-start)' };

      container.components = [badgeIcon, badgeLabel];
      return container as any;
    }

    case 'testimonial': {
      const container = createDefaultDiv('Depoimento');
      container.layout = {
        ...DEFAULT_DIV_LAYOUT,
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '16px',
        width: '100%',
        paddingTop: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
        paddingLeft: '24px',
      };
      container.border = {
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: 'var(--surface-border)',
        borderRadius: '16px',
      };
      container.style = {
        background: 'color-mix(in srgb, var(--brand-gradient-start) 4%, var(--site-bg))',
      };

      const quoteIcon = createDefaultComponent('icon');
      quoteIcon.props = { name: 'Quote', size: '28px', strokeWidth: 2 };
      quoteIcon.style = { color: 'var(--brand-gradient-start)', opacity: 0.7 };

      const quoteText = createDefaultComponent('paragraph');
      quoteText.props = { html: '<p>"A terapia mudou minha forma de encarar os desafios do cotidiano. Recomendo muito o acompanhamento!"</p>' };
      quoteText.style = { fontStyle: 'italic', fontSize: '15px' };

      const authorAvatar = createDefaultComponent('avatar');

      container.components = [quoteIcon, quoteText, authorAvatar];
      return container as any;
    }

    case 'stat_counter': {
      const container = createDefaultDiv('Contador / Métrica');
      container.layout = {
        ...DEFAULT_DIV_LAYOUT,
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        width: '100%',
        alignSelf: 'center',
      };

      const statIcon = createDefaultComponent('icon');
      statIcon.props = { name: 'UserCheck', size: '28px', strokeWidth: 2 };
      statIcon.style = { color: 'var(--brand-gradient-start)' };

      const statValue = createDefaultComponent('heading');
      statValue.props = { text: '+500', level: 2 };
      statValue.style = { fontSize: '32px', fontWeight: '700', color: 'var(--brand-gradient-start)' };

      const statLabel = createDefaultComponent('label');
      statLabel.props = { text: 'Horas de Atendimento Clínico', htmlTag: 'span' };
      statLabel.style = { fontSize: '14px', color: 'var(--mix-base)', textAlign: 'center' };

      container.components = [statIcon, statValue, statLabel];
      return container as any;
    }

    case 'faq_item':
      return {
        id: baseId,
        type: 'faq_item',
        label: 'Item FAQ',
        props: {
          question: 'Como funciona a primeira sessão de psicoterapia?',
          answer: 'Na primeira sessão realizamos uma escuta inicial acolhedora para compreender suas demandas e alinhar os objetivos do tratamento.',
          defaultOpen: false,
        },
        style: {
          ...defaultStyle,
          width: '100%',
          background: 'color-mix(in srgb, var(--brand-gradient-start) 3%, var(--site-bg))',
          borderStyle: 'solid',
          borderWidth: '1px',
          borderColor: 'var(--surface-border)',
          borderRadius: '12px',
        },
      };

    case 'card': {
      const container = createDefaultDiv('Card / Bloco Informativo');
      container.layout = {
        ...DEFAULT_DIV_LAYOUT,
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '16px',
        width: '100%',
        paddingTop: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
        paddingLeft: '24px',
      };
      container.border = {
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: 'var(--surface-border)',
        borderRadius: '16px',
      };
      container.style = {
        background: 'color-mix(in srgb, var(--brand-gradient-start) 4%, var(--site-bg))',
      };

      const cardIcon = createDefaultComponent('icon');
      cardIcon.props = { name: 'HeartHandshake', size: '28px', strokeWidth: 2 };
      cardIcon.style = { color: 'var(--brand-gradient-start)' };

      const cardHeading = createDefaultComponent('heading');
      cardHeading.props = { text: 'Ansiedade & Estresse', level: 3 };
      cardHeading.style = { fontSize: '20px', fontWeight: '600' };

      const cardParagraph = createDefaultComponent('paragraph');
      cardParagraph.props = { html: '<p>Aprenda a identificar gatilhos e a desenvolver estratégias práticas para regulação emocional.</p>' };

      container.components = [cardIcon, cardHeading, cardParagraph];
      return container as any;
    }

    case 'list':
      return {
        id: baseId,
        type: 'list',
        label: 'Lista de Itens',
        props: {
          items: [
            { text: 'Sessões online de 50 minutos', iconName: 'Check' },
            { text: 'Ambiente sigiloso e acolhedor', iconName: 'Check' },
            { text: 'Abordagem baseada em evidências', iconName: 'Check' },
          ],
          listType: 'check',
          gap: '12px',
        },
        style: {
          ...defaultStyle,
        },
      };

    case 'navbar_links':
      return {
        id: baseId,
        type: 'navbar_links',
        label: 'Menu de Links',
        props: {
          links: [
            { id: '1', label: 'Sobre Mim', targetType: 'section', sectionId: 'sec-about' },
            { id: '2', label: 'Especialidades', targetType: 'section', sectionId: 'sec-diagnostic' },
            { id: '3', label: 'Processo', targetType: 'section', sectionId: 'sec-process' },
            { id: '4', label: 'Dúvidas', targetType: 'section', sectionId: 'sec-faq' },
          ],
          gap: '24px',
        },
        style: {
          ...defaultStyle,
        },
      };

    case 'social_links':
      return {
        id: baseId,
        type: 'social_links',
        label: 'Redes Sociais',
        props: {
          links: [
            { id: '1', platform: 'instagram', url: 'https://instagram.com' },
            { id: '2', platform: 'whatsapp', url: 'https://wa.me/' },
            { id: '3', platform: 'linkedin', url: 'https://linkedin.com' },
          ],
          gap: '16px',
          iconSize: '20px',
          variant: 'minimal',
          align: 'left',
        },
        style: {
          ...defaultStyle,
        },
      };

    case 'carousel':
      return createDefaultCarousel() as any;

    case 'div':
      return createDefaultDiv() as any;

    case 'global_instance':
      return createDefaultGlobalInstance(preset || '') as any;

    default:
      throw new Error(`Tipo de componente desconhecido: ${type}`);
  }
}

export function createDefaultGlobalInstance(globalComponentId: string): GlobalInstanceComponent {
  return {
    id: crypto.randomUUID(),
    type: 'global_instance',
    globalComponentId,
    overrides: {},
  };
}

export function createHeaderSectionTemplate(preset: 'classic' | 'floating' | 'minimal' = 'classic'): Section {
  const section = createDefaultSection('Cabeçalho / Navbar');
  section.layout.paddingTop = '12px';
  section.layout.paddingBottom = '12px';
  section.layout.paddingLeft = '24px';
  section.layout.paddingRight = '24px';
  section.layout.position = 'relative';
  section.layout.verticalAnchor = 'top';
  section.layout.verticalOffset = preset === 'floating' ? '12px' : '0px';
  section.layout.top = preset === 'floating' ? '12px' : '0px';
  section.layout.zIndex = 50;

  if (preset === 'floating') {
    section.layout.marginTop = '12px';
    section.border = {
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: 'var(--surface-border)',
      borderRadius: '24px',
    };
    section.background = {
      type: 'color',
      color: 'color-mix(in srgb, var(--site-bg) 80%, transparent)',
      backdropBlur: '12px',
    };
  } else if (preset === 'minimal') {
    section.background = { type: 'none' };
  } else {
    section.background = {
      type: 'color',
      color: 'var(--site-bg)',
    };
    section.border = {
      bottomWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'var(--surface-border)',
    };
  }

  const containerDiv = createDefaultDiv('Container Navbar');
  containerDiv.layout.flexDirection = 'row';
  containerDiv.layout.justifyContent = 'space-between';
  containerDiv.layout.alignItems = 'center';
  containerDiv.layout.width = '100%';

  const logoComp = createDefaultComponent('logo');
  const linksComp = createDefaultComponent('navbar_links');
  const ctaComp = createDefaultComponent('button');

  containerDiv.components = [logoComp, linksComp, ctaComp];
  section.components = [containerDiv];

  return section;
}

export function createFooterSectionTemplate(): Section {
  const section = createDefaultSection('Rodapé / Footer');
  section.anchorId = 'sec-footer';
  section.layout.paddingTop = '60px';
  section.layout.paddingBottom = '40px';
  section.layout.paddingLeft = '24px';
  section.layout.paddingRight = '24px';
  section.layout.gap = '32px';

  // Usa background tipo 'none' para herdar naturalmente o --site-bg da página/workspace
  section.background = {
    type: 'none',
  };
  section.border = {
    topWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--surface-border)',
  };

  // Main Content Container (Flex Row: Left brand info, Right links)
  const topContainer = createDefaultDiv('Container Principal Rodapé');
  topContainer.layout.flexDirection = 'row';
  topContainer.layout.justifyContent = 'space-between';
  topContainer.layout.alignItems = 'flex-start';
  topContainer.layout.gap = '32px';
  topContainer.layout.width = '100%';
  topContainer.mobile = {
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  };

  // Left Column: Logo + Message
  const leftCol = createDefaultDiv('Coluna Marca & Mensagem');
  leftCol.layout.flexDirection = 'column';
  leftCol.layout.gap = '16px';
  leftCol.layout.maxWidth = '420px';
  leftCol.mobile = {
    alignItems: 'center',
  };

  const logoComp = createDefaultComponent('logo');
  const messageComp = createDefaultComponent('paragraph');
  messageComp.props.html = '<p>Espaço terapêutico dedicado à sua saúde mental, autoconhecimento e bem-estar emocional. Agende sua consulta.</p>';

  leftCol.components = [logoComp, messageComp];

  // Right Column: Navigation Links + Social Media Links
  const rightCol = createDefaultDiv('Coluna Navegação & Social');
  rightCol.layout.flexDirection = 'column';
  rightCol.layout.gap = '20px';
  rightCol.layout.alignItems = 'flex-end';
  rightCol.mobile = {
    alignItems: 'center',
  };

  const navLinksComp = createDefaultComponent('navbar_links');
  const socialLinksComp = createDefaultComponent('social_links');

  rightCol.components = [navLinksComp, socialLinksComp];

  topContainer.components = [leftCol, rightCol];

  // Divider Line
  const dividerComp = createDefaultComponent('divider');
  dividerComp.props.thickness = '1px';
  dividerComp.props.color = 'var(--surface-border)';

  // Bottom Bar Container (Copyright + TheraOS Badge)
  const bottomContainer = createDefaultDiv('Barra Inferior Copyright');
  bottomContainer.layout.flexDirection = 'row';
  bottomContainer.layout.justifyContent = 'space-between';
  bottomContainer.layout.alignItems = 'center';
  bottomContainer.layout.width = '100%';
  bottomContainer.mobile = {
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  };

  const currentYear = new Date().getFullYear();
  const copyrightComp = createDefaultComponent('paragraph');
  copyrightComp.props.html = `<p>© ${currentYear} Psicologia — Todos os direitos reservados.</p>`;
  copyrightComp.style.fontSize = '0.875rem';

  const theraosBadgeComp = createDefaultComponent('badge');
  theraosBadgeComp.label = 'Badge TheraOS';
  theraosBadgeComp.props = {
    text: '⚡ Feito com TheraOS',
    variant: 'neutral',
    rounded: true,
    linkUrl: 'https://theraos.app',
  };
  theraosBadgeComp.style.fontSize = '0.75rem';

  bottomContainer.components = [copyrightComp, theraosBadgeComp];

  section.components = [topContainer, dividerComp, bottomContainer];

  return section;
}

export function createSectionFromPreset(preset?: string): Section {
  if (preset === 'header_classic') {
    return createHeaderSectionTemplate('classic');
  }
  if (preset === 'header_floating') {
    return createHeaderSectionTemplate('floating');
  }
  if (preset === 'footer') {
    return createFooterSectionTemplate();
  }
  if (preset === '2col') {
    const sec = createDefaultSection('Seção (2 Colunas)');
    const div = createDefaultDiv('Container (2 Colunas)');
    div.layout.flexDirection = 'row';
    const col1 = createDefaultDiv('Coluna 1');
    col1.layout.flexBasis = '50%';
    col1.layout.width = '50%';
    const col2 = createDefaultDiv('Coluna 2');
    col2.layout.flexBasis = '50%';
    col2.layout.width = '50%';
    div.components = [col1, col2];
    sec.components = [div];
    return sec;
  }
  if (preset === '3col') {
    const sec = createDefaultSection('Seção (3 Colunas)');
    const div = createDefaultDiv('Container (3 Colunas)');
    div.layout.flexDirection = 'row';
    const col1 = createDefaultDiv('Coluna 1');
    col1.layout.flexBasis = '33.33%';
    col1.layout.width = '33.33%';
    const col2 = createDefaultDiv('Coluna 2');
    col2.layout.flexBasis = '33.33%';
    col2.layout.width = '33.33%';
    const col3 = createDefaultDiv('Coluna 3');
    col3.layout.flexBasis = '33.33%';
    col3.layout.width = '33.33%';
    div.components = [col1, col2, col3];
    sec.components = [div];
    return sec;
  }
  return createDefaultSection('Seção (1 Coluna)');
}

