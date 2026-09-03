export interface PlatformBrandLike {
  name?: string | null;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  iconLightUrl?: string | null;
  iconDarkUrl?: string | null;
  gradientColorStart?: string | null;
  gradientColorEnd?: string | null;
  contrastColor?: string | null;
  bgLightColor?: string | null;
  bgDarkColor?: string | null;
  cardLightColor?: string | null;
  cardDarkColor?: string | null;
  textLightColor?: string | null;
  textDarkColor?: string | null;
  [key: string]: any;
}

export const PSI_PLATFORM_BRAND_CACHE_KEY = 'theraos_platform_brand_cache';
export const LEGACY_ADMIN_PLATFORM_BRAND_CACHE_KEY = 'theraos_admin_platform_brand_cache';
export const PSI_USER_WORKSPACE_BRAND_CACHE_KEY = 'theraos_user_workspace_brand_cache';

function hasValidBrandContent(brand: PlatformBrandLike | null | undefined): boolean {
  if (!brand) return false;
  return Boolean(
    brand.name ||
    brand.gradientColorStart ||
    brand.logoDarkUrl ||
    brand.logoLightUrl ||
    brand.iconDarkUrl ||
    brand.iconLightUrl
  );
}

export function savePlatformBrandBackup(brand: PlatformBrandLike | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (hasValidBrandContent(brand)) {
      const payload = JSON.stringify({ platformBrand: brand, updatedAt: Date.now() });
      // Salva em ambas as chaves (atual e legada do admin) para compatibilidade retroativa perfeita
      localStorage.setItem(PSI_PLATFORM_BRAND_CACHE_KEY, payload);
      localStorage.setItem(LEGACY_ADMIN_PLATFORM_BRAND_CACHE_KEY, payload);
    }
  } catch (e) {
    console.warn('Falha ao salvar cache da plataforma no localStorage:', e);
  }
}

export function loadPlatformBrandBackup<T extends PlatformBrandLike = PlatformBrandLike>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    // Tenta primeiro a chave unificada; se nula, tenta a chave antiga do admin
    const raw = localStorage.getItem(PSI_PLATFORM_BRAND_CACHE_KEY) || localStorage.getItem(LEGACY_ADMIN_PLATFORM_BRAND_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const candidate = (parsed.platformBrand as T) || (parsed.userTenant as T) || null;
    return hasValidBrandContent(candidate) ? candidate : null;
  } catch (e) {
    return null;
  }
}

export function saveUserWorkspaceBackup(userTenant: PlatformBrandLike | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (hasValidBrandContent(userTenant)) {
      localStorage.setItem(
        PSI_USER_WORKSPACE_BRAND_CACHE_KEY,
        JSON.stringify({ userTenant, updatedAt: Date.now() })
      );
    }
  } catch (e) {
    console.warn('Falha ao salvar cache do workspace no localStorage:', e);
  }
}

export function loadUserWorkspaceBackup<T extends PlatformBrandLike = PlatformBrandLike>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PSI_USER_WORKSPACE_BRAND_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const candidate = (parsed.userTenant as T) || null;
    return hasValidBrandContent(candidate) ? candidate : null;
  } catch (e) {
    return null;
  }
}

export function applyBrandStylesToDOM(
  platformBrand: PlatformBrandLike | null,
  currentTheme: 'light' | 'dark',
  defaultTitle: string = 'Psi App'
): void {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  const cachedPlatform = loadPlatformBrandBackup();
  const activePlatform = hasValidBrandContent(platformBrand) ? platformBrand : cachedPlatform;

  const start = activePlatform?.gradientColorStart || '#7C3AED';
  const end = activePlatform?.gradientColorEnd || '#A855F7';
  const contrast = activePlatform?.contrastColor || '#FFFFFF';

  root.style.setProperty('--brand-gradient-start', start);
  root.style.setProperty('--brand-gradient-end', end);
  root.style.setProperty('--brand-contrast-color', contrast);
  root.style.setProperty('--brand-gradient', `linear-gradient(135deg, ${start}, ${end})`);

  const bgLight = activePlatform?.bgLightColor || '#FAFAFA';
  const bgDark = activePlatform?.bgDarkColor || '#09090B';

  if (currentTheme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.setProperty('--brand-bg-color', bgLight);
    root.style.setProperty('--brand-card-bg-color', '#FFFFFF');
    root.style.setProperty('--brand-text-color', '#09090B');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    root.style.setProperty('--brand-bg-color', bgDark);
    root.style.setProperty('--brand-card-bg-color', `color-mix(in srgb, #FFFFFF 6%, ${bgDark})`);
    root.style.setProperty('--brand-text-color', '#F4F4F5');
  }

  // Favicon e Ícone
  const iconUrl =
    currentTheme === 'light'
      ? activePlatform?.iconLightUrl || activePlatform?.iconDarkUrl || activePlatform?.logoLightUrl || activePlatform?.logoDarkUrl
      : activePlatform?.iconDarkUrl || activePlatform?.iconLightUrl || activePlatform?.logoDarkUrl || activePlatform?.logoLightUrl;

  if (iconUrl) {
    const existingIcons = document.querySelectorAll("link[rel*='icon']");
    if (existingIcons.length > 0) {
      existingIcons.forEach((el) => {
        (el as HTMLLinkElement).href = iconUrl;
      });
    } else {
      const link = document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = iconUrl;
      document.getElementsByTagName('head')[0]?.appendChild(link);
    }
  }

  const platformTitle = activePlatform?.name || defaultTitle;
  document.title = platformTitle;
}
