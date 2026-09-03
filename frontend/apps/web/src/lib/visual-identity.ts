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

  const vi = customVisualIdentity || activeWorkspace?.visualIdentity;

  const logoUrl = vi?.logoUrl || activeWorkspace?.defaultSiteLogoUrl || activeWorkspace?.logoLightUrl || activeWorkspace?.logoDarkUrl || null;
  const faviconUrl = vi?.faviconUrl || activeWorkspace?.defaultSiteFaviconUrl || activeWorkspace?.iconLightUrl || activeWorkspace?.iconDarkUrl || null;

  const logoConfig = vi?.logoConfig || activeWorkspace?.defaultSiteLogoConfig || {
    mode: 'html',
    text: activeWorkspace?.name || 'Clínica',
    iconType: 'psi',
  };

  const primaryColor = vi?.primaryColor || activeWorkspace?.gradientColorStart || activeWorkspace?.defaultSitePrimaryColor || '#7C3AED';
  const secondaryColor = vi?.secondaryColor || activeWorkspace?.gradientColorEnd || activeWorkspace?.defaultSiteSecondaryColor || '#A855F7';
  const contrastColor = vi?.contrastColor || activeWorkspace?.contrastColor || '#FFFFFF';

  const bgColor = vi?.bgColor || activeWorkspace?.bgDarkColor || '#09090B';
  const cardColor = vi?.cardColor || activeWorkspace?.cardDarkColor || '#18181B';
  const textColor = vi?.textColor || activeWorkspace?.textDarkColor || '#F4F4F5';

  let fontHeading = vi?.fontHeading || 'Playfair Display';
  if (fontHeading === 'serif') fontHeading = 'Playfair Display';

  let fontBody = vi?.fontBody || 'Inter';
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
