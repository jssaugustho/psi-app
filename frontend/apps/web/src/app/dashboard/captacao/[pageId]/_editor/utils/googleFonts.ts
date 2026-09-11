/**
 * Carrega fontes do Google Fonts dinamicamente no document.head do editor.
 */
const COMMON_GOOGLE_FONTS = [
  'Italiana',
  'Playfair Display',
  'Cormorant Garamond',
  'Lora',
  'Bodoni Moda',
  'Prata',
  'Cinzel',
  'Outfit',
  'Plus Jakarta Sans',
  'Montserrat',
  'Syne',
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Poppins',
  'Space Grotesk',
  'Epilogue',
  'Sora',
  'DM Sans',
];

export function loadGoogleFonts(customFonts: (string | undefined)[] = []) {
  if (typeof document === 'undefined') return;

  const fontList = Array.from(
    new Set([
      ...COMMON_GOOGLE_FONTS,
      ...customFonts.filter(
        (f): f is string => !!f && f.trim() !== '' && !f.startsWith('system') && !f.startsWith('inherit')
      ),
    ])
  );

  const fontFamiliesQuery = fontList
    .map((f) => f.replace(/\s+/g, '+'))
    .map((f) => `family=${f}:wght@300;400;500;600;700;800;900`)
    .join('&');

  const href = `https://fonts.googleapis.com/css2?${fontFamiliesQuery}&display=swap`;
  const id = 'psi-editor-google-fonts';

  let link = document.getElementById(id) as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== href) {
    link.href = href;
  }
}
