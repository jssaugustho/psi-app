import React from 'react';
import { Component, DivComponent, Section, AtomicComponent, CarouselComponent, CanvasData, ViewportMode, ComponentEffect } from '../types';
import { getThemeColors, getThemeTypography, getTextFallbackColor } from './colorHelpers';
import { getPositionStyles } from './positionHelpers';

export interface BuildComponentCssParams {
  component: any;
  viewportMode?: ViewportMode;
  isHovered?: boolean;
  page?: any;
  canvasData?: CanvasData | null;
  componentCategory?: 'heading' | 'paragraph' | 'label' | 'button' | 'div' | 'section' | 'carousel' | 'general';
}

function extractGradientStops(str: string): { type: 'linear' | 'radial'; angle: number; stops: string[] } | null {
  if (!str || typeof str !== 'string' || (!str.includes('gradient') && !str.includes('var(--brand-gradient'))) return null;
  const isRadial = str.includes('radial');
  let angle = 135;
  const angleMatch = str.match(/(\d+)deg/);
  if (angleMatch) angle = parseInt(angleMatch[1], 10);

  const colorMatches = str.match(/#(?:[0-9a-fA-F]{3,8})|rgba?\([^)]+\)|transparent/g);
  if (!colorMatches || colorMatches.length === 0) return null;

  return {
    type: isRadial ? 'radial' : 'linear',
    angle,
    stops: colorMatches,
  };
}

function resolveBorderColor(color?: string): string | undefined {
  if (!color || color === 'transparent') return undefined;
  if (color.includes('gradient')) {
    const stops = extractGradientStops(color)?.stops;
    return stops && stops.length > 0 ? stops[0] : 'var(--brand-contrast-color, #4F46E5)';
  }
  return color;
}

export function buildComponentCssStyle({
  component,
  viewportMode = 'desktop',
  isHovered = false,
  page,
  canvasData,
  componentCategory = 'general',
}: BuildComponentCssParams): React.CSSProperties {
  if (!component) return {};

  const isMobile = viewportMode === 'mobile';

  // Extract base style containers
  const rawStyle = component.style || {};
  const rawLayout = component.layout || {};
  const rawBorder = component.border || {};
  const rawProps = component.props || {};
  const rawBackground = component.background || {};

  // Merge Mobile Overrides cleanly
  const style = isMobile ? { ...rawStyle, ...(component.mobile?.style || {}) } : rawStyle;
  const layout = isMobile ? { ...rawLayout, ...(component.mobile?.layout || {}) } : rawLayout;
  const border = isMobile ? { ...rawBorder, ...(component.mobile?.border || {}) } : rawBorder;
  const props = isMobile ? { ...rawProps, ...(component.mobile?.props || {}) } : rawProps;
  const bg = isMobile ? { ...rawBackground, ...(component.mobile?.background || {}) } : rawBackground;

  const result: React.CSSProperties = {};

  // 1. POSITIONING & LAYOUT
  const posStyle = getPositionStyles(layout, component.mobile, isMobile, true, false);
  Object.assign(result, posStyle);

  // Dimensions
  if (style.width || layout.width) result.width = style.width || layout.width;
  if (style.height || layout.height) {
    const h = style.height || layout.height;
    result.height = h === 'stretch' || h === '100%' ? '100%' : h;
  }
  if (style.minWidth || layout.minWidth) result.minWidth = style.minWidth || layout.minWidth;
  if (style.maxWidth || layout.maxWidth) result.maxWidth = style.maxWidth || layout.maxWidth;
  if (style.minHeight || layout.minHeight) result.minHeight = style.minHeight || layout.minHeight;
  if (style.maxHeight || layout.maxHeight) result.maxHeight = style.maxHeight || layout.maxHeight;

  // Flexbox Alignment
  if (style.display || layout.display) result.display = (style.display || layout.display) as any;
  if (layout.flexDirection) result.flexDirection = layout.flexDirection as any;
  if (layout.flexWrap) result.flexWrap = layout.flexWrap as any;
  if ((style.alignSelf && style.alignSelf !== 'auto') || (layout.alignSelf && layout.alignSelf !== 'auto')) {
    result.alignSelf = (style.alignSelf || layout.alignSelf) as any;
  }
  if (layout.justifyContent) result.justifyContent = layout.justifyContent as any;
  if (style.gap || layout.gap) result.gap = style.gap || layout.gap;

  // 2. SPACING (MARGIN & PADDING)
  if (style.marginTop || layout.marginTop) result.marginTop = style.marginTop || layout.marginTop;
  if (style.marginBottom || layout.marginBottom) result.marginBottom = style.marginBottom || layout.marginBottom;

  if (style.marginRight || layout.marginRight) result.marginRight = style.marginRight || layout.marginRight;
  if (style.marginLeft || layout.marginLeft) result.marginLeft = style.marginLeft || layout.marginLeft;

  const padTop = style.paddingTop || layout.paddingTop || props.paddingY;
  const padRight = style.paddingRight || layout.paddingRight || props.paddingX;
  const padBottom = style.paddingBottom || layout.paddingBottom || props.paddingY;
  const padLeft = style.paddingLeft || layout.paddingLeft || props.paddingX;

  if (padTop !== undefined) result.paddingTop = padTop;
  if (padRight !== undefined) result.paddingRight = padRight;
  if (padBottom !== undefined) result.paddingBottom = padBottom;
  if (padLeft !== undefined) result.paddingLeft = padLeft;

  // 3. BACKGROUND & MEDIA
  if (isHovered && style.hoverBackgroundColor) {
    result.background = style.hoverBackgroundColor;
  } else if (bg.type === 'none') {
    result.background = 'transparent';
    result.backgroundImage = 'none';
  } else if (bg.type === 'image' && bg.imageUrl) {
    result.backgroundImage = `linear-gradient(${bg.imageOverlayColor || 'transparent'}, ${bg.imageOverlayColor || 'transparent'}), url(${bg.imageUrl})`;
    result.backgroundSize = bg.imageSize || 'cover';
    if (bg.imagePosition) {
      result.backgroundPosition = bg.imagePosition;
    }
  } else {
    const rawVal = bg.gradientString || bg.color || style.backgroundColor || style.background;
    if (rawVal) {
      result.background = rawVal;
    } else if (bg.type === 'color' || bg.type === 'gradient') {
      result.background = 'transparent';
    }
  }

  if (result.background && typeof result.background === 'string') {
    delete result.backgroundColor;
  }

  const backdropBlur = bg.backdropBlur || style.backdropBlur;
  if (backdropBlur && backdropBlur !== '0px') {
    result.backdropFilter = `blur(${backdropBlur})`;
    result.WebkitBackdropFilter = `blur(${backdropBlur})`;
  } else if (backdropBlur === '0px') {
    result.backdropFilter = 'none';
    result.WebkitBackdropFilter = 'none';
  }

  // 4. BORDERS & RADIUS
  const rawHoverStyle = isHovered ? {
    borderStyle: style.hoverBorderStyle,
    borderWidth: style.hoverBorderWidth,
    borderColor: style.hoverBorderColor,
    borderRadius: style.hoverBorderRadius,
  } : {};

  const explicitBorderStyle = rawHoverStyle.borderStyle !== undefined ? rawHoverStyle.borderStyle : style.borderStyle;
  
  let borderStyle: string | undefined = explicitBorderStyle;
  if (!borderStyle) {
    const containerBorderStyle = border.borderStyle || border.style;
    if (containerBorderStyle && containerBorderStyle !== 'none') {
      borderStyle = containerBorderStyle;
    }
  }

  const borderWidth = rawHoverStyle.borderWidth || style.borderWidth || border.borderWidth || border.width;
  const borderColor = rawHoverStyle.borderColor || style.borderColor || border.borderColor || border.color;
  const borderRadius = rawHoverStyle.borderRadius || style.borderRadius || border.borderRadius || border.radiusTopLeft;

  const effectiveBorderStyle = borderStyle || ((borderWidth || borderColor) ? 'solid' : undefined);
  const effectiveBorderWidth = borderWidth || (effectiveBorderStyle && effectiveBorderStyle !== 'none' ? '1px' : undefined);
  const effectiveBorderColor = borderColor || (effectiveBorderStyle && effectiveBorderStyle !== 'none' ? 'var(--surface-border, #E2E8F0)' : undefined);

  if (effectiveBorderStyle && effectiveBorderStyle !== 'none') {
    result.borderStyle = effectiveBorderStyle as any;
    if (effectiveBorderWidth) {
      result.borderWidth = typeof effectiveBorderWidth === 'number' ? `${effectiveBorderWidth}px` : effectiveBorderWidth;
    }
    const finalBorderColor = resolveBorderColor(effectiveBorderColor);
    if (finalBorderColor) {
      result.borderColor = finalBorderColor;
    }
  }
  const rTopLeft = border.radiusTopLeft || style.borderTopLeftRadius || style.radiusTopLeft;
  const rTopRight = border.radiusTopRight || style.borderTopRightRadius || style.radiusTopRight;
  const rBottomRight = border.radiusBottomRight || style.borderBottomRightRadius || style.radiusBottomRight;
  const rBottomLeft = border.radiusBottomLeft || style.borderBottomLeftRadius || style.radiusBottomLeft;

  if (rTopLeft || rTopRight || rBottomRight || rBottomLeft) {
    if (rTopLeft) result.borderTopLeftRadius = typeof rTopLeft === 'number' ? `${rTopLeft}px` : rTopLeft;
    if (rTopRight) result.borderTopRightRadius = typeof rTopRight === 'number' ? `${rTopRight}px` : rTopRight;
    if (rBottomRight) result.borderBottomRightRadius = typeof rBottomRight === 'number' ? `${rBottomRight}px` : rBottomRight;
    if (rBottomLeft) result.borderBottomLeftRadius = typeof rBottomLeft === 'number' ? `${rBottomLeft}px` : rBottomLeft;
  } else if (borderRadius) {
    result.borderRadius = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;
  }

  // Image / Aspect Ratio & Object Fit
  if (style.aspectRatio || props.aspectRatio) result.aspectRatio = style.aspectRatio || props.aspectRatio;
  if (style.objectFit || props.objectFit) result.objectFit = (style.objectFit || props.objectFit) as any;
  if (style.objectPosition || props.objectPosition) result.objectPosition = style.objectPosition || props.objectPosition;

  // Defaults
  result.boxSizing = 'border-box';
  if (componentCategory === 'heading' || componentCategory === 'paragraph' || componentCategory === 'label' || componentCategory === 'button') {
    result.wordBreak = 'break-word';
    result.overflowWrap = 'anywhere';
  }

  // 5. SHADOW & OPACITY & DYNAMIC EFFECTS STACK (ComponentEffect[])
  const activeEffects = Array.isArray(style.effects) ? style.effects.filter((e: ComponentEffect) => e && e.enabled !== false) : [];
  const shadowParts: string[] = [];
  const transformParts: string[] = [];
  const filterParts: string[] = [];

  if (activeEffects.length > 0) {
    activeEffects.forEach((eff: ComponentEffect) => {
      const p = eff.params || {};
      switch (eff.type) {
        case 'shadow': {
          const inset = p.inset ? 'inset ' : '';
          const ox = p.offsetX || 0;
          const oy = p.offsetY || 0;
          const bl = p.blur || 0;
          const sp = p.spread || 0;
          const col = p.color || 'rgba(0, 0, 0, 0.15)';
          shadowParts.push(`${inset}${ox}px ${oy}px ${bl}px ${sp}px ${col}`);
          break;
        }
        case 'scale': {
          const sx = p.scaleX !== undefined ? p.scaleX : 1;
          const sy = p.uniform !== false ? sx : (p.scaleY !== undefined ? p.scaleY : 1);
          if (sx !== 1 || sy !== 1) {
            if (sx === sy) transformParts.push(`scale(${sx})`);
            else transformParts.push(`scale(${sx}, ${sy})`);
          }
          break;
        }
        case 'translate': {
          const tx = typeof p.translateX === 'number' ? `${p.translateX}px` : (p.translateX || '0px');
          const ty = typeof p.translateY === 'number' ? `${p.translateY}px` : (p.translateY || '0px');
          if (tx !== '0px' || ty !== '0px') {
            transformParts.push(`translate(${tx}, ${ty})`);
          }
          break;
        }
        case 'rotate': {
          const ang = p.angle || 0;
          if (ang !== 0) {
            transformParts.push(`rotate(${ang}deg)`);
          }
          break;
        }
        case 'opacity': {
          if (p.opacity !== undefined) {
            const rawOp = p.opacity;
            result.opacity = rawOp > 1 ? rawOp / 100 : rawOp;
          }
          break;
        }
        case 'blur': {
          const r = p.blurRadius || 0;
          if (r > 0) {
            if (p.blurTarget === 'backdrop') {
              result.backdropFilter = `blur(${r}px)`;
              result.WebkitBackdropFilter = `blur(${r}px)`;
            } else {
              filterParts.push(`blur(${r}px)`);
            }
          }
          break;
        }
        case 'skew': {
          const kx = p.skewX || 0;
          const ky = p.skewY || 0;
          if (kx !== 0 || ky !== 0) {
            transformParts.push(`skew(${kx}deg, ${ky}deg)`);
          }
          break;
        }
      }
    });
  }

  // Box Shadow Legacy / Override
  const activeShadow = isHovered && style.hoverBoxShadow ? style.hoverBoxShadow : style.boxShadow;
  if (activeShadow) {
    shadowParts.push(activeShadow);
  }
  if (shadowParts.length > 0) {
    result.boxShadow = shadowParts.join(', ');
  }

  // Opacity Legacy
  const activeOpacity = isHovered && style.hoverOpacity !== undefined ? style.hoverOpacity : style.opacity;
  if (activeOpacity !== undefined && result.opacity === undefined) {
    result.opacity = activeOpacity;
  }

  // Filter Parts (Blur, Drop-Shadow)
  if (filterParts.length > 0) {
    result.filter = filterParts.join(' ');
  }

  // 6. TYPOGRAPHY & COLOR
  if (style.textAlign || layout.textAlign) result.textAlign = (style.textAlign || layout.textAlign) as any;
  if (style.fontFamily) result.fontFamily = `'${style.fontFamily}', sans-serif`;
  if (style.fontSize) result.fontSize = style.fontSize;
  if (style.fontWeight) result.fontWeight = style.fontWeight;
  if (style.lineHeight) result.lineHeight = style.lineHeight;
  if (style.letterSpacing) result.letterSpacing = style.letterSpacing;
  if (style.textTransform) result.textTransform = style.textTransform as any;

  const activeTextColor = isHovered && style.hoverColor ? style.hoverColor : style.color;

  if (activeTextColor) {
    const isGradient = typeof activeTextColor === 'string' && (activeTextColor.includes('gradient') || activeTextColor.includes('var(--brand-gradient'));
    if (isGradient) {
      result.color = 'transparent';
      result.background = activeTextColor;
      result.WebkitBackgroundClip = 'text';
      result.backgroundClip = 'text';
      (result as any).WebkitTextFillColor = 'transparent';
    } else {
      result.color = activeTextColor;
    }
  }

  // 7. CURSOR POINTER & HOVER OVERRIDES
  const activeCursor = isHovered && style.hoverCursor ? style.hoverCursor : (style.cursor || layout.cursor || props.cursor);
  if (activeCursor) {
    result.cursor = activeCursor as any;
  }

  // 8. TRANSITIONS & HOVER OVERRIDES
  const durationMs = style.transitionDurationMs !== undefined ? Number(style.transitionDurationMs) : 200;
  const timing = style.transitionTimingFunction || 'ease-in-out';

  result.transitionProperty = 'all, background-color, background, color, border-color, border-width, border-radius, box-shadow, opacity, transform, filter, cursor, --grad-c1, --grad-c2';
  result.transitionDuration = `${durationMs}ms`;
  result.transitionTimingFunction = timing;

  // Legacy transform fields (scale, rotate, translateX, translateY) if effects is not using transform
  const normScale = style.scale !== undefined && style.scale !== '' ? Number(style.scale) : 1;
  const normTx = style.translateX !== undefined && style.translateX !== '' ? Number(style.translateX) : 0;
  const normTy = style.translateY !== undefined && style.translateY !== '' ? Number(style.translateY) : 0;
  const normRot = style.rotate !== undefined && style.rotate !== '' ? Number(style.rotate) : 0;

  const effScale = style.hoverScale !== undefined && style.hoverScale !== '' ? Number(style.hoverScale) : normScale;
  const effTx = style.hoverTranslateX !== undefined && style.hoverTranslateX !== '' ? Number(style.hoverTranslateX) : normTx;
  const effTy = style.hoverTranslateY !== undefined && style.hoverTranslateY !== '' ? Number(style.hoverTranslateY) : normTy;
  const effRot = style.hoverRotate !== undefined && style.hoverRotate !== '' ? Number(style.hoverRotate) : normRot;

  const hasLegacyTransform = normScale !== 1 || normTx !== 0 || normTy !== 0 || normRot !== 0 ||
                             effScale !== 1 || effTx !== 0 || effTy !== 0 || effRot !== 0;

  if (hasLegacyTransform) {
    const activeScale = isHovered ? effScale : normScale;
    const activeTx = isHovered ? effTx : normTx;
    const activeTy = isHovered ? effTy : normTy;
    const activeRot = isHovered ? effRot : normRot;

    if (normScale !== 1 || effScale !== 1) {
      transformParts.push(`scale(${activeScale})`);
    }
    if (normTx !== 0 || effTx !== 0) {
      transformParts.push(`translateX(${typeof activeTx === 'number' ? `${activeTx}px` : activeTx})`);
    }
    if (normTy !== 0 || effTy !== 0) {
      transformParts.push(`translateY(${typeof activeTy === 'number' ? `${activeTy}px` : activeTy})`);
    }
    if (normRot !== 0 || effRot !== 0) {
      transformParts.push(`rotate(${typeof activeRot === 'number' ? `${activeRot}deg` : activeRot})`);
    }
  }

  if (transformParts.length > 0) {
    result.transform = transformParts.join(' ');
  }

  if (isHovered) {
    if (style.hoverBackgroundColor) result.background = style.hoverBackgroundColor;
    if (style.hoverColor) {
      const isHoverGrad = typeof style.hoverColor === 'string' && (style.hoverColor.includes('gradient') || style.hoverColor.includes('var(--brand-gradient'));
      if (!isHoverGrad) {
        result.color = style.hoverColor;
      }
    }
    if (style.hoverBorderColor) result.borderColor = style.hoverBorderColor;
    if (style.hoverBorderWidth) result.borderWidth = style.hoverBorderWidth;
    if (style.hoverBorderRadius) result.borderRadius = style.hoverBorderRadius;
    if (style.hoverBoxShadow) result.boxShadow = style.hoverBoxShadow;
    if (style.hoverOpacity !== undefined) result.opacity = style.hoverOpacity;
  }

  // Button components render background, padding, border, radius, shadow, opacity, and hover transforms
  // on their inner <button> element rather than the outer wrapper <div>, avoiding double box rendering.
  if (componentCategory === 'button') {
    delete result.paddingTop;
    delete result.paddingRight;
    delete result.paddingBottom;
    delete result.paddingLeft;
    delete result.background;
    delete result.backgroundImage;
    delete result.borderStyle;
    delete result.borderWidth;
    delete result.borderColor;
    delete result.borderRadius;
  }

  return result;
}
