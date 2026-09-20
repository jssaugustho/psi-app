import { Section, Component } from '../types';

/**
 * Sanitiza uma string para se tornar um identificador de âncora URI válido (HTML ID / URL fragment).
 * Converte para minúsculas, remove acentos e substitui caracteres especiais e espaços por hífens.
 * Ex: "Sobre Mim! & Contato" -> "sobre-mim-contato"
 */
export function sanitizeUriSlug(val: string): string {
  if (!val) return '';
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-') // Substitui caracteres inválidos por hífens
    .replace(/-+/g, '-') // Subsitui múltiplos hífens consecutivos por um único
    .replace(/^-+|-+$/g, ''); // Remove hífens no início/fim
}

/**
 * Retorna o nome amigável de exibição de uma seção.
 * Se a seção possuir label customizada, utiliza a label.
 * Caso contrário, deduz o nome padrão com base no tipo e conteúdo dos componentes contidos nela.
 */
export function getSectionDisplayName(section: Section, index: number): string {
  if (section.label && section.label.trim()) {
    return section.label.trim();
  }

  // Função auxiliar recursiva para procurar componentes
  const findComponentType = (comps: Component[], typeName: string): Component | undefined => {
    for (const c of comps) {
      if (c.type === typeName) return c;
      if ('components' in c && Array.isArray((c as any).components)) {
        const nested = findComponentType((c as any).components, typeName);
        if (nested) return nested;
      }
    }
    return undefined;
  };

  const findFirstHeadingText = (comps: Component[]): string | undefined => {
    for (const c of comps) {
      if (c.type === 'heading' && (c as any).props?.text) {
        return (c as any).props.text;
      }
      if ('components' in c && Array.isArray((c as any).components)) {
        const text = findFirstHeadingText((c as any).components);
        if (text) return text;
      }
    }
    return undefined;
  };

  const comps = section.components || [];

  // Tenta obter o texto do primeiro Título (H1/H2)
  const headingText = findFirstHeadingText(comps);
  if (headingText && headingText.trim()) {
    const clean = headingText.trim();
    return clean.length > 25 ? `${clean.slice(0, 25)}...` : clean;
  }

  // Checagens por tipo de componente decorativo
  if (findComponentType(comps, 'navbar_links')) return 'Cabeçalho / Navegação';
  if (findComponentType(comps, 'social_links')) return 'Rodapé / Footer';
  if (findComponentType(comps, 'faq_item')) return 'Perguntas Frequentes (FAQ)';
  if (findComponentType(comps, 'testimonial')) return 'Depoimentos & Avaliações';
  if (findComponentType(comps, 'stat_counter')) return 'Estatísticas & Números';
  if (findComponentType(comps, 'card')) return 'Recursos / Cards';
  if (findComponentType(comps, 'video')) return 'Vídeo em Destaque';

  return `Seção ${index + 1}`;
}
