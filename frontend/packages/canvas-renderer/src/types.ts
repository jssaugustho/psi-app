// ============================================================================
// 🎨 TYPES — VISUAL PAGE RENDERER & EDITOR (CANVAS DATA V2.0)
// ============================================================================

export type FlexDirection = 'row' | 'column';
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type FlexAlign = 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
export type FlexJustify = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
export type OverflowValue = 'visible' | 'hidden' | 'clip';

export interface CustomTypographyPreset {
  id: string;
  name: string;
  patch: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    lineHeight?: string;
    letterSpacing?: string;
    textTransform?: string;
    textAlign?: string;
    color?: string;
  };
}

export interface NavbarLink {
  id: string;
  label: string;
  targetType: 'section' | 'external_url';
  sectionId?: string;
  externalUrl?: string;
}

export interface NavbarConfig {
  enabled: boolean;
  logoMode?: 'workspace' | 'custom_text' | 'custom_image';
  customText?: string;
  customImageUrl?: string;
  logoHeight?: number | string;
  positionMode?: 'static' | 'sticky' | 'fixed';
  sticky?: boolean;
  links: NavbarLink[];
  showCtaButton: boolean;
  ctaButtonText?: string;
  ctaButtonAction?: 'cta_primary' | 'cta_secondary' | 'whatsapp' | 'scroll_to' | 'external_url';
  ctaScrollTargetId?: string;
  ctaExternalUrl?: string;
  ctaWhatsappNumber?: string;
  ctaWhatsappMessage?: string;
  backgroundColor?: string;
  textColor?: string;
  linkFontFamily?: string;
  linkFontSize?: string;
  linkFontWeight?: string;
  linkLetterSpacing?: string;
  linkTextTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  ctaVariant?: 'primary' | 'secondary' | 'solid' | 'gradient' | 'glass' | 'outline' | 'soft';
  ctaBgColor?: string;
  ctaTextColor?: string;
  ctaBorderRadius?: string;
  ctaBorderWidth?: string;
  ctaBorderColor?: string;
  ctaBorderStyle?: string;
  ctaFontFamily?: string;
  ctaFontSize?: string;
  ctaFontWeight?: string;
  ctaLetterSpacing?: string;
  ctaTextTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  ctaPaddingX?: string;
  ctaPaddingY?: string;
  ctaHoverBackgroundColor?: string;
  ctaHoverColor?: string;
  ctaHoverBorderColor?: string;
  ctaHoverBoxShadow?: string;
  ctaHoverScale?: number;
  ctaHoverTranslateY?: number | string;
  ctaHoverOpacity?: number;
  ctaIconLeft?: string;
  ctaIconRight?: string;
  enableMobileHamburger?: boolean;
  mobileOverlayBgColor?: string;
  mobileOverlayTextColor?: string;
  mobileMenuAlign?: 'left' | 'center' | 'right';
  showMobileCtaButton?: boolean;
  mobileOverlayBackdropBlur?: 'none' | 'sm' | 'md' | 'lg';
}

export type PositionMode = 'static' | 'relative' | 'sticky' | 'fixed';

export interface SectionLayout {
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
  maxContentWidth?: string;
  fullWidth: boolean;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  marginTop: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  position?: PositionMode;
  verticalAnchor?: 'top' | 'bottom';
  verticalOffset?: string;
  initialOffset?: string;
  stickyScope?: 'parent' | 'page';
  horizontalAnchor?: 'left' | 'center' | 'right' | 'stretch';
  horizontalOffset?: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  zIndex?: number | string;
  appearOnScroll?: boolean;
  scrollThreshold?: string | number;
  mobilePositionMode?: 'relative' | 'sticky' | 'fixed' | 'static' | 'inherit';
  parallaxSpeed?: number;
  disableParallaxMobile?: boolean;
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
  style?: ComponentStyle | Record<string, any>;
}

export interface Section {
  id: string;
  type: 'section';
  label?: string;
  anchorId?: string;
  layout: SectionLayout;
  background: SectionBackground;
  border?: SectionBorder;
  effects?: SectionEffects;
  mobile?: SectionMobileOverride;
  components: Component[];
  locked?: boolean;
  hidden?: boolean;
}

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
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  position?: PositionMode;
  verticalAnchor?: 'top' | 'bottom';
  verticalOffset?: string;
  initialOffset?: string;
  stickyScope?: 'parent' | 'page';
  horizontalAnchor?: 'left' | 'center' | 'right' | 'stretch';
  horizontalOffset?: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  zIndex?: number | string;
  appearOnScroll?: boolean;
  scrollThreshold?: string | number;
  mobilePositionMode?: 'relative' | 'sticky' | 'fixed' | 'static' | 'inherit';
  parallaxSpeed?: number;
  disableParallaxMobile?: boolean;
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
  props?: Record<string, any>;
  style?: ComponentStyle | Record<string, any>;
}

