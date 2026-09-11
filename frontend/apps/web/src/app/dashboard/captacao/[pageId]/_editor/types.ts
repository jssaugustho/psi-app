// ============================================================================
// 🎨 TYPES — VISUAL PAGE EDITOR (BLUEPRINT V2)
// ============================================================================

export type FlexDirection = 'row' | 'column';
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type FlexAlign = 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
export type FlexJustify = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
export type OverflowValue = 'visible' | 'hidden' | 'clip';

// ----------------------------------------------------------------------------
// NAVBAR DO SITE (Cabeçalho de Navegação)
// ----------------------------------------------------------------------------

export interface NavbarLink {
  id: string;
  label: string;
  targetType: 'section' | 'external_url';
  sectionId?: string;
  externalUrl?: string;
}

export interface NavbarConfig {
  enabled: boolean;
  logoMode: 'workspace' | 'custom_text' | 'custom_image';
  customText?: string;
  customImageUrl?: string;
  sticky: boolean;
  links: NavbarLink[];
  showCtaButton: boolean;
  ctaButtonText?: string;
  ctaButtonAction?: 'cta_primary' | 'whatsapp' | 'external_url';
}

// ----------------------------------------------------------------------------
// SEÇÃO (Nível 1 EXCLUSIVO - Full Width Top Container)
// ----------------------------------------------------------------------------

export interface SectionLayout {
  flexDirection: FlexDirection;
  flexWrap: FlexWrap;
  alignItems: FlexAlign;
  justifyContent: FlexJustify;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  gap: string;
  minHeight?: string;
  maxContentWidth?: string;
  fullWidth: boolean;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  marginTop: string;
  marginBottom: string;
}

export interface SectionBackground {
  type: 'none' | 'color' | 'gradient' | 'image' | 'video';
  color?: string;
  gradientType?: 'linear' | 'radial';
  gradientAngle?: number;
  gradientStops?: Array<{ color: string; position: number }>;
  gradientString?: string;
  imageUrl?: string;
  imagePosition?: string;
  imageSize?: 'cover' | 'contain' | 'auto';
  imageRepeat?: 'no-repeat' | 'repeat';
  imageOverlayColor?: string;
  backdropBlur?: string;
  videoUrl?: string;
  videoOverlayColor?: string;
}

export interface SectionBorder {
  topWidth?: string;
  rightWidth?: string;
  bottomWidth?: string;
  leftWidth?: string;
  color?: string;
  style?: 'none' | 'solid' | 'dashed' | 'dotted';
  radiusTopLeft?: string;
  radiusTopRight?: string;
  radiusBottomRight?: string;
  radiusBottomLeft?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderRadius?: string;
  width?: string;
}

export interface SectionEffects {
  boxShadow?: string;
  opacity?: number;
  overflow?: OverflowValue;
  zIndex?: number;
  backdropBlur?: string;
}

export interface SectionMobileOverride {
  hidden?: boolean;
  reverseChildren?: boolean;
  flexDirection?: FlexDirection;
  alignItems?: FlexAlign;
  justifyContent?: FlexJustify;
  gap?: string;
  minHeight?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  background?: Partial<SectionBackground>;
  border?: Partial<SectionBorder>;
}

export interface Section {
  id: string;
  type: 'section';
  label?: string;
  layout: SectionLayout;
  background: SectionBackground;
  border?: SectionBorder;
  effects?: SectionEffects;
  mobile?: SectionMobileOverride;
  components: Component[];
  locked?: boolean;
  hidden?: boolean;
}

// ----------------------------------------------------------------------------
// COMPONENTE DIV (Container Interno de Nível 2)
// ----------------------------------------------------------------------------

export interface DivLayout {
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  alignSelf?: FlexAlign | 'auto';
  flexDirection: FlexDirection;
  flexWrap: FlexWrap;
  alignItems: FlexAlign;
  justifyContent: FlexJustify;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  gap: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
}

export interface DivBackground {
  type: 'none' | 'color' | 'gradient' | 'image';
  color?: string;
  gradientType?: 'linear' | 'radial';
  gradientAngle?: number;
  gradientStops?: Array<{ color: string; position: number }>;
  gradientString?: string;
  imageUrl?: string;
  imagePosition?: string;
  imageSize?: 'cover' | 'contain' | 'auto';
  imageOverlayColor?: string;
  backdropBlur?: string;
}

export interface DivBorder {
  width?: string;
  color?: string;
  style?: 'none' | 'solid' | 'dashed' | 'dotted';
  radiusTopLeft?: string;
  radiusTopRight?: string;
  radiusBottomRight?: string;
  radiusBottomLeft?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderRadius?: string;
}

export interface DivMobileOverride {
  hidden?: boolean;
  flexDirection?: FlexDirection;
  alignItems?: FlexAlign;
  justifyContent?: FlexJustify;
  gap?: string;
  flexBasis?: string;
  flexGrow?: number;
  width?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  background?: Partial<DivBackground>;
  border?: Partial<DivBorder>;
  reverseChildren?: boolean;
}

export interface DivComponent extends ComponentBase {
  type: 'div';
  props: Record<string, never>;
  layout: DivLayout;
  background?: DivBackground;
  border?: DivBorder;
  boxShadow?: string;
  opacity?: number;
  mobile?: DivMobileOverride;
  components: Component[];
}

