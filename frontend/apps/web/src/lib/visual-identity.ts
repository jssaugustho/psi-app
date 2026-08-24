import { Workspace, VisualIdentity } from './api';

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
  const vi = customVisualIdentity || workspace?.visualIdentity;

  const logoUrl = vi?.logoUrl || workspace?.defaultSiteLogoUrl || workspace?.logoLightUrl || workspace?.logoDarkUrl || null;
  const faviconUrl = vi?.faviconUrl || workspace?.defaultSiteFaviconUrl || workspace?.iconLightUrl || workspace?.iconDarkUrl || null;

  const logoConfig = vi?.logoConfig || workspace?.defaultSiteLogoConfig || {
    mode: 'html',
    text: workspace?.name || 'Clínica',
    iconType: 'psi',
  };

  const primaryColor = vi?.primaryColor || workspace?.gradientColorStart || workspace?.defaultSitePrimaryColor || '#7C3AED';
  const secondaryColor = vi?.secondaryColor || workspace?.gradientColorEnd || workspace?.defaultSiteSecondaryColor || '#A855F7';
  const contrastColor = vi?.contrastColor || workspace?.contrastColor || '#FFFFFF';

  const bgColor = vi?.bgColor || workspace?.bgDarkColor || '#09090B';
  const cardColor = vi?.cardColor || workspace?.cardDarkColor || '#18181B';
  const textColor = vi?.textColor || workspace?.textDarkColor || '#F4F4F5';

  const fontHeading = vi?.fontHeading || 'Playfair Display';
  const fontBody = vi?.fontBody || 'Inter';

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
