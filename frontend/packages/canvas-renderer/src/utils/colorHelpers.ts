import { CanvasData, Section, Component, DivComponent, AtomicComponent } from '../types';

export interface ThemeColors {
  primaryStart: string;
  primaryEnd: string;
  contrast: string;
  siteBg: string;
}

export function getLuminance(hexStr?: string): number {
  if (!hexStr || hexStr === 'transparent') return 255;
  if (hexStr.startsWith('rgb')) {
    const match = hexStr.match(/\d+/g);
    if (match && match.length >= 3) {
      return (parseInt(match[0], 10) * 299 + parseInt(match[1], 10) * 587 + parseInt(match[2], 10) * 114) / 1000;
    }
    return 255;
  }
  let hex = hexStr.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((x) => x + x).join('');
  if (hex.length !== 6) return 255;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export type TextCategory = 'heading' | 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'paragraph' | 'label' | 'badge' | 'subtext' | 'caption' | 'nav_links' | 'links' | string;

export function getTextFallbackColor(bgColor?: string, category: TextCategory = 'body'): string {
  const bgLum = getLuminance(bgColor || '#FFFFFF');
  const isLightBg = bgLum > 160;

  let opacity = 0.85;
  const cat = (category || 'body').toLowerCase();
  if (cat === 'heading' || cat === 'h1' || cat === 'h2' || cat === 'h3' || cat === 'title') {
    opacity = 1.0;
  } else if (cat === 'label' || cat === 'badge' || cat === 'subtext' || cat === 'caption' || cat === 'nav_links' || cat === 'h4') {
    opacity = 0.70;
  } else {
    opacity = 0.85; // body / paragraph
  }

  if (isLightBg) {
    return opacity >= 0.99 ? '#18181B' : `rgba(24, 24, 27, ${opacity.toFixed(2)})`;
  } else {
    return opacity >= 0.99 ? '#FFFFFF' : `rgba(255, 255, 255, ${opacity.toFixed(2)})`;
  }
}

export function getThemeColors(page?: any): ThemeColors {
  const pageTheme = page?.siteConfig?.theme || page?.theme || {};
  const themeColors = pageTheme.colors || {};
  const wsVisId =
    page?.workspace?.visualIdentity ||
    page?.tenant?.visualIdentity ||
    page?.visualIdentity ||
    {};
  const workspace = page?.workspace || page?.tenant || {};

  const primaryStart =
    pageTheme.primaryStart ||
    themeColors.primaryStart ||
    page?.primaryStart ||
    wsVisId.primaryColor ||
    workspace.gradientColorStart ||
    workspace.defaultSitePrimaryColor ||
    '#4F46E5';

  const primaryEnd =
    pageTheme.primaryEnd ||
    themeColors.primaryEnd ||
    page?.primaryEnd ||
    wsVisId.secondaryColor ||
    workspace.gradientColorEnd ||
    workspace.defaultSiteSecondaryColor ||
    '#7C3AED';

  const rawContrast =
    pageTheme.contrast ||
    themeColors.contrast ||
    page?.contrast ||
    wsVisId.contrastColor ||
    workspace.contrastColor ||
    workspace.defaultSiteContrastColor;

  const contrast =
    rawContrast ||
    (getLuminance(primaryStart) < 180 ? '#FFFFFF' : '#18181B');

  const siteBg =
    pageTheme.siteBg ||
    pageTheme.cardBg ||
    themeColors.siteBg ||
    themeColors.cardBg ||
    page?.siteBg ||
    page?.cardBg ||
    wsVisId.bgColor ||
    wsVisId.siteBg ||
    wsVisId.backgroundColor ||
    workspace.bgColor ||
    workspace.siteBg ||
    workspace.backgroundColor ||
    '#FFFFFF';

  return {
    primaryStart,
    primaryEnd,
    contrast,
    siteBg,
  };
}

export function extractCanvasColors(canvasData: CanvasData | null): string[] {
  if (!canvasData) return [];

  const colorSet = new Set<string>();

  const addColor = (val?: string) => {
    if (!val || typeof val !== 'string') return;
    const clean = val.trim();
    if (!clean || clean === 'transparent' || clean === 'inherit' || clean.startsWith('var(')) return;
    if (clean.startsWith('#') || clean.startsWith('rgb') || clean.startsWith('hsl')) {
      colorSet.add(clean.toUpperCase());
    }
  };

  const processComponent = (comp: Component) => {
    if (comp.type === 'div') {
      const div = comp as DivComponent;
      addColor(div.background?.color);
      addColor(div.border?.color);
      addColor(div.border?.borderColor);
      div.components.forEach(processComponent);
    } else {
      const atomic = comp as AtomicComponent;
      addColor(atomic.style?.color);
      addColor(atomic.style?.backgroundColor);
      addColor(atomic.style?.borderColor);
      if (atomic.props?.color) addColor(atomic.props.color);
      if (atomic.props?.iconColor) addColor(atomic.props.iconColor);
    }
  };

  canvasData.sections.forEach((sec: Section) => {
    addColor(sec.background?.color);
    addColor(sec.border?.color);
    addColor(sec.border?.borderColor);
    sec.components.forEach(processComponent);
  });

  return Array.from(colorSet).slice(0, 16);
}

export function extractCanvasGradients(canvasData: CanvasData | null): string[] {
  if (!canvasData) return [];

  const gradientSet = new Set<string>();

  const addGradient = (val?: string) => {
    if (!val || typeof val !== 'string') return;
    const clean = val.trim();
    if (!clean || !clean.includes('gradient')) return;
    gradientSet.add(clean);
  };

  const processComponent = (comp: Component) => {
    if (comp.type === 'div') {
      const div = comp as DivComponent;
      addGradient(div.background?.gradientString);
      addGradient(div.background?.color);
      if (div.components) div.components.forEach(processComponent);
    } else {
      const atomic = comp as AtomicComponent;
      addGradient((atomic.style as any)?.gradientString);
      addGradient((atomic.style as any)?.backgroundColor);
      addGradient((atomic.style as any)?.background);
    }
  };

  if (Array.isArray(canvasData.sections)) {
    canvasData.sections.forEach((sec: Section) => {
      addGradient(sec.background?.gradientString);
      addGradient(sec.background?.color);
      if (sec.components) sec.components.forEach(processComponent);
    });
  }

  return Array.from(gradientSet).slice(0, 12);
}

export function sanitizeCanvasColors(canvasData: CanvasData, _siteBg: string): CanvasData {
  return canvasData;
}

export interface TypographyLevelConfig {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: string;
  textAlign?: string;
}

export interface ThemeTypography {
  fontHeading: string;
  fontBody: string;
  baseFontSize: number;
  typeScaleRatio: number;
  levels: {
    h1: TypographyLevelConfig;
    h2: TypographyLevelConfig;
    h3: TypographyLevelConfig;
    h4: TypographyLevelConfig;
    paragraph: TypographyLevelConfig;
    links: TypographyLevelConfig;
    nav_links: TypographyLevelConfig;
    buttons: TypographyLevelConfig;
  };
  sizes: {
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    paragraph: string;
    links: string;
    nav_links: string;
    buttons: string;
  };
}

export function getThemeTypography(page?: any, canvasData?: CanvasData | null): ThemeTypography {
  const globalTypo = canvasData?.globalStyles?.typography || {};
  const pageTheme = page?.siteConfig?.theme || page?.theme || {};
  const wsVisId =
    page?.workspace?.visualIdentity ||
    page?.tenant?.visualIdentity ||
    page?.visualIdentity ||
    {};
  const workspace = page?.workspace || page?.tenant || {};

  const fontHeading =
    pageTheme.fontHeading ||
    wsVisId.fontHeading ||
    workspace.fontHeading ||
    'Playfair Display';

  const fontBody =
    pageTheme.fontBody ||
    wsVisId.fontBody ||
    workspace.fontBody ||
    'Inter';
  const baseFontSize = Number(pageTheme.baseFontSize) || 16;
  const typeScaleRatio = Number(pageTheme.typeScaleRatio) || 1.25;

  const savedLevels = pageTheme.levels || pageTheme.typographyLevels || {};

  const h1Px = Math.round(baseFontSize * Math.pow(typeScaleRatio, 3) * 100) / 100;
  const h2Px = Math.round(baseFontSize * Math.pow(typeScaleRatio, 2) * 100) / 100;
  const h3Px = Math.round(baseFontSize * Math.pow(typeScaleRatio, 1) * 100) / 100;
  const h4Px = Math.round(baseFontSize * Math.pow(typeScaleRatio, 0.5) * 100) / 100;
  const paraPx = baseFontSize;
  const linkPx = Math.round(baseFontSize * 0.875 * 100) / 100;
  const navLinkPx = Math.round(baseFontSize * 0.875 * 100) / 100;
  const buttonPx = Math.round(baseFontSize * 0.875 * 100) / 100;

  const defaultSizes = {
    h1: `${(h1Px / 16).toFixed(3)}rem`,
    h2: `${(h2Px / 16).toFixed(3)}rem`,
    h3: `${(h3Px / 16).toFixed(3)}rem`,
    h4: `${(h4Px / 16).toFixed(3)}rem`,
    paragraph: `${(paraPx / 16).toFixed(3)}rem`,
    links: `${(linkPx / 16).toFixed(3)}rem`,
    nav_links: `${(navLinkPx / 16).toFixed(3)}rem`,
    buttons: `${(buttonPx / 16).toFixed(3)}rem`,
  };

  const defaultWeights = {
    h1: '700',
    h2: '700',
    h3: '600',
    h4: '600',
    paragraph: '400',
    links: '600',
    nav_links: '500',
    buttons: '700',
  };

  const levels: ThemeTypography['levels'] = {
    h1: {
      fontFamily: globalTypo.h1?.fontFamily || savedLevels.h1?.fontFamily || fontHeading,
      fontSize: globalTypo.h1?.fontSize || savedLevels.h1?.fontSize || defaultSizes.h1,
      fontWeight: globalTypo.h1?.fontWeight || savedLevels.h1?.fontWeight || defaultWeights.h1,
      lineHeight: globalTypo.h1?.lineHeight || savedLevels.h1?.lineHeight,
      letterSpacing: globalTypo.h1?.letterSpacing || savedLevels.h1?.letterSpacing,
      textTransform: globalTypo.h1?.textTransform || savedLevels.h1?.textTransform,
      textAlign: globalTypo.h1?.textAlign || savedLevels.h1?.textAlign,
    },
    h2: {
      fontFamily: globalTypo.h2?.fontFamily || savedLevels.h2?.fontFamily || fontHeading,
      fontSize: globalTypo.h2?.fontSize || savedLevels.h2?.fontSize || defaultSizes.h2,
      fontWeight: globalTypo.h2?.fontWeight || savedLevels.h2?.fontWeight || defaultWeights.h2,
      lineHeight: globalTypo.h2?.lineHeight || savedLevels.h2?.lineHeight,
      letterSpacing: globalTypo.h2?.letterSpacing || savedLevels.h2?.letterSpacing,
      textTransform: globalTypo.h2?.textTransform || savedLevels.h2?.textTransform,
      textAlign: globalTypo.h2?.textAlign || savedLevels.h2?.textAlign,
    },
    h3: {
      fontFamily: globalTypo.h3?.fontFamily || savedLevels.h3?.fontFamily || fontHeading,
      fontSize: globalTypo.h3?.fontSize || savedLevels.h3?.fontSize || defaultSizes.h3,
      fontWeight: globalTypo.h3?.fontWeight || savedLevels.h3?.fontWeight || defaultWeights.h3,
      lineHeight: globalTypo.h3?.lineHeight || savedLevels.h3?.lineHeight,
      letterSpacing: globalTypo.h3?.letterSpacing || savedLevels.h3?.letterSpacing,
      textTransform: globalTypo.h3?.textTransform || savedLevels.h3?.textTransform,
      textAlign: globalTypo.h3?.textAlign || savedLevels.h3?.textAlign,
    },
    h4: {
      fontFamily: globalTypo.h4?.fontFamily || savedLevels.h4?.fontFamily || fontHeading,
      fontSize: globalTypo.h4?.fontSize || savedLevels.h4?.fontSize || defaultSizes.h4,
      fontWeight: globalTypo.h4?.fontWeight || savedLevels.h4?.fontWeight || defaultWeights.h4,
      lineHeight: globalTypo.h4?.lineHeight || savedLevels.h4?.lineHeight,
      letterSpacing: globalTypo.h4?.letterSpacing || savedLevels.h4?.letterSpacing,
      textTransform: globalTypo.h4?.textTransform || savedLevels.h4?.textTransform,
      textAlign: globalTypo.h4?.textAlign || savedLevels.h4?.textAlign,
    },
    paragraph: {
      fontFamily: globalTypo.paragraph?.fontFamily || savedLevels.paragraph?.fontFamily || fontBody,
      fontSize: globalTypo.paragraph?.fontSize || savedLevels.paragraph?.fontSize || defaultSizes.paragraph,
      fontWeight: globalTypo.paragraph?.fontWeight || savedLevels.paragraph?.fontWeight || defaultWeights.paragraph,
      lineHeight: globalTypo.paragraph?.lineHeight || savedLevels.paragraph?.lineHeight,
      letterSpacing: globalTypo.paragraph?.letterSpacing || savedLevels.paragraph?.letterSpacing,
      textTransform: globalTypo.paragraph?.textTransform || savedLevels.paragraph?.textTransform,
      textAlign: globalTypo.paragraph?.textAlign || savedLevels.paragraph?.textAlign,
    },
    links: {
      fontFamily: savedLevels.links?.fontFamily || fontBody,
      fontSize: savedLevels.links?.fontSize || defaultSizes.links,
      fontWeight: savedLevels.links?.fontWeight || defaultWeights.links,
      lineHeight: savedLevels.links?.lineHeight,
      letterSpacing: savedLevels.links?.letterSpacing,
      textTransform: savedLevels.links?.textTransform,
      textAlign: savedLevels.links?.textAlign,
    },
    nav_links: {
      fontFamily: savedLevels.nav_links?.fontFamily || savedLevels.links?.fontFamily || fontBody,
      fontSize: savedLevels.nav_links?.fontSize || defaultSizes.nav_links,
      fontWeight: savedLevels.nav_links?.fontWeight || defaultWeights.nav_links,
      lineHeight: savedLevels.nav_links?.lineHeight,
      letterSpacing: savedLevels.nav_links?.letterSpacing,
      textTransform: savedLevels.nav_links?.textTransform,
      textAlign: savedLevels.nav_links?.textAlign,
    },
    buttons: {
      fontFamily: savedLevels.buttons?.fontFamily || savedLevels.links?.fontFamily || fontBody,
      fontSize: savedLevels.buttons?.fontSize || savedLevels.links?.fontSize || defaultSizes.buttons,
      fontWeight: savedLevels.buttons?.fontWeight || defaultWeights.buttons,
      lineHeight: savedLevels.buttons?.lineHeight,
      letterSpacing: savedLevels.buttons?.letterSpacing || '0.025em',
      textTransform: savedLevels.buttons?.textTransform,
      textAlign: savedLevels.buttons?.textAlign,
    },
  };

  return {
    fontHeading,
    fontBody,
    baseFontSize,
    typeScaleRatio,
    levels,
    sizes: {
      h1: levels.h1.fontSize || defaultSizes.h1,
      h2: levels.h2.fontSize || defaultSizes.h2,
      h3: levels.h3.fontSize || defaultSizes.h3,
      h4: levels.h4.fontSize || defaultSizes.h4,
      paragraph: levels.paragraph.fontSize || defaultSizes.paragraph,
      links: levels.links.fontSize || defaultSizes.links,
      nav_links: levels.nav_links.fontSize || defaultSizes.nav_links,
      buttons: levels.buttons.fontSize || defaultSizes.buttons,
    },
  };
}

export interface ThemeButtonConfig {
  id?: string;
  name?: string;
  variant: 'gradient' | 'solid' | 'glass' | 'outline' | 'soft';
  backgroundColor?: string;
  gradientString?: string;
  color?: string;
  borderRadius?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  letterSpacing?: string;
  textTransform?: string;
  paddingY?: string;
  paddingX?: string;
  hoverBackgroundColor?: string;
  hoverColor?: string;
  hoverBorderColor?: string;
  hoverBoxShadow?: string;
  hoverScale?: number;
  hoverTranslateY?: number | string;
  hoverOpacity?: number;
  transitionDurationMs?: number;
  transitionTimingFunction?: string;
}

export interface ButtonTemplate extends ThemeButtonConfig {
  id: string;
  name: string;
}

export function getDefaultButtonTemplates(page?: any, canvasData?: CanvasData | null): ButtonTemplate[] {
  const colors = getThemeColors(page);
  const globalButtons = canvasData?.globalStyles?.buttons;

  if (globalButtons && typeof globalButtons === 'object') {
    const list = Object.values(globalButtons).filter(Boolean) as ButtonTemplate[];
    if (list.length > 0) return list;
  }

  const pageTheme = page?.siteConfig?.theme || page?.theme || {};
  const savedTemplates = pageTheme.buttonTemplates;

  if (Array.isArray(savedTemplates) && savedTemplates.length > 0) {
    return savedTemplates;
  }
  if (savedTemplates && typeof savedTemplates === 'object') {
    const list = Object.values(savedTemplates) as ButtonTemplate[];
    if (list.length > 0) return list;
  }

  return [
    {
      id: 'primary',
      name: 'Primário (Gradiente)',
      variant: 'gradient',
      backgroundColor: colors.primaryStart,
      gradientString: 'linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))',
      color: colors.contrast || '#FFFFFF',
      borderRadius: '12px',
      borderWidth: '1px',
      borderColor: 'transparent',
      borderStyle: 'none',
      paddingY: '12px',
      paddingX: '24px',
      hoverScale: 1.02,
      hoverTranslateY: -2,
    },
    {
      id: 'secondary',
      name: 'Secundário (Sólido)',
      variant: 'solid',
      backgroundColor: colors.primaryStart,
      color: colors.contrast || '#FFFFFF',
      borderRadius: '12px',
      borderWidth: '1px',
      borderColor: 'transparent',
      borderStyle: 'none',
      paddingY: '12px',
      paddingX: '24px',
      hoverTranslateY: -2,
    },
    {
      id: 'outline',
      name: 'Terciário (Outline)',
      variant: 'outline',
      backgroundColor: 'transparent',
      color: colors.primaryStart,
      borderRadius: '12px',
      borderWidth: '2px',
      borderColor: colors.primaryStart,
      borderStyle: 'solid',
      paddingY: '12px',
      paddingX: '24px',
      hoverBackgroundColor: `${colors.primaryStart}15`,
    },
  ];
}

export function getThemeButtonDefaults(page?: any, templateId?: string, canvasData?: CanvasData | null): ThemeButtonConfig {
  const pageTheme = page?.siteConfig?.theme || page?.theme || {};
  const templates = getDefaultButtonTemplates(page, canvasData);
  
  const targetTemplate = templateId
    ? templates.find((t) => t.id === templateId || t.variant === templateId)
    : undefined;

  const savedButton = targetTemplate || pageTheme.buttons || pageTheme.buttonDefaults || pageTheme.button || templates[0] || {};
  const colors = getThemeColors(page);
  const typo = getThemeTypography(page, canvasData);

  return {
    id: savedButton.id || 'primary',
    name: savedButton.name || 'Primário',
    variant: savedButton.variant || 'gradient',
    backgroundColor: savedButton.backgroundColor || colors.primaryStart,
    gradientString: savedButton.gradientString || 'linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))',
    color: savedButton.color || colors.contrast || '#FFFFFF',
    borderRadius: savedButton.borderRadius || '12px',
    borderWidth: savedButton.borderWidth || '1px',
    borderColor: savedButton.borderColor || 'transparent',
    borderStyle: savedButton.borderStyle || 'none',
    fontFamily: savedButton.fontFamily || typo.levels.buttons.fontFamily || typo.fontBody,
    fontSize: savedButton.fontSize || typo.levels.buttons.fontSize || '0.875rem',
    fontWeight: savedButton.fontWeight || typo.levels.buttons.fontWeight || '700',
    letterSpacing: savedButton.letterSpacing || typo.levels.buttons.letterSpacing || '0.025em',
    textTransform: savedButton.textTransform || typo.levels.buttons.textTransform || 'none',
    paddingY: savedButton.paddingY || '12px',
    paddingX: savedButton.paddingX || '24px',
    hoverBackgroundColor: savedButton.hoverBackgroundColor,
    hoverColor: savedButton.hoverColor,
    hoverBorderColor: savedButton.hoverBorderColor,
    hoverBoxShadow: savedButton.hoverBoxShadow,
    hoverScale: savedButton.hoverScale,
    hoverTranslateY: savedButton.hoverTranslateY,
    hoverOpacity: savedButton.hoverOpacity,
    transitionDurationMs: savedButton.transitionDurationMs || 200,
    transitionTimingFunction: savedButton.transitionTimingFunction || 'ease-in-out',
  };
}

export type HoverEffectType = 'none' | 'scale' | 'lift' | 'glow' | 'brightness' | 'shadow' | 'border-highlight' | 'zoom-image';

export function getComponentHoverClasses(
  effect?: HoverEffectType | string,
  isButton: boolean = false
): string {
  return '';
}

export function getComponentTransitionAndHoverStyle(
  style?: any,
  isHovered: boolean = false
): React.CSSProperties {
  if (!style) return {};

  const durationMs = style.transitionDurationMs !== undefined ? Number(style.transitionDurationMs) : 200;
  const timing = style.transitionTimingFunction || 'ease-in-out';

  const customStyle: React.CSSProperties = {
    transitionProperty: 'all',
    transitionDuration: `${durationMs}ms`,
    transitionTimingFunction: timing,
  };

  const normScale = style.scale !== undefined && style.scale !== '' ? Number(style.scale) : 1;
  const normTx = style.translateX !== undefined && style.translateX !== '' ? Number(style.translateX) : 0;
  const normTy = style.translateY !== undefined && style.translateY !== '' ? Number(style.translateY) : 0;
  const normRot = style.rotate !== undefined && style.rotate !== '' ? Number(style.rotate) : 0;
  const hasNormalTransform = normScale !== 1 || normTx !== 0 || normTy !== 0 || normRot !== 0;

  if (isHovered) {
    if (style.hoverBackgroundColor) {
      customStyle.background = style.hoverBackgroundColor;
    }
    if (style.hoverColor) {
      customStyle.color = style.hoverColor;
    }
    if (style.hoverBorderColor) {
      customStyle.borderColor = style.hoverBorderColor;
    }
    if (style.hoverBorderWidth) {
      customStyle.borderWidth = style.hoverBorderWidth;
    }
    if (style.hoverBorderRadius) {
      customStyle.borderRadius = style.hoverBorderRadius;
    }
    if (style.hoverBoxShadow) {
      customStyle.boxShadow = style.hoverBoxShadow;
    }
    const effectiveOpacity = style.hoverOpacity !== undefined ? style.hoverOpacity : style.opacity;
    if (effectiveOpacity !== undefined) {
      customStyle.opacity = effectiveOpacity;
    }

    const effScale = style.hoverScale !== undefined && style.hoverScale !== '' ? Number(style.hoverScale) : normScale;
    const effTx = style.hoverTranslateX !== undefined && style.hoverTranslateX !== '' ? Number(style.hoverTranslateX) : normTx;
    const effTy = style.hoverTranslateY !== undefined && style.hoverTranslateY !== '' ? Number(style.hoverTranslateY) : normTy;
    const effRot = style.hoverRotate !== undefined && style.hoverRotate !== '' ? Number(style.hoverRotate) : normRot;
    const hasHoverTransform = effScale !== 1 || effTx !== 0 || effTy !== 0 || effRot !== 0;

    if (hasHoverTransform || hasNormalTransform) {
      const hoverTransforms: string[] = [];
      if (effScale !== 1 || normScale !== 1) {
        hoverTransforms.push(`scale(${effScale})`);
      }
      if (effTx !== 0 || normTx !== 0) {
        const tx = typeof effTx === 'number' ? `${effTx}px` : effTx;
        hoverTransforms.push(`translateX(${tx})`);
      }
      if (effTy !== 0 || normTy !== 0) {
        const ty = typeof effTy === 'number' ? `${effTy}px` : effTy;
        hoverTransforms.push(`translateY(${ty})`);
      }
      if (effRot !== 0 || normRot !== 0) {
        const rot = typeof effRot === 'number' ? `${effRot}deg` : effRot;
        hoverTransforms.push(`rotate(${rot})`);
      }
      if (hoverTransforms.length > 0) {
        customStyle.transform = hoverTransforms.join(' ');
      }
    }
  } else {
    // Normal state styles & transforms
    if (style.boxShadow) {
      customStyle.boxShadow = style.boxShadow;
    }
    if (style.opacity !== undefined) {
      customStyle.opacity = style.opacity;
    }

    if (hasNormalTransform) {
      const normalTransforms: string[] = [];
      if (normScale !== 1) {
        normalTransforms.push(`scale(${normScale})`);
      }
      if (normTx !== 0) {
        const tx = typeof normTx === 'number' ? `${normTx}px` : normTx;
        normalTransforms.push(`translateX(${tx})`);
      }
      if (normTy !== 0) {
        const ty = typeof normTy === 'number' ? `${normTy}px` : normTy;
        normalTransforms.push(`translateY(${ty})`);
      }
      if (normRot !== 0) {
        const rot = typeof normRot === 'number' ? `${normRot}deg` : normRot;
        normalTransforms.push(`rotate(${rot})`);
      }
      if (normalTransforms.length > 0) {
        customStyle.transform = normalTransforms.join(' ');
      }
    }
  }

  return customStyle;
}

export { buildComponentCssStyle } from './styleBuilder';
export type { BuildComponentCssParams } from './styleBuilder';