// ----------------------------------------------------------------------------
// COMPONENTES ATÔMICOS (Blocos sem Filhos)
// ----------------------------------------------------------------------------

export type AtomicComponentType =
  | 'heading' | 'paragraph' | 'label' | 'list'
  | 'image' | 'video' | 'icon' | 'divider'
  | 'button'
  | 'logo' | 'avatar'
  | 'badge' | 'testimonial' | 'stat_counter'
  | 'faq_item' | 'card'
  | 'spacer';

export type ComponentType = 'div' | AtomicComponentType;

export interface ComponentBase {
  id: string;
  type: ComponentType;
  label?: string;
  locked?: boolean;
  hidden?: boolean;
}

export interface ComponentStyle {
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  alignSelf?: FlexAlign | 'auto';
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  aspectRatio?: string;
  objectFit?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  marginTop?: string;
  marginBottom?: string;
  backgroundColor?: string;
  borderRadius?: string;
  border?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  boxShadow?: string;
  opacity?: number;
}

export interface ComponentMobileOverride {
  hidden?: boolean;
  style?: Partial<ComponentStyle>;
  props?: Partial<Record<string, unknown>>;
}

export interface AtomicComponent extends ComponentBase {
  type: AtomicComponentType;
  props: Record<string, any>;
  style: ComponentStyle;
  mobile?: ComponentMobileOverride;
}

export type Component = DivComponent | AtomicComponent;

// ----------------------------------------------------------------------------
// PROPS POR TIPO DE COMPONENTE ATÔMICO
// ----------------------------------------------------------------------------

export interface HeadingProps {
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  highlightWords?: string[];
  highlightColor?: string;
}

export interface ParagraphProps {
  html: string;
}

export interface LabelProps {
  text: string;
  htmlTag?: 'span' | 'p' | 'small' | 'strong';
}

export interface ListProps {
  items: Array<{ text: string; iconName?: string }>;
  listType: 'bullet' | 'check' | 'number' | 'icon';
  iconColor?: string;
  gap?: string;
}

export interface ImageProps {
  src: string;
  alt: string;
  objectFit: 'cover' | 'contain' | 'fill';
  objectPosition?: string;
  aspectRatio?: string;
  linkTo?: string;
  lazyLoad?: boolean;
  rounded?: string;
}

export interface VideoProps {
  src: string;
  embedType: 'upload' | 'youtube' | 'vimeo';
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  aspectRatio?: string;
  thumbnail?: string;
}

export interface IconProps {
  name: string;
  size: string;
  color?: string;
  strokeWidth?: number;
}

export interface DividerProps {
  style: 'solid' | 'dashed' | 'dotted' | 'none';
  orientation: 'horizontal' | 'vertical';
  thickness?: string;
  color?: string;
  width?: string;
}

export interface SpacerProps {
  height: string;
  mobileHeight?: string;
}

export interface ButtonProps {
  label: string;
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size: 'sm' | 'md' | 'lg' | 'xl';
  iconLeft?: string;
  iconRight?: string;
  fullWidth?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  action: 'cta_primary' | 'cta_secondary' | 'scroll_to' | 'external_url' | 'whatsapp';
  scrollTargetId?: string;
  externalUrl?: string;
  whatsappMessage?: string;
}

export interface ButtonGroupProps {
  buttons: ButtonProps[];
  direction: 'row' | 'column';
  gap?: string;
}

export interface LogoProps {
  mode: 'workspace' | 'image' | 'html';
  imageUrl?: string;
  htmlConfig?: { text: string; iconType: 'psi' | 'custom'; customIconUrl?: string };
  height?: string;
  linkHome?: boolean;
}

export interface AvatarProps {
  src?: string;
  shape: 'circle' | 'rounded' | 'square';
  size?: string;
  hasBorder?: boolean;
  borderColor?: string;
  hasShadow?: boolean;
}

export interface BadgeProps {
  text: string;
  variant: 'brand' | 'success' | 'warning' | 'info' | 'neutral';
  iconLeft?: string;
  rounded?: boolean;
}

export interface TestimonialProps {
  quote: string;
  authorName: string;
  authorTitle?: string;
  avatarUrl?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  showQuoteIcon?: boolean;
}

export interface StatCounterProps {
  value: string;
  label: string;
  iconName?: string;
  iconColor?: string;
}

export interface FaqItemProps {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

export interface CardProps {
  title?: string;
  body?: string;
  iconName?: string;
  iconColor?: string;
  imageUrl?: string;
  imagePosition?: 'top' | 'left' | 'right';
  variant?: 'flat' | 'glass' | 'outlined' | 'elevated';
}

// ----------------------------------------------------------------------------
// CANVAS DATA & ESTADO DO EDITOR
// ----------------------------------------------------------------------------

export interface CanvasData {
  version: '2.0';
  navbar?: NavbarConfig;
  sections: Section[];
}

export type ViewportMode = 'desktop' | 'mobile';

export interface SelectionState {
  id: string | null;
  type: 'section' | 'div' | 'navbar' | AtomicComponentType | null;
  path?: string[];
}
