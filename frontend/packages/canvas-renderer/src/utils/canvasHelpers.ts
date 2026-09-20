import { CanvasData, Section, Component, DivComponent, CarouselComponent, AtomicComponent, ComponentType, SelectionState } from '../types';
import { createDefaultSection, createDefaultDiv, createDefaultCarousel, createDefaultComponent } from '../constants';

/**
 * Utilitários imutáveis para manipulação do CanvasData (Blueprint v2)
 */

// ============================================================================
// VALIDADOR DE OPERAÇÕES NO CANVAS
// ============================================================================

export function validateCanvasOperation(
  elementType: ComponentType | 'section',
  parentType: 'canvas' | 'section' | 'div' | 'carousel'
): boolean {
  // 1. Seção só pode existir no canvas raiz
  if (elementType === 'section') {
    return parentType === 'canvas';
  }

  // 2. Divs e Componentes Atômicos/Carrossel podem existir em Seções, Divs ou Carrossel
  return parentType === 'section' || parentType === 'div' || parentType === 'carousel';
}

// ============================================================================
// AUXILIAR DE CLONAGEM DE ELEMENTOS (RECURSIVO COM NOVOS UUIDs)
// ============================================================================

export function cloneElementWithNewIds(element: Section | Component): Section | Component {
  const newId = crypto.randomUUID();

  if (element.type === 'section') {
    const sec = element as Section;
    return {
      ...sec,
      id: newId,
      label: `${sec.label || 'Seção'} (Cópia)`,
      components: sec.components.map((c) => cloneElementWithNewIds(c) as Component),
    };
  }

  if (element.type === 'carousel') {
    const car = element as CarouselComponent;
    return {
      ...car,
      id: newId,
      label: `${car.label || 'Galeria / Carrossel'} (Cópia)`,
      props: JSON.parse(JSON.stringify(car.props || {})),
      components: (car.components || []).map((c) => cloneElementWithNewIds(c) as DivComponent),
    };
  }

  if (element.type === 'div') {
    const div = element as DivComponent;
    return {
      ...div,
      id: newId,
      label: `${div.label || 'Container'} (Cópia)`,
      components: div.components.map((c) => cloneElementWithNewIds(c) as Component),
    };
  }

  const atomic = element as AtomicComponent;
  return {
    ...atomic,
    id: newId,
    label: atomic.label ? `${atomic.label} (Cópia)` : undefined,
    props: JSON.parse(JSON.stringify(atomic.props || {})),
    style: JSON.parse(JSON.stringify(atomic.style || {})),
  };
}

// ============================================================================
// MANIPULAÇÃO DE SEÇÕES
// ============================================================================

export function addSection(canvas: CanvasData, label?: string, index?: number): CanvasData {
  const newSection = createDefaultSection(label);
  const sections = [...canvas.sections];
  
  if (typeof index === 'number' && index >= 0 && index <= sections.length) {
    sections.splice(index, 0, newSection);
  } else {
    sections.push(newSection);
  }

  return { ...canvas, sections };
}

export function removeSection(canvas: CanvasData, sectionId: string): CanvasData {
  const sections = canvas.sections.filter((s) => s.id !== sectionId);
  return { ...canvas, sections };
}

export function moveSection(canvas: CanvasData, fromIndex: number, toIndex: number): CanvasData {
  if (fromIndex < 0 || fromIndex >= canvas.sections.length || toIndex < 0 || toIndex >= canvas.sections.length) {
    return canvas;
  }
  const sections = [...canvas.sections];
  const [removed] = sections.splice(fromIndex, 1);
  sections.splice(toIndex, 0, removed);
  return { ...canvas, sections };
}

export function updateSection(canvas: CanvasData, sectionId: string, patch: Partial<Section>): CanvasData {
  const sections = canvas.sections.map((sec) => {
    if (sec.id === sectionId) {
      return { ...sec, ...patch };
    }
    return sec;
  });
  return { ...canvas, sections };
}

// ============================================================================
// BUSCA E SELEÇÃO DE ELEMENTO ADJACENTE AO REMOVER/RECORTAR
// ============================================================================

