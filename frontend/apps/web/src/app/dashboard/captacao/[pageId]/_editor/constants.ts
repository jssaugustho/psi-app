import {
  SectionLayout,
  SectionBackground,
  Section,
  DivLayout,
  DivComponent,
  AtomicComponent,
  AtomicComponentType
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
  fullWidth: true,
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

export function createDefaultComponent(type: AtomicComponentType): AtomicComponent {
  const baseId = crypto.randomUUID();
  const defaultStyle = {
    marginTop: '0px',
    marginBottom: '0px',
    paddingTop: '0px',
    paddingRight: '0px',
    paddingBottom: '0px',
    paddingLeft: '0px',
  };

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
          fontSize: '2rem',
          fontWeight: 'bold',
          lineHeight: '1.2',
          textAlign: 'left',
          color: 'var(--brand-contrast-color)',
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
          fontSize: '1rem',
          lineHeight: '1.6',
          textAlign: 'left',
          color: 'var(--brand-contrast-color)',
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
          fontSize: '0.875rem',
          fontWeight: '600',
          letterSpacing: '0.05em',
          color: 'var(--brand-gradient-start)',
        },
      };

    case 'button':
      return {
        id: baseId,
        type: 'button',
        label: 'Botão CTA',
        props: {
          label: 'Agendar Consulta',
          variant: 'primary',
          size: 'md',
          action: 'cta_primary',
        },
        style: {
          ...defaultStyle,
          backgroundColor: 'linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))',
          color: 'var(--brand-contrast-color)',
          borderStyle: 'none',
          borderWidth: '0px',
          borderColor: 'transparent',
          borderRadius: '8px',
        },
      };

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
          height: '40px',
          linkHome: true,
        },
        style: {
          ...defaultStyle,
        },
      };

    case 'avatar':
      return {
        id: baseId,
        type: 'avatar',
        label: 'Foto de Perfil / Avatar',
        props: {
          shape: 'circle',
          size: '120px',
          hasBorder: true,
          hasShadow: true,
        },
        style: {
          ...defaultStyle,
        },
      };

    case 'badge':
      return {
        id: baseId,
        type: 'badge',
        label: 'Badge / Chip',
        props: {
          text: 'Atendimento Online & Presencial',
          variant: 'brand',
          rounded: true,
        },
        style: {
          ...defaultStyle,
          backgroundColor: 'color-mix(in srgb, var(--brand-gradient-start) 15%, transparent)',
          color: 'var(--brand-gradient-start)',
          borderStyle: 'none',
          borderRadius: '9999px',
        },
      };

    case 'testimonial':
      return {
        id: baseId,
        type: 'testimonial',
        label: 'Depoimento',
        props: {
          quote: 'A terapia mudou minha forma de encarar os desafios do cotidiano. Recomendo muito o acompanhamento!',
          authorName: 'M. S.',
          authorTitle: 'Paciente há 1 ano',
          rating: 5,
          showQuoteIcon: true,
        },
        style: {
          ...defaultStyle,
          paddingTop: '24px',
          paddingRight: '24px',
          paddingBottom: '24px',
          paddingLeft: '24px',
          backgroundColor: 'color-mix(in srgb, var(--brand-gradient-start) 4%, var(--site-bg))',
          borderStyle: 'solid',
          borderWidth: '1px',
          borderColor: 'var(--surface-border)',
          borderRadius: '16px',
        },
      };

    case 'stat_counter':
      return {
        id: baseId,
        type: 'stat_counter',
        label: 'Contador / Métrica',
        props: {
          value: '+500',
          label: 'Horas de Atendimento Clínico',
          iconName: 'UserCheck',
        },
        style: {
          ...defaultStyle,
          textAlign: 'center',
          color: 'var(--brand-gradient-start)',
        },
      };

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
          paddingTop: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          backgroundColor: 'color-mix(in srgb, var(--brand-gradient-start) 3%, var(--site-bg))',
          borderStyle: 'solid',
          borderWidth: '1px',
          borderColor: 'var(--surface-border)',
          borderRadius: '12px',
        },
      };

    case 'card':
      return {
        id: baseId,
        type: 'card',
        label: 'Card / Bloco Informativo',
        props: {
          title: 'Ansiedade & Estresse',
          body: 'Aprenda a identificar gatilhos e a desenvolver estratégias práticas para regulação emocional.',
          iconName: 'HeartHandshake',
          variant: 'glass',
        },
        style: {
          ...defaultStyle,
          paddingTop: '24px',
          paddingRight: '24px',
          paddingBottom: '24px',
          paddingLeft: '24px',
          backgroundColor: 'color-mix(in srgb, var(--brand-gradient-start) 4%, var(--site-bg))',
          borderStyle: 'solid',
          borderWidth: '1px',
          borderColor: 'var(--surface-border)',
          borderRadius: '16px',
        },
      };

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

    default:
      throw new Error(`Tipo de componente desconhecido: ${type}`);
  }
}