export interface ComponentBase {
  id: string;
  type: ComponentType;
  label?: string;
  locked?: boolean;
  hidden?: boolean;
}

export interface DivComponent extends ComponentBase {
  type: 'div';
  props: Record<string, never>;
  layout: DivLayout;
  background?: DivBackground;
  border?: DivBorder;
  style?: ComponentStyle;
  boxShadow?: string;
  opacity?: number;
  mobile?: DivMobileOverride;
  components: Component[];
}

export interface CarouselProps {
  itemsPerView: number;
  itemsPerViewMobile?: number;
  gap: string;
  showArrows: boolean;
  arrowColor?: string;
  arrowBgColor?: string;
  arrowSpacing?: string;
  showPagination: boolean;
  paginationColor?: string;
  paginationVariant?: 'dots' | 'bars' | 'numbers';
  autoplay: boolean;
  autoplayInterval: number;
  transitionSpeed: number;
  pauseOnHover?: boolean;
}

export interface CarouselComponent extends ComponentBase {
  type: 'carousel';
  props: CarouselProps;
  layout: DivLayout;
  background?: DivBackground;
  border?: DivBorder;
  style?: ComponentStyle;
  boxShadow?: string;
  opacity?: number;
  mobile?: DivMobileOverride;
  components: DivComponent[];
}

export type AtomicComponentType =
  | 'heading' | 'paragraph' | 'label' | 'list'
  | 'image' | 'video' | 'icon' | 'divider'
  | 'button'
  | 'logo' | 'avatar'
  | 'badge' | 'testimonial' | 'stat_counter'
  | 'faq_item' | 'card'
  | 'spacer' | 'navbar_links' | 'social_links';

export type ComponentType = 'div' | 'carousel' | 'global_instance' | AtomicComponentType;

export type EffectType = 'shadow' | 'scale' | 'translate' | 'rotate' | 'opacity' | 'blur' | 'skew';

export interface ComponentEffectParams {
  preset?: 'none' | 'soft' | 'medium' | 'strong' | 'glow' | 'custom';
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  spread?: number;
  color?: string;
  inset?: boolean;
  scaleX?: number;
  scaleY?: number;
  uniform?: boolean;
  translateX?: number | string;
  translateY?: number | string;
  angle?: number;
  opacity?: number;
  blurRadius?: number;
  blurTarget?: 'filter' | 'backdrop';
  skewX?: number;
  skewY?: number;
}

export interface ComponentEffect {
  id: string;
  type: EffectType;
  enabled: boolean;
  name?: string;
  params: ComponentEffectParams;
}

export interface ComponentStyle {
  effects?: ComponentEffect[];
  display?: string;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  alignSelf?: FlexAlign | 'auto';
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic' | 'oblique' | string;
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
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  background?: string;
  backgroundColor?: string;
  gradientString?: string;
  borderRadius?: string;
  border?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  boxShadow?: string;
  opacity?: number;
  scale?: number | string;
  translateX?: number | string;
  translateY?: number | string;
  rotate?: number | string;
  cursor?: 'pointer' | 'default' | 'text' | 'not-allowed' | 'grab' | 'auto' | string;
  hoverEffect?: string;
  hoverBackgroundColor?: string;
  hoverColor?: string;
  hoverBorderStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | string;
  hoverBorderColor?: string;
  hoverBorderWidth?: string;
  hoverBorderRadius?: string;
  hoverBoxShadow?: string;
  hoverOpacity?: number;
  hoverScale?: number | string;
  hoverTranslateX?: number | string;
  hoverTranslateY?: number | string;
  hoverRotate?: number | string;
  hoverCursor?: string;
  parallaxSpeed?: number;
  disableParallaxMobile?: boolean;
  transitionDurationMs?: number;
  transitionTimingFunction?: string;
  __isPreviewingHover?: boolean;
}

export interface ComponentMobileOverride {
  hidden?: boolean;
  style?: Partial<ComponentStyle>;
  props?: Partial<Record<string, unknown>>;
}

export interface ExposedPropDeclaration {
  path: string;
  nodeId: string;
  label: string;
  propKey: string;
  type: 'text' | 'color' | 'image' | 'link' | 'number' | 'boolean' | 'select';
  defaultValue?: any;
}

export interface GlobalComponentMaster {
  id: string;
  workspaceId: string;
  name: string;
  category?: string;
  iconName?: string;
  masterNode: Component;
  customizableProps: ExposedPropDeclaration[];
  updatedAt: string;
}