export function findAdjacentElementAfterRemoval(
  canvas: CanvasData,
  elementId: string
): { id: string; type: SelectionState['type'] } | null {
  // 1. Verificação de Seção
  const secIdx = canvas.sections.findIndex((s) => s.id === elementId);
  if (secIdx !== -1) {
    if (secIdx > 0) {
      const prevSec = canvas.sections[secIdx - 1];
      return { id: prevSec.id, type: 'section' };
    } else if (canvas.sections.length > 1) {
      const nextSec = canvas.sections[1];
      return { id: nextSec.id, type: 'section' };
    }
    return null;
  }

  // 2. Verificação de Componentes (Atômico, Div, Carrossel)
  const found = findElementInCanvas(canvas, elementId);
  if (!found || !found.parent) return null;

  const parentComps = (found.parent as Section | DivComponent | CarouselComponent).components || [];
  const compIdx = parentComps.findIndex((c) => c.id === elementId);

  if (compIdx !== -1) {
    if (compIdx > 0) {
      const prevComp = parentComps[compIdx - 1];
      return { id: prevComp.id, type: prevComp.type as SelectionState['type'] };
    } else if (parentComps.length > 1) {
      const nextComp = parentComps[1];
      return { id: nextComp.id, type: nextComp.type as SelectionState['type'] };
    } else {
      // Nenhum outro irmão restante na mesma lista -> Seleciona o container/seção Pai
      const parentType = found.parent.type as SelectionState['type'];
      return { id: found.parent.id, type: parentType };
    }
  }

  return null;
}

// ============================================================================
// DUPLICAÇÃO E COLAGEM NO CANVAS
// ============================================================================

export function duplicateElementInCanvas(canvas: CanvasData, elementId: string): { canvas: CanvasData; newId: string | null; newType: SelectionState['type'] | null } {
  let newElementId: string | null = null;
  let newElementType: SelectionState['type'] | null = null;

  // 1. Duplicação de Seção
  const secIndex = canvas.sections.findIndex((s) => s.id === elementId);
  if (secIndex !== -1) {
    const original = canvas.sections[secIndex];
    const cloned = cloneElementWithNewIds(original) as Section;
    newElementId = cloned.id;
    newElementType = 'section';
    const sections = [...canvas.sections];
    sections.splice(secIndex + 1, 0, cloned);
    return { canvas: { ...canvas, sections }, newId: newElementId, newType: newElementType };
  }

  // 2. Duplicação de Componente (recursiva em qualquer nível de div/carrossel)
  const duplicateInComponents = (components: Component[]): { updated: Component[]; found: boolean } => {
    const compIdx = components.findIndex((c) => c.id === elementId);
    if (compIdx !== -1) {
      const original = components[compIdx];
      const cloned = cloneElementWithNewIds(original) as Component;
      newElementId = cloned.id;
      newElementType = cloned.type as SelectionState['type'];
      const newComps = [...components];
      newComps.splice(compIdx + 1, 0, cloned);
      return { updated: newComps, found: true };
    }

    let foundInChild = false;
    const updated = components.map((comp) => {
      if (!foundInChild && (comp.type === 'div' || comp.type === 'carousel')) {
        const containerComp = comp as DivComponent | CarouselComponent;
        const res = duplicateInComponents(containerComp.components);
        if (res.found) {
          foundInChild = true;
          return { ...containerComp, components: res.updated as any };
        }
      }
      return comp;
    });

    return { updated, found: foundInChild };
  };

  const sections = canvas.sections.map((sec) => {
    const res = duplicateInComponents(sec.components);
    if (res.found) {
      return { ...sec, components: res.updated };
    }
    return sec;
  });

  return { canvas: { ...canvas, sections }, newId: newElementId, newType: newElementType };
}

// ============================================================================
// MANIPULAÇÃO DE COMPONENTES (SEÇÃO, DIV E CARROSSEL RECURSIVO)
// ============================================================================

