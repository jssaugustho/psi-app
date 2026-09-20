import { CanvasData, Section, Component, DivComponent, AtomicComponent, ComponentStyle } from '../types';

/**
 * Clean up a style object by removing default zeroes, undefined values, and redundant keys.
 */
function compactStyle(style?: ComponentStyle): ComponentStyle | undefined {
  if (!style) return undefined;

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null || value === '') continue;

    // Omite margens e paddings zerados padrão para economizar payload
    if (
      (key === 'marginTop' || key === 'marginBottom' ||
       key === 'paddingTop' || key === 'paddingRight' || key === 'paddingBottom' || key === 'paddingLeft') &&
      value === '0px'
    ) {
      continue;
    }

    // Omite hoverEffect se houver propriedades granulares de hover
    if (key === 'hoverEffect' && (style.hoverScale || style.hoverTranslateY || style.hoverBackgroundColor)) {
      continue;
    }

    result[key] = value;
  }

  return Object.keys(result).length > 0 ? (result as ComponentStyle) : undefined;
}

/**
 * Purifica componente individual (Div, Carrossel ou Atômico)
 */
function compactComponent(comp: Component): Component {
  if (comp.type === 'div') {
    const div = comp as DivComponent;
    const cleanedDiv: DivComponent = {
      id: div.id,
      type: 'div',
      ...(div.label ? { label: div.label } : {}),
      ...(div.locked ? { locked: div.locked } : {}),
      ...(div.hidden ? { hidden: div.hidden } : {}),
      layout: { ...div.layout },
      components: div.components ? div.components.map(compactComponent) : [],
      props: {},
    };

    // Remove duplicações do layout do div que estejam no style
    if (div.style) {
      const styleCopy = { ...div.style };
      delete styleCopy.width;
      delete styleCopy.height;
      delete styleCopy.minHeight;
      delete styleCopy.maxHeight;
      delete styleCopy.paddingTop;
      delete styleCopy.paddingRight;
      delete styleCopy.paddingBottom;
      delete styleCopy.paddingLeft;

      const compacted = compactStyle(styleCopy);
      if (compacted) cleanedDiv.style = compacted;
    }

    if (div.background && div.background.type !== 'none') {
      cleanedDiv.background = div.background;
    }

    if (div.border) {
      const b = div.border;
      cleanedDiv.border = {
        ...(b.borderWidth || b.width ? { borderWidth: b.borderWidth || b.width } : {}),
        ...(b.borderColor || b.color ? { borderColor: b.borderColor || b.color } : {}),
        ...(b.borderStyle || b.style ? { borderStyle: b.borderStyle || b.style } : {}),
        ...(b.borderRadius ? { borderRadius: b.borderRadius } : {}),
        ...(b.radiusTopLeft ? { radiusTopLeft: b.radiusTopLeft } : {}),
        ...(b.radiusTopRight ? { radiusTopRight: b.radiusTopRight } : {}),
        ...(b.radiusBottomRight ? { radiusBottomRight: b.radiusBottomRight } : {}),
        ...(b.radiusBottomLeft ? { radiusBottomLeft: b.radiusBottomLeft } : {}),
      };
    }

    if (div.mobile) {
      cleanedDiv.mobile = div.mobile;
    }

    return cleanedDiv;
  }

  if (comp.type === 'carousel') {
    const car = comp as any;
    return {
      ...car,
      components: car.components ? car.components.map(compactComponent) : [],
    };
  }

  // Componente atômico
  const atomic = comp as AtomicComponent;
  const cleanedStyle = compactStyle(atomic.style) || {};

  // Limpa props removendo undefined e chaves vazias
  const cleanedProps: Record<string, any> = {};
  if (atomic.props) {
    for (const [k, v] of Object.entries(atomic.props)) {
      if (v !== undefined && v !== null) {
        cleanedProps[k] = v;
      }
    }
  }

  return {
    id: atomic.id,
    type: atomic.type,
    ...(atomic.label ? { label: atomic.label } : {}),
    ...(atomic.locked ? { locked: atomic.locked } : {}),
    ...(atomic.hidden ? { hidden: atomic.hidden } : {}),
    props: cleanedProps,
    style: cleanedStyle,
    ...(atomic.mobile ? { mobile: atomic.mobile } : {}),
  };
}

/**
 * Sanitiza o schema CanvasData v2.0 completo eliminando chaves redundantes e nulas.
 */
export function compactCanvasData(canvas: CanvasData): CanvasData {
  if (!canvas) return canvas;

  const sections = (canvas.sections || []).map((sec: Section) => {
    const cleanedSec: Section = {
      id: sec.id,
      type: 'section',
      ...(sec.label ? { label: sec.label } : {}),
      ...(sec.locked ? { locked: sec.locked } : {}),
      ...(sec.hidden ? { hidden: sec.hidden } : {}),
      layout: { ...sec.layout },
      background: { ...sec.background },
      components: sec.components ? sec.components.map(compactComponent) : [],
    };

    if (sec.border) {
      cleanedSec.border = sec.border;
    }
    if (sec.effects) {
      cleanedSec.effects = sec.effects;
    }
    if (sec.mobile) {
      cleanedSec.mobile = sec.mobile;
    }

    return cleanedSec;
  });

  const cleanedGlobalStyles: any = {};
  if (canvas.globalStyles?.typography && Object.keys(canvas.globalStyles.typography).length > 0) {
    cleanedGlobalStyles.typography = canvas.globalStyles.typography;
  }

  return {
    version: '2.0',
    ...(Object.keys(cleanedGlobalStyles).length > 0 ? { globalStyles: cleanedGlobalStyles } : {}),
    ...(canvas.navbar ? { navbar: canvas.navbar } : {}),
    sections,
  };
}
