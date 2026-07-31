/**
 * Otimizador de imagem client-side usando Canvas do HTML5.
 * Reduz a resolução da imagem para no máximo 1200px (largura ou altura)
 * e comprime em JPEG/PNG com qualidade de 80% antes do upload para economizar banda.
 */
export async function optimizeImageBeforeUpload(
  file: File,
  type: 'avatar' | 'logo' | 'icon'
): Promise<File> {
  // Se for SVG, não redimensiona no canvas para manter o formato vetorial
  if (file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Definir limites de tamanho para o pré-redimensionamento do frontend.
        // O redimensionamento final e conversão para WebP ocorrem na API dedicada.
        let maxWidth = 1200;
        let maxHeight = 1200;

        if (type === 'icon') {
          maxWidth = 256;
          maxHeight = 256;
        }

        let width = img.width;
        let height = img.height;

        // Calcular novas proporções mantendo o aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // Fallback para o arquivo original caso o canvas falhe
        }

        // Desenhar a imagem redimensionada no canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Detectar o formato mais adequado para preservar transparência ou compressão
        const outputMimeType = file.type === 'image/png' || file.type === 'image/gif' 
          ? 'image/png' 
          : 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            // Criar um novo arquivo a partir do Blob gerado pelo canvas
            const optimizedFile = new File([blob], file.name, {
              type: outputMimeType,
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          outputMimeType,
          0.80 // Qualidade de compressão a 80% para economizar banda
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