export function addComponentToParent(
  canvas: CanvasData,
  parentId: string,
  component: Component,
  targetIndex?: number
): CanvasData {
  const addToComponents = (
    components: Component[],
    currentParentId: string
  ): { updatedComponents: Component[]; added: boolean } => {
    let added = false;
    const result = components.map((comp) => {
      if (comp.id === currentParentId && (comp.type === 'div' || comp.type === 'carousel')) {
        if (!validateCanvasOperation(component.type, comp.type as any)) return comp;
        const containerComp = comp as DivComponent | CarouselComponent;
        const subComponents = [...containerComp.components];

        if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= subComponents.length) {
          subComponents.splice(targetIndex, 0, component as any);
        } else {
          subComponents.push(component as any);
        }

        added = true;
        return { ...containerComp, components: subComponents };
      }

      if (comp.type === 'div' || comp.type === 'carousel') {
        const containerComp = comp as DivComponent | CarouselComponent;
        const subResult = addToComponents(containerComp.components, currentParentId);
        if (subResult.added) {
          added = true;
          return { ...containerComp, components: subResult.updatedComponents as any };
        }
      }

      return comp;
    });

    return { updatedComponents: result, added };
  };

  const sections = canvas.sections.map((sec) => {
    // Caso 1: O pai é a própria Seção
    if (sec.id === parentId) {
      if (!validateCanvasOperation(component.type, 'section')) return sec;

      const components = [...sec.components];
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= components.length) {
        components.splice(targetIndex, 0, component);
      } else {
        components.push(component);
      }
      return { ...sec, components };
    }

    // Caso 2: O pai é um Container/Carrossel dentro da Seção
    const subResult = addToComponents(sec.components, parentId);
    if (subResult.added) {
      return { ...sec, components: subResult.updatedComponents };
    }

    return sec;
  });

  return { ...canvas, sections };
}

export function removeComponentFromCanvas(canvas: CanvasData, componentId: string): CanvasData {
  const removeInComponents = (components: Component[]): Component[] => {
    const filtered = components.filter((c) => c.id !== componentId);
    return filtered.map((comp) => {
      if (comp.type === 'div' || comp.type === 'carousel') {
        const containerComp = comp as DivComponent | CarouselComponent;
        return { ...containerComp, components: removeInComponents(containerComp.components) as any };
      }
      return comp;
    });
  };

  const sections = canvas.sections.map((sec) => {
    return { ...sec, components: removeInComponents(sec.components) };
  });

  return { ...canvas, sections };
}

export function moveElementInCanvas(
  canvas: CanvasData,
  elementId: string,
  targetParentId: string,
  targetIndex?: number
): CanvasData {
  const found = findElementInCanvas(canvas, elementId);
  if (!found) return canvas;

  if (found.element.type === 'section') {
    return canvas;
  }

  // Remove o componente de onde ele está atualmente
  const canvasWithoutElement = removeComponentFromCanvas(canvas, elementId);

  // Adiciona o componente no seu novo container / seção pai
  return addComponentToParent(canvasWithoutElement, targetParentId, found.element as Component, targetIndex);
}

export function addComponentBeforeOrAfter(
  canvas: CanvasData,
  targetElementId: string,
  component: Component,
  position: 'before' | 'after'
): CanvasData {
  const target = findElementInCanvas(canvas, targetElementId);
  if (!target || !target.parent) return canvas;

  const targetIndex = target.parent.components.findIndex((c) => c.id === targetElementId);
  if (targetIndex === -1) return canvas;

  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
  return addComponentToParent(canvas, target.parent.id, component, insertIndex);
}

