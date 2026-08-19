/**
 * @psi/image-utils
 *
 * Compressão de imagem client-side via Canvas API.
 * O arquivo é comprimido/redimensionado localmente no browser antes do upload,
 * economizando CPU da VPS e banda do usuário.
 *
 * Saída sempre em WebP (com fallback para JPEG em browsers sem suporte).
 */

export type UploadType = 'avatar' | 'logo' | 'icon' | 'asset' | 'font';

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  /** Qualidade de 0 a 1. Padrão varia por tipo. */
  quality?: number;
}

const DEFAULTS: Record<UploadType, Required<CompressionOptions>> = {
  avatar: { maxWidth: 400,  maxHeight: 400,  quality: 0.85 },
  logo:   { maxWidth: 800,  maxHeight: 800,  quality: 0.85 },
  icon:   { maxWidth: 128,  maxHeight: 128,  quality: 0.90 },
  asset:  { maxWidth: 1920, maxHeight: 1920, quality: 0.80 },
  font:   { maxWidth: 0,    maxHeight: 0,    quality: 1.0  },
};

/**
 * Sanitiza o nome de uma fonte para uso seguro em CSS font-family, prevenindo CSS injection.
 */
export function sanitizeFontFamily(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
  return clean || 'CustomFont';
}

/**
 * Valida o cabeçalho binário (Magic Bytes) de um arquivo de fonte (.woff2, .woff, .ttf, .otf).
 * Impede upload de SVG, HTML ou scripts maliciosos mascarados.
 */
export async function validateFontFile(file: File): Promise<{
  valid: boolean;
  format: 'woff2' | 'woff' | 'truetype' | 'opentype';
  error?: string;
}> {
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, format: 'woff2', error: 'O arquivo de fonte deve ter no máximo 5MB.' };
  }

  const filenameLower = file.name.toLowerCase();
  if (filenameLower.endsWith('.svg') || file.type.includes('svg') || file.type.includes('html') || file.type.includes('xml')) {
    return { valid: false, format: 'woff2', error: 'Fontes em formato SVG/XML não são permitidas por motivos de segurança. Use apenas .woff2, .woff, .ttf ou .otf.' };
  }

  try {
    const buffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const magic = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const asciiMagic = String.fromCharCode(...bytes);

    // WOFF2: 'wOF2' (0x77 0x4F 0x46 0x32)
    if (asciiMagic === 'wOF2') {
      return { valid: true, format: 'woff2' };
    }
    // WOFF: 'wOFF' (0x77 0x4F 0x46 0x46)
    if (asciiMagic === 'wOFF') {
      return { valid: true, format: 'woff' };
    }
    // OpenType: 'OTTO' (0x4F 0x54 0x54 0x4F)
    if (asciiMagic === 'OTTO') {
      return { valid: true, format: 'opentype' };
    }
    // TrueType: 0x00010000 ou 'true' (0x74 0x72 0x75 0x65)
    if (magic === '00010000' || asciiMagic === 'true') {
      return { valid: true, format: 'truetype' };
    }
  } catch (err) {
    console.error('Erro na verificação de Magic Bytes da fonte:', err);
  }

  return {
    valid: false,
    format: 'woff2',
    error: 'Arquivo inválido. O conteúdo binário não corresponde a uma fonte válida (.woff2, .woff, .ttf, .otf).'
  };
}

/**
 * Comprime e redimensiona uma imagem localmente usando a Canvas API.
 *
 * - SVG é retornado sem alteração (não pode ser renderizado em canvas).
 * - Saída em `image/webp` quando o browser suportar, senão `image/jpeg`.
 * - O aspect ratio é sempre preservado.
 *
 * @param file       Arquivo original selecionado pelo usuário
 * @param type       Tipo de upload que determina as dimensões máximas e qualidade
 * @param overrides  Parâmetros opcionais que sobrescrevem os defaults do tipo
 * @returns          Novo File comprimido, pronto para upload
 */