export interface AtomicComponent extends ComponentBase {
  type: AtomicComponentType;
  props: Record<string, any>;
  style: ComponentStyle;
  mobile?: ComponentMobileOverride;
}

export interface GlobalInstanceComponent extends ComponentBase {
  type: 'global_instance';
  globalComponentId: string;
  overrides: Record<string, any>;
  layout?: DivLayout;
  mobile?: ComponentMobileOverride;
}

export type Component = DivComponent | CarouselComponent | AtomicComponent | GlobalInstanceComponent;

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
  linkUrl?: string;
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
  enableAnimation?: boolean;
  startValue?: number;
  animationDuration?: number;
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
  iconSize?: number | string;
  iconMarginBottom?: number | string;
  iconBgColor?: string;
  iconBorderRadius?: string;
  iconPadding?: string;
  iconAlign?: 'left' | 'center' | 'right';
  titleMarginBottom?: number | string;
  imageUrl?: string;
  imagePosition?: 'top' | 'left' | 'right';
  variant?: 'flat' | 'glass' | 'outlined' | 'elevated';
  titleFontSize?: string;
  titleFontWeight?: string;
  titleColor?: string;
  bodyFontSize?: string;
  bodyFontWeight?: string;
  bodyColor?: string;
}

export interface MenuLinkItem {
  id: string;
  label: string;
  targetType: 'section' | 'external_url';
  sectionId?: string;
  externalUrl?: string;
}

export interface NavbarLinksProps {
  links: MenuLinkItem[];
  gap?: string;
  color?: string;
  hoverColor?: string;
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  letterSpacing?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface SocialLinkItem {
  id: string;
  platform: 'instagram' | 'whatsapp' | 'linkedin' | 'facebook' | 'youtube' | 'tiktok' | 'twitter' | 'website' | 'email';
  url: string;
  label?: string;
}

export interface SocialLinksProps {
  links: SocialLinkItem[];
  gap?: string;
  iconSize?: string;
  variant?: 'minimal' | 'circle' | 'filled' | 'outline';
  color?: string;
  hoverColor?: string;
  align?: 'left' | 'center' | 'right' | 'space-between';
}

export interface TypographyPresetStyle {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
}

export interface ButtonPresetStyle {
  id?: string;
  name?: string;
  variant?: 'gradient' | 'solid' | 'glass' | 'outline' | 'soft';
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  borderRadius?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  paddingY?: string;
  paddingX?: string;
  hoverBackgroundColor?: string;
  hoverColor?: string;
  hoverBorderColor?: string;
  hoverBoxShadow?: string;
  hoverScale?: number | string;
  hoverTranslateY?: number | string;
}

export interface CanvasGlobalStyles {
  typography?: {
    h1?: TypographyPresetStyle;
    h2?: TypographyPresetStyle;
    h3?: TypographyPresetStyle;
    h4?: TypographyPresetStyle;
    paragraph?: TypographyPresetStyle;
    label?: TypographyPresetStyle;
    [key: string]: TypographyPresetStyle | undefined;
  };
  buttons?: {
    primary?: ButtonPresetStyle;
    secondary?: ButtonPresetStyle;
    outline?: ButtonPresetStyle;
    glass?: ButtonPresetStyle;
    soft?: ButtonPresetStyle;
    [templateId: string]: ButtonPresetStyle | undefined;
  };
}

export interface CanvasData {
  version: '2.0';
  globalStyles?: CanvasGlobalStyles;
  globalComponentsMap?: Record<string, GlobalComponentMaster>;
  navbar?: NavbarConfig;
  sections: Section[];
}

export interface CanvasNode {
  id: string;
  type: 'root' | 'section' | 'div' | 'carousel' | 'global_instance' | AtomicComponentType;
  parentId: string | null;
  childrenIds: string[];
  name?: string;
  label?: string;
  anchorId?: string;
  stickyScope?: string;
  locked?: boolean;
  hidden?: boolean;
  props?: Record<string, any>;
  style?: Record<string, any>;
  layout?: Record<string, any>;
  border?: Record<string, any>;
  background?: Record<string, any>;
  effects?: Record<string, any>;
  mobile?: Record<string, any>;
  masterId?: string;
  overrides?: Record<string, any>;
  [key: string]: any;
}

export interface NormalizedCanvasData {
  version: '2.0';
  rootNodeId: 'root';
  nodes: Record<string, CanvasNode>;
  globalStyles?: CanvasGlobalStyles;
  globalComponentsMap?: Record<string, GlobalComponentMaster>;
  navbar?: NavbarConfig;
}

export type ViewportMode = 'desktop' | 'mobile';

export interface SelectionState {
  id: string | null;
  type: 'section' | 'div' | 'carousel' | 'navbar' | 'global_instance' | AtomicComponentType | null;
  path?: string[];
}