export function moveElementBeforeOrAfter(
  canvas: CanvasData,
  elementId: string,
  targetElementId: string,
  position: 'before' | 'after'
): CanvasData {
  if (elementId === targetElementId) return canvas;

  const source = findElementInCanvas(canvas, elementId);
  const target = findElementInCanvas(canvas, targetElementId);

  if (!source || !target) return canvas;

  // Se forem duas seções
  if (source.element.type === 'section' && target.element.type === 'section') {
    const fromIndex = canvas.sections.findIndex((s) => s.id === elementId);
    const targetIdx = canvas.sections.findIndex((s) => s.id === targetElementId);
    if (fromIndex === -1 || targetIdx === -1) return canvas;
    let toIndex = position === 'before' ? targetIdx : targetIdx + 1;
    if (fromIndex < toIndex) {
      toIndex -= 1;
    }
    return moveSection(canvas, fromIndex, toIndex);
  }

  if (!target.parent) return canvas;

  const targetParentId = target.parent.id;
  const componentsInTargetParent = target.parent.components;
  const targetIndex = componentsInTargetParent.findIndex((c) => c.id === targetElementId);

  if (targetIndex === -1) return canvas;

  const isSameParent = source.parent?.id === targetParentId;
  const sourceIndex = isSameParent
    ? componentsInTargetParent.findIndex((c) => c.id === elementId)
    : -1;

  let insertIndex = position === 'before' ? targetIndex : targetIndex + 1;

  if (isSameParent && sourceIndex !== -1) {
    if (sourceIndex < insertIndex) {
      insertIndex -= 1;
    }
  }

  return moveElementInCanvas(canvas, elementId, targetParentId, insertIndex);
}

export function updateComponentInCanvas(
  canvas: CanvasData,
  componentId: string,
  patch: Partial<Component>
): CanvasData {
  const updateInComponents = (components: Component[]): Component[] => {
    return components.map((comp) => {
      if (comp.id === componentId) {
        return { ...comp, ...patch } as Component;
      }

      if (comp.type === 'div' || comp.type === 'carousel') {
        const containerComp = comp as DivComponent | CarouselComponent;
        return { ...containerComp, components: updateInComponents(containerComp.components) as any };
      }

      return comp;
    });
  };

  const sections = canvas.sections.map((sec) => {
    return { ...sec, components: updateInComponents(sec.components) };
  });

  return { ...canvas, sections };
}

// ============================================================================
// BUSCA RECURSIVA E AUXILIARES DE ELEMENTOS
// ============================================================================

export interface FoundElement {
  element: Section | Component;
  parent: Section | DivComponent | CarouselComponent | null;
  parentType: 'canvas' | 'section' | 'div' | 'carousel';
}

export function findElementInCanvas(canvas: CanvasData, elementId: string): FoundElement | null {
  for (const sec of canvas.sections) {
    if (sec.id === elementId) {
      return { element: sec, parent: null, parentType: 'canvas' };
    }

    const searchComponents = (
      components: Component[],
      currentParent: Section | DivComponent | CarouselComponent,
      currentParentType: 'section' | 'div' | 'carousel'
    ): FoundElement | null => {
      for (const comp of components) {
        if (comp.id === elementId) {
          return { element: comp, parent: currentParent, parentType: currentParentType };
        }

        if (comp.type === 'div' || comp.type === 'carousel') {
          const containerComp = comp as DivComponent | CarouselComponent;
          const found = searchComponents(containerComp.components, containerComp, comp.type);
          if (found) return found;
        }
      }
      return null;
    };

    const result = searchComponents(sec.components, sec, 'section');
    if (result) return result;
  }

  return null;
}

// ============================================================================
// COLAGEM EXCLUSIVA DE ESTILOS CSS ENTRE ELEMENTOS DO MESMO TIPO
// ============================================================================

