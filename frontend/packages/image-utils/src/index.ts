/**
 * @psi/image-utils
 *
 * Compressão de imagem client-side via Canvas API.
 * O arquivo é comprimido/redimensionado localmente no browser antes do upload,
 * economizando CPU da VPS e banda do usuário.
 *
 * Saída sempre em WebP (com fallback para JPEG em browsers sem suporte).
 */

export type UploadType = 'avatar' | 'logo' | 'icon' | 'asset';

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
};

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

  // SVG é vetorial — não faz sentido passar pelo canvas
  if (file.type === 'image/svg+xml') {
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

        if (!isLogoOrIcon) {
          // Fundo branco apenas para avatares e assets gerais para remover a transparência
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Preferir WebP; browsers modernos (Chrome 23+, Firefox 65+, Safari 16+) suportam
        const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        
        let outputMime: string;
        let outputExt: string;

        if (isLogoOrIcon) {
          // Logos e ícones mantêm transparência caindo para PNG se WebP não for suportado
          outputMime = supportsWebP ? 'image/webp' : 'image/png';
          outputExt  = supportsWebP ? 'webp' : 'png';
        } else {
          // Avatares e assets gerais caem para JPEG se WebP não for suportado
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
