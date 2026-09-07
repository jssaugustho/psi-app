import { Workspace, VisualIdentity } from './api';
import { loadUserWorkspaceBackup } from '@psi/ui';

export interface ResolvedVisualIdentity {
  logoUrl?: string | null;
  faviconUrl?: string | null;
  logoConfig: {
    mode: 'html' | 'image';
    text?: string;
    iconType?: 'psi' | 'custom';
    customIconUrl?: string;
  };
  primaryColor: string;
  secondaryColor: string;
  contrastColor: string;
  bgColor: string;
  cardColor: string;
  textColor: string;
  fontHeading: string;
  fontBody: string;
}

export function getWorkspaceVisualIdentity(
  workspace?: Workspace | null,
  customVisualIdentity?: VisualIdentity | null
): ResolvedVisualIdentity {
  const cachedWorkspace = !workspace ? loadUserWorkspaceBackup<Workspace>() : null;
  const activeWorkspace = workspace || cachedWorkspace;

  let rawVi: any = customVisualIdentity || activeWorkspace?.visualIdentity;
  if (Array.isArray(rawVi)) {
    rawVi = rawVi[0] || null;
  }

  const logoUrl = rawVi?.logoUrl || rawVi?.logo_url || activeWorkspace?.defaultSiteLogoUrl || activeWorkspace?.logoLightUrl || activeWorkspace?.logoDarkUrl || null;
  const faviconUrl = rawVi?.faviconUrl || rawVi?.favicon_url || activeWorkspace?.defaultSiteFaviconUrl || activeWorkspace?.iconLightUrl || activeWorkspace?.iconDarkUrl || null;

  const logoConfig = rawVi?.logoConfig || rawVi?.logo_config || activeWorkspace?.defaultSiteLogoConfig || {
    mode: 'html',
    text: activeWorkspace?.name || 'Clínica',
    iconType: 'psi',
  };

  const primaryColor = rawVi?.primaryColor || rawVi?.primary_color || activeWorkspace?.defaultSitePrimaryColor || activeWorkspace?.gradientColorStart || '#7C3AED';
  const secondaryColor = rawVi?.secondaryColor || rawVi?.secondary_color || activeWorkspace?.defaultSiteSecondaryColor || activeWorkspace?.gradientColorEnd || '#A855F7';
  const contrastColor = rawVi?.contrastColor || rawVi?.contrast_color || activeWorkspace?.contrastColor || '#FFFFFF';

  const bgColor = rawVi?.bgColor || rawVi?.bg_color || activeWorkspace?.bgDarkColor || '#09090B';
  const cardColor = rawVi?.cardColor || rawVi?.card_color || activeWorkspace?.cardDarkColor || '#18181B';
  const textColor = rawVi?.textColor || rawVi?.text_color || activeWorkspace?.textDarkColor || '#F4F4F5';

  let fontHeading = rawVi?.fontHeading || rawVi?.font_heading || 'Playfair Display';
  if (fontHeading === 'serif') fontHeading = 'Playfair Display';

  let fontBody = rawVi?.fontBody || rawVi?.font_body || 'Inter';
  if (fontBody === 'sans') fontBody = 'Inter';

  return {
    logoUrl,
    faviconUrl,
    logoConfig,
    primaryColor,
    secondaryColor,
    contrastColor,
    bgColor,
    cardColor,
    textColor,
    fontHeading,
    fontBody,
  };
}