export async function compressImage(
  file: File,
  type: UploadType,
  overrides?: CompressionOptions
): Promise<File> {
  // Limite preventivo para evitar que o navegador trave com arquivos gigantes
  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('O arquivo excede o limite máximo permitido de 15MB.');
  }

  // SVG e Fontes são mantidos sem alteração de canvas
  if (file.type === 'image/svg+xml' || type === 'font') {
    return file;
  }

  const opts = { ...DEFAULTS[type], ...overrides };

  return new Promise<File>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let { width, height } = img;

        // Redimensionar mantendo aspect ratio
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
          width  = Math.round(width  * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback: retorna o arquivo original se o canvas falhar
          return resolve(file);
        }

        const isLogoOrIcon = type === 'logo' || type === 'icon';
        const isTransparentFormat = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/svg+xml';
        const shouldPreserveTransparency = isLogoOrIcon || isTransparentFormat;

        if (shouldPreserveTransparency) {
          ctx.clearRect(0, 0, width, height);
        } else {
          // Fundo branco apenas para fotos opacas (ex: JPEG) para remover imperfeições
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Preferir WebP; browsers modernos (Chrome 23+, Firefox 65+, Safari 16+) suportam
        const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        
        let outputMime: string;
        let outputExt: string;

        if (shouldPreserveTransparency) {
          // Mantém transparência caindo para PNG se WebP não for suportado
          outputMime = supportsWebP ? 'image/webp' : 'image/png';
          outputExt  = supportsWebP ? 'webp' : 'png';
        } else {
          // Fotos opacas caem para JPEG se WebP não for suportado
          outputMime = supportsWebP ? 'image/webp' : 'image/jpeg';
          outputExt  = supportsWebP ? 'webp' : 'jpg';
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const baseName = file.name.split('.').slice(0, -1).join('.') || 'image';
            const compressed = new File([blob], `${baseName}.${outputExt}`, {
              type: outputMime,
              lastModified: Date.now(),
            });
            resolve(compressed);
          },
          outputMime,
          opts.quality
        );
      };

      img.onerror = reject;
    };

    reader.onerror = reject;
  });
}

export type ImageCategory = 'logotipo' | 'imagem';

export interface ImageValidationOptions {
  resolution?: { width: number; height: number };
  type: ImageCategory;
  maxFileSizeMB?: number;
}

/**
 * Detecta se um contexto de canvas possui transparência (canal alfa < 255).
 */
export function checkHasAlphaChannel(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }
  } catch (err) {
    console.error('Erro ao verificar transparência da imagem:', err);
  }
  return false;
}

/**
 * Valida os parâmetros de segurança de uma imagem (tamanho e proibição de transparência para não-logotipos).
 */
export async function validateImageSafety(
  fileOrUrl: File | string,
  options: ImageValidationOptions
): Promise<{ valid: boolean; error?: string }> {
  const maxMb = options.maxFileSizeMB || 15;
  if (typeof fileOrUrl !== 'string' && fileOrUrl.size > maxMb * 1024 * 1024) {
    return { valid: false, error: `O arquivo excede o limite máximo permitido de ${maxMb}MB.` };
  }

  if (options.type === 'imagem') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const src = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
      img.src = src;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 400);
        canvas.height = Math.min(img.height, 400);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (typeof fileOrUrl !== 'string') URL.revokeObjectURL(src);
          return resolve({ valid: true });
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const hasAlpha = checkHasAlphaChannel(ctx, canvas.width, canvas.height);
        if (typeof fileOrUrl !== 'string') URL.revokeObjectURL(src);

        if (hasAlpha) {
          return resolve({
            valid: false,
            error: 'Imagens do tipo "imagem" não podem conter transparência. Apenas logotipos permitem fundo transparente.'
          });
        }
        resolve({ valid: true });
      };
      img.onerror = () => {
        if (typeof fileOrUrl !== 'string') URL.revokeObjectURL(src);
        resolve({ valid: true });
      };
    });
  }

  return { valid: true };
}

