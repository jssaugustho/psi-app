import { CanvasData, Section, Component, DivComponent, AtomicComponent } from '../types';

export interface ThemeColors {
  primaryStart: string;
  primaryEnd: string;
  contrast: string;
  siteBg: string;
}

function getLuminance(hexStr: string): number {
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

  let contrast =
    pageTheme.contrast ||
    themeColors.contrast ||
    page?.contrast ||
    wsVisId.contrastColor ||
    workspace.contrastColor ||
    '#18181B';

  const siteBg =
    pageTheme.siteBg ||
    pageTheme.cardBg ||
    themeColors.siteBg ||
    themeColors.cardBg ||
    page?.siteBg ||
    page?.cardBg ||
    '#FFFFFF';

  // Auto-contraste inteligente: impede texto branco em fundo branco ou texto escuro em fundo escuro
  const siteBgLum = getLuminance(siteBg);
  const contrastLum = getLuminance(contrast);

  if (siteBgLum > 160 && contrastLum > 160) {
    contrast = '#18181B';
  } else if (siteBgLum <= 160 && contrastLum <= 160) {
    contrast = '#FFFFFF';
  }

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

export function sanitizeCanvasColors(canvasData: CanvasData, siteBg: string): CanvasData {
  if (!canvasData || !Array.isArray(canvasData.sections)) return canvasData;

  const isLightSite = getLuminance(siteBg) > 160;

  const legacyHardcodedBgs = new Set([
    '#09090B', '#09090b',
    '#070A13', '#070a13',
    '#080B13', '#080b13',
    '#000000', '#000',
    '#18181B', '#18181b',
    '#0F172A', '#0f172a',
    '#1E293B', '#1e293b',
    '#111827', '#1f2937',
    '#FFFFFF', '#ffffff', '#FFF', '#fff',
    '#FAF5FF', '#faf5ff',
    '#F8FAFC', '#f8fafc',
    '#F3F4F6', '#f3f4f6',
    '#FAFAFA', '#fafafa',
  ]);

  const sanitizeComponent = (comp: Component) => {
    if (comp.type === 'div') {
      const div = comp as DivComponent;
      if (isLightSite && div.background?.color && legacyHardcodedBgs.has(div.background.color.trim())) {
        div.background.color = 'transparent';
        if (div.background.gradientString && legacyHardcodedBgs.has(div.background.gradientString.trim())) {
          div.background.gradientString = undefined;
        }
      }
      if (div.components) div.components.forEach(sanitizeComponent);
    }
  };

  canvasData.sections.forEach((sec: Section) => {
    if (isLightSite && sec.background?.color && legacyHardcodedBgs.has(sec.background.color.trim())) {
      sec.background.color = 'transparent';
      if (sec.background.gradientString && legacyHardcodedBgs.has(sec.background.gradientString.trim())) {
        sec.background.gradientString = undefined;
      }
    }
    if (sec.components) sec.components.forEach(sanitizeComponent);
  });

  return canvasData;
}

