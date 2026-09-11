import { CanvasData, Section, Component, DivComponent, AtomicComponent, ComponentType } from '../types';
import { createDefaultSection, createDefaultDiv, createDefaultComponent } from '../constants';

/**
 * Utilitários imutáveis para manipulação do CanvasData (Blueprint v2)
 */

// ============================================================================
// VALIDADOR DE OPERAÇÕES NO CANVAS
// ============================================================================

export function validateCanvasOperation(
  elementType: ComponentType | 'section',
  parentType: 'canvas' | 'section' | 'div'
): boolean {
  // 1. Seção só pode existir no canvas raiz
  if (elementType === 'section') {
    return parentType === 'canvas';
  }

  // 2. Divs e Componentes Atômicos podem existir em Seções ou dentro de Divs (recursivo)
  return parentType === 'section' || parentType === 'div';
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
// DUPLICAÇÃO E COLAGEM NO CANVAS
// ============================================================================

export function duplicateElementInCanvas(canvas: CanvasData, elementId: string): { canvas: CanvasData; newId: string | null } {
  let newElementId: string | null = null;

  // 1. Duplicação de Seção
  const secIndex = canvas.sections.findIndex((s) => s.id === elementId);
  if (secIndex !== -1) {
    const original = canvas.sections[secIndex];
    const cloned = cloneElementWithNewIds(original) as Section;
    newElementId = cloned.id;
    const sections = [...canvas.sections];
    sections.splice(secIndex + 1, 0, cloned);
    return { canvas: { ...canvas, sections }, newId: newElementId };
  }

  // 2. Duplicação de Componente (recursiva em qualquer nível de div)
  const duplicateInComponents = (components: Component[]): { updated: Component[]; found: boolean } => {
    const compIdx = components.findIndex((c) => c.id === elementId);
    if (compIdx !== -1) {
      const original = components[compIdx];
      const cloned = cloneElementWithNewIds(original) as Component;
      newElementId = cloned.id;
      const newComps = [...components];
      newComps.splice(compIdx + 1, 0, cloned);
      return { updated: newComps, found: true };
    }

    let foundInChild = false;
    const updated = components.map((comp) => {
      if (!foundInChild && comp.type === 'div') {
        const divComp = comp as DivComponent;
        const res = duplicateInComponents(divComp.components);
        if (res.found) {
          foundInChild = true;
          return { ...divComp, components: res.updated };
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

  return { canvas: { ...canvas, sections }, newId: newElementId };
}

// ============================================================================
// MANIPULAÇÃO DE COMPONENTES (SEÇÃO E DIV RECURSIVO)
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
      if (comp.id === currentParentId && comp.type === 'div') {
        if (!validateCanvasOperation(component.type, 'div')) return comp;
        const divComp = comp as DivComponent;
        const subComponents = [...divComp.components];

        if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= subComponents.length) {
          subComponents.splice(targetIndex, 0, component);
        } else {
          subComponents.push(component);
        }

        added = true;
        return { ...divComp, components: subComponents };
      }

      if (comp.type === 'div') {
        const divComp = comp as DivComponent;
        const subResult = addToComponents(divComp.components, currentParentId);
        if (subResult.added) {
          added = true;
          return { ...divComp, components: subResult.updatedComponents };
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

    // Caso 2: O pai é um Div (recursivo) dentro da Seção
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
      if (comp.type === 'div') {
        const divComp = comp as DivComponent;
        return { ...divComp, components: removeInComponents(divComp.components) };
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

      if (comp.type === 'div') {
        const divComp = comp as DivComponent;
        return { ...divComp, components: updateInComponents(divComp.components) };
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
  parent: Section | DivComponent | null;
  parentType: 'canvas' | 'section' | 'div';
}

export function findElementInCanvas(canvas: CanvasData, elementId: string): FoundElement | null {
  for (const sec of canvas.sections) {
    if (sec.id === elementId) {
      return { element: sec, parent: null, parentType: 'canvas' };
    }

    const searchComponents = (
      components: Component[],
      currentParent: Section | DivComponent,
      currentParentType: 'section' | 'div'
    ): FoundElement | null => {
      for (const comp of components) {
        if (comp.id === elementId) {
          return { element: comp, parent: currentParent, parentType: currentParentType };
        }

        if (comp.type === 'div') {
          const divComp = comp as DivComponent;
          const found = searchComponents(divComp.components, divComp, 'div');
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