export function pasteStyleToElementInCanvas(
  canvas: CanvasData,
  targetId: string,
  sourceElement: Section | Component
): CanvasData {
  const found = findElementInCanvas(canvas, targetId);
  if (!found) return canvas;

  const target = found.element;

  // Garante que a colagem de estilo ocorra apenas entre elementos do mesmo tipo
  if (target.type !== sourceElement.type) {
    return canvas;
  }

  // 1. Caso seja uma Seção
  if (target.type === 'section') {
    const sourceSec = sourceElement as Section;
    return updateSection(canvas, targetId, {
      layout: sourceSec.layout ? JSON.parse(JSON.stringify(sourceSec.layout)) : undefined,
      background: sourceSec.background ? JSON.parse(JSON.stringify(sourceSec.background)) : undefined,
      border: sourceSec.border ? JSON.parse(JSON.stringify(sourceSec.border)) : undefined,
      mobile: sourceSec.mobile ? JSON.parse(JSON.stringify(sourceSec.mobile)) : target.mobile,
    });
  }

  // 2. Caso seja um Container Div ou Carrossel
  if (target.type === 'div' || target.type === 'carousel') {
    const sourceDiv = sourceElement as DivComponent | CarouselComponent;
    return updateComponentInCanvas(canvas, targetId, {
      layout: sourceDiv.layout ? JSON.parse(JSON.stringify(sourceDiv.layout)) : undefined,
      background: sourceDiv.background ? JSON.parse(JSON.stringify(sourceDiv.background)) : undefined,
      border: sourceDiv.border ? JSON.parse(JSON.stringify(sourceDiv.border)) : undefined,
      mobile: sourceDiv.mobile ? JSON.parse(JSON.stringify(sourceDiv.mobile)) : (target as DivComponent).mobile,
      props: sourceDiv.props ? JSON.parse(JSON.stringify(sourceDiv.props)) : undefined,
    });
  }

  // 3. Caso seja um Componente Atômico
  const sourceAtomic = sourceElement as AtomicComponent;
  const targetAtomic = target as AtomicComponent;

  // Chaves de propriedades que representam CONTEÚDO textual / mídia (devem ser PRESERVADAS no elemento de destino)
  const CONTENT_PROP_KEYS = new Set([
    'text',
    'html',
    'label',
    'title',
    'body',
    'question',
    'answer',
    'value',
    'quote',
    'authorName',
    'authorTitle',
    'items',
    'links',
    'src',
    'url',
    'href',
    'videoUrl',
    'imageUrl',
    'anchorId',
    'id',
    'key',
  ]);

  // Copia todas as props visuais da origem, preservando as props de conteúdo do destino
  const copiedProps: Record<string, any> = { ...(targetAtomic.props || {}) };

  if (sourceAtomic.props) {
    Object.keys(sourceAtomic.props).forEach((key) => {
      if (!CONTENT_PROP_KEYS.has(key)) {
        copiedProps[key] = sourceAtomic.props[key];
      }
    });
  }

  const patchedStyle = sourceAtomic.style
    ? JSON.parse(JSON.stringify(sourceAtomic.style))
    : {};

  const patchedMobile = sourceAtomic.mobile
    ? JSON.parse(JSON.stringify(sourceAtomic.mobile))
    : targetAtomic.mobile;

  return updateComponentInCanvas(canvas, targetId, {
    style: patchedStyle,
    props: copiedProps,
    mobile: patchedMobile,
  });
}

/**
 * Retorna o rótulo legível do tipo do componente para ser exibido no editor e nas propriedades.
 */
export function getComponentTypeLabel(type: string): string {
  switch (type) {
    case 'section': return 'Seção';
    case 'div': return 'Container Div';
    case 'carousel': return 'Carrossel';
    case 'heading': return 'Título';
    case 'paragraph': return 'Parágrafo';
    case 'label': return 'Subtítulo';
    case 'list': return 'Lista';
    case 'image': return 'Imagem';
    case 'video': return 'Vídeo';
    case 'icon': return 'Ícone';
    case 'divider': return 'Separador';
    case 'button': return 'Botão CTA';
    case 'logo': return 'Logotipo';
    case 'avatar': return 'Avatar';
    case 'badge': return 'Badge';
    case 'testimonial': return 'Depoimento';
    case 'stat_counter': return 'Contador';
    case 'faq_item': return 'FAQ';
    case 'card': return 'Card';
    case 'spacer': return 'Espaçador';
    case 'navbar_links': return 'Menu Navegação';
    case 'social_links': return 'Redes Sociais';
    default: return type ? type.toUpperCase() : 'ELEMENTO';
  }
}

/**
 * Normaliza a árvore do Canvas (Blueprint v2.0).
 */
export function normalizeCanvasData(canvas: CanvasData): CanvasData {
  if (!canvas || !Array.isArray(canvas.sections)) return canvas;
  return canvas;
}

