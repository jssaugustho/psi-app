'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AtomicComponent, ViewportMode } from '../types';
import { Trash2, Sparkles, Check, ChevronDown, User, GripVertical, Video, Star, Quote } from 'lucide-react';
import { BrandLogo } from '@psi/ui';
import { getLucideIcon } from '../PropertiesPanel/components/IconPicker';
import { createDefaultDiv, createDefaultCarousel, createDefaultComponent } from '../constants';
import { getThemeColors, getThemeTypography, getThemeButtonDefaults, getTextFallbackColor, getLuminance, getComponentHoverClasses, getComponentTransitionAndHoverStyle } from '../utils/colorHelpers';
import { getComponentTypeLabel } from '../utils/canvasHelpers';
import { NavbarLinksWrapper } from './NavbarLinksWrapper';
import { SocialLinksWrapper, useParallaxEffect } from '@psi/canvas-renderer';

interface AtomicComponentWrapperProps {
  component: AtomicComponent;
  isSelected: boolean;
  viewportMode?: ViewportMode;
  onSelect: (id: string, type: any) => void;
  onRemove: (id: string) => void;
  onUpdateComponent?: (id: string, patch: Partial<AtomicComponent>) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onContextMenu?: (e: React.MouseEvent, id: string, type: string) => void;
  page?: any;
  isPublicView?: boolean;
}

function AnimatedCounterDisplay({
  targetValueStr,
  enableAnimation = true,
  startVal = 0,
  durationMs = 2000,
  isSelected,
  onBlur,
  onKeyDown,
  className,
  style,
}: {
  targetValueStr: string;
  enableAnimation?: boolean;
  startVal?: number;
  durationMs?: number;
  isSelected: boolean;
  onBlur: (e: React.FocusEvent<HTMLSpanElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLSpanElement>) => void;
  className: string;
  style: React.CSSProperties;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState<string>(targetValueStr || '+500');

  useEffect(() => {
    if (isSelected || enableAnimation === false) {
      setDisplayValue(targetValueStr || '+500');
      return;
    }

    const rawStr = targetValueStr || '0';
    const match = rawStr.match(/^([^0-9\.]*)([0-9\.]+)(.*)$/);
    if (!match) {
      setDisplayValue(rawStr);
      return;
    }

    const prefix = match[1] || '';
    const numStr = match[2];
    const suffix = match[3] || '';
    const targetNum = parseFloat(numStr);

    if (isNaN(targetNum)) {
      setDisplayValue(rawStr);
      return;
    }

    const isZeroPadded = numStr.length > 1 && numStr.startsWith('0');
    const targetDecimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;

    let animated = false;
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animated) {
            animated = true;
            let startTime: number | null = null;

            const step = (timestamp: number) => {
              if (!startTime) startTime = timestamp;
              const progress = Math.min((timestamp - startTime) / durationMs, 1);
              const easeOut = 1 - Math.pow(1 - progress, 3);
              const currentNum = startVal + (targetNum - startVal) * easeOut;

              let formattedNum: string;
              if (targetDecimals > 0) {
                formattedNum = currentNum.toFixed(targetDecimals);
              } else {
                const intVal = Math.round(currentNum);
                formattedNum = isZeroPadded
                  ? String(intVal).padStart(numStr.length, '0')
                  : String(intVal);
              }

              setDisplayValue(`${prefix}${formattedNum}${suffix}`);

              if (progress < 1) {
                requestAnimationFrame(step);
              } else {
                setDisplayValue(rawStr);
              }
            };

            requestAnimationFrame(step);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [targetValueStr, enableAnimation, startVal, durationMs, isSelected]);

  return (
    <span
      ref={containerRef}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={className}
      style={style}
    >
      {isSelected ? (targetValueStr || '+500') : displayValue}
    </span>
  );
}

interface InlineEditableTextProps {
  tagName?: any;
  html?: string;
  text?: string;
  placeholder?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  onChange: (patch: { html: string; text: string }) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export function InlineEditableText({
  tagName: TagName = 'div',
  html,
  text,
  placeholder = '',
  isSelected = false,
  onSelect,
  onChange,
  onKeyDown,
  className = '',
  style = {},
}: InlineEditableTextProps) {
  const ref = React.useRef<HTMLElement>(null);
  const isEditingRef = React.useRef(false);
  const targetContent = html || (text !== undefined ? text : placeholder);

  // Avoid invalid HTML nesting (e.g. <p><p>...</p></p> or <span><p>...</p></span>)
  // which causes browser HTML parser to auto-close parent elements and fail SSR hydration.
  const hasBlockTagsInHtml =
    typeof targetContent === 'string' &&
    /<\/?(p|div|h[1-6]|ul|ol|li|blockquote|section|article)\b/i.test(targetContent);

  const Tag =
    (TagName === 'p' || TagName === 'span' || (typeof TagName === 'string' && TagName.startsWith('h'))) &&
    hasBlockTagsInHtml
      ? 'div'
      : TagName;

  useIsomorphicLayoutEffect(() => {
    if (
      ref.current &&
      !isEditingRef.current &&
      typeof document !== 'undefined' &&
      document.activeElement !== ref.current
    ) {
      if (ref.current.innerHTML !== targetContent) {
        ref.current.innerHTML = targetContent;
      }
    }
  }, [targetContent, isSelected]);

  return (
    <Tag
      ref={ref}
      contentEditable={true}
      suppressContentEditableWarning
      onMouseDown={() => {
        isEditingRef.current = true;
      }}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        isEditingRef.current = true;
        if (onSelect) onSelect();
      }}
      onFocus={() => {
        isEditingRef.current = true;
        if (onSelect) onSelect();
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        isEditingRef.current = false;
        if (ref.current) {
          onChange({
            html: ref.current.innerHTML,
            text: ref.current.innerText,
          });
        }
      }}
      onInput={(e: React.FormEvent<HTMLElement>) => {
        isEditingRef.current = true;
        if (ref.current) {
          onChange({
            html: e.currentTarget.innerHTML,
            text: e.currentTarget.innerText,
          });
        }
      }}
      onKeyDown={onKeyDown}
      className={`cursor-text ${className}`}
      style={{
        cursor: 'text',
        ...style,
      }}
    />
  );
}

export function AtomicComponentWrapper({
  component,
  isSelected,
  viewportMode = 'desktop',
  onSelect,
  onRemove,
  onUpdateComponent,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onContextMenu,
  page,
  isPublicView = false,
}: AtomicComponentWrapperProps) {
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [isSelfHovered, setIsSelfHovered] = useState(false);
  const isStylingHovered = isSelfHovered || (isSelected && !!(component.style as any)?.__isPreviewingHover);
  const isMobile = viewportMode === 'mobile';
  const props = component.props || {};
  const style = component.style || {};

  const effectiveStyle = isMobile
    ? { ...style, ...(component.mobile?.style || {}) }
    : style;
  const effectiveProps = isMobile
    ? { ...props, ...(component.mobile?.props || {}) }
    : props;

  const isMobileHidden = isMobile
    ? (component.mobile?.hidden ?? component.hidden ?? false)
    : (component.hidden ?? false);

  const { primaryStart, primaryEnd, contrast, siteBg } = getThemeColors(page);

  const parallax = useParallaxEffect({
    speed: effectiveStyle.parallaxSpeed || 0,
    disableMobile: !!effectiveStyle.disableParallaxMobile,
    isMobile,
    isEditorMode: !isPublicView,
  });
  const themeTypo = getThemeTypography(page);

  const getTypographyStyle = (
    defaultCategory: 'heading' | 'body' | 'links' | 'buttons' = 'body',
    headingLevel: number = 1,
    prefix: string = ''
  ) => {
    const customPreset = prefix
      ? effectiveProps[`${prefix}TypoPreset`]
      : (effectiveProps.typoPreset || (effectiveStyle as any)?.typoPreset);

    let levelConfig = themeTypo.levels.paragraph;
    let defaultFont = themeTypo.fontBody;

    const presetKey = (customPreset && customPreset !== 'auto') ? customPreset : null;
    const customPresets: any[] = page?.siteConfig?.theme?.customPresets || [];
    const matchedCustomPreset = customPresets.find((p: any) => p.id === presetKey);

    if (matchedCustomPreset) {
      const pPatch = matchedCustomPreset.patch || {};
      levelConfig = {
        fontFamily: pPatch.fontFamily,
        fontSize: pPatch.fontSize,
        fontWeight: pPatch.fontWeight,
        lineHeight: pPatch.lineHeight,
        letterSpacing: pPatch.letterSpacing,
        textTransform: pPatch.textTransform,
      } as any;
      if (pPatch.fontFamily) defaultFont = pPatch.fontFamily;
    } else if (presetKey === 'h1' || (!presetKey && defaultCategory === 'heading' && headingLevel === 1)) {
      defaultFont = themeTypo.fontHeading;
      levelConfig = themeTypo.levels.h1;
    } else if (presetKey === 'h2' || (!presetKey && defaultCategory === 'heading' && headingLevel === 2)) {
      defaultFont = themeTypo.fontHeading;
      levelConfig = themeTypo.levels.h2;
    } else if (presetKey === 'h3' || (!presetKey && defaultCategory === 'heading' && headingLevel === 3)) {
      defaultFont = themeTypo.fontHeading;
      levelConfig = themeTypo.levels.h3;
    } else if (presetKey === 'h4' || (!presetKey && defaultCategory === 'heading' && headingLevel === 4)) {
      defaultFont = themeTypo.fontHeading;
      levelConfig = themeTypo.levels.h4;
    } else if (presetKey === 'paragraph' || (!presetKey && defaultCategory === 'body')) {
      levelConfig = themeTypo.levels.paragraph;
    } else if (presetKey === 'buttons' || (!presetKey && defaultCategory === 'buttons')) {
      levelConfig = themeTypo.levels.buttons;
    } else if (presetKey === 'links' || (!presetKey && defaultCategory === 'links')) {
      levelConfig = themeTypo.levels.links;
    }

    const explicitFontFamily = prefix ? effectiveProps[`${prefix}FontFamily`] : (effectiveProps.fontFamily || matchedCustomPreset?.patch?.fontFamily);
    const explicitFontSize = prefix ? effectiveProps[`${prefix}FontSize`] : (effectiveProps.fontSize || matchedCustomPreset?.patch?.fontSize);
    const explicitFontWeight = prefix ? effectiveProps[`${prefix}FontWeight`] : (effectiveProps.fontWeight || matchedCustomPreset?.patch?.fontWeight);
    const explicitLineHeight = prefix ? effectiveProps[`${prefix}LineHeight`] : (effectiveProps.lineHeight || matchedCustomPreset?.patch?.lineHeight);
    const explicitLetterSpacing = prefix ? effectiveProps[`${prefix}LetterSpacing`] : (effectiveProps.letterSpacing || matchedCustomPreset?.patch?.letterSpacing);
    const explicitTextTransform = prefix ? effectiveProps[`${prefix}TextTransform`] : (effectiveProps.textTransform || matchedCustomPreset?.patch?.textTransform);
    const explicitColor = prefix ? effectiveProps[`${prefix}Color`] : (effectiveProps.color || (effectiveStyle.color !== 'var(--brand-contrast-color)' && effectiveStyle.color !== 'var(--brand-gradient-start)' ? effectiveStyle.color : undefined) || matchedCustomPreset?.patch?.color);
    const explicitTextAlign = prefix ? effectiveProps[`${prefix}TextAlign`] : (effectiveProps.textAlign || effectiveStyle.textAlign || matchedCustomPreset?.patch?.textAlign);

    const fontFamily = explicitFontFamily
      ? `'${explicitFontFamily}', sans-serif`
      : levelConfig.fontFamily
      ? `'${levelConfig.fontFamily}', sans-serif`
      : defaultFont
      ? `'${defaultFont}', sans-serif`
      : 'inherit';

    const resolvedCategory = presetKey || (defaultCategory === 'heading' ? `h${headingLevel}` : defaultCategory);
    const fallbackColor = getTextFallbackColor(siteBg, resolvedCategory);

    let rawColor = (isStylingHovered && effectiveStyle.hoverColor)
      ? effectiveStyle.hoverColor
      : (explicitColor || (!prefix ? effectiveStyle.color : undefined));

    let resolvedColorForCheck = rawColor;
    if (resolvedColorForCheck === 'var(--brand-contrast-color)') {
      resolvedColorForCheck = contrast;
    } else if (resolvedColorForCheck === 'var(--brand-gradient-start)') {
      resolvedColorForCheck = primaryStart;
    }

    if (!rawColor) {
      rawColor = fallbackColor;
    } else if (typeof resolvedColorForCheck === 'string' && !resolvedColorForCheck.includes('gradient')) {
      const siteBgIsLight = getLuminance(siteBg) > 160;
      const textLum = getLuminance(resolvedColorForCheck);
      if (siteBgIsLight && textLum > 160) {
        rawColor = fallbackColor;
      } else if (!siteBgIsLight && textLum <= 160) {
        rawColor = fallbackColor;
      }
    }

    const isGradient = rawColor && (rawColor.includes('gradient') || rawColor.includes('var(--brand-gradient'));

    return {
      fontFamily,
      fontSize: explicitFontSize || levelConfig.fontSize,
      fontWeight: explicitFontWeight || levelConfig.fontWeight,
      lineHeight: explicitLineHeight || levelConfig.lineHeight,
      letterSpacing: explicitLetterSpacing || levelConfig.letterSpacing,
      textTransform: (explicitTextTransform || levelConfig.textTransform) as any,
      color: isGradient ? 'transparent' : rawColor,
      background: isGradient ? rawColor : undefined,
      WebkitBackgroundClip: isGradient ? 'text' : undefined,
      backgroundClip: isGradient ? 'text' : undefined,
      textAlign: explicitTextAlign || levelConfig.textAlign || (!prefix ? effectiveStyle.textAlign : undefined),
      marginBottom: !prefix ? effectiveStyle.marginBottom : undefined,
    };
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, component.id, component.type);
    }
  };

  const handlePropsBatchUpdate = (patch: Record<string, any>) => {
    if (onUpdateComponent) {
      if (isMobile) {
        onUpdateComponent(component.id, {
          mobile: {
            ...(component.mobile || {}),
            props: {
              ...(component.mobile?.props || {}),
              ...patch,
            },
          },
        });
      } else {
        onUpdateComponent(component.id, {
          props: {
            ...props,
            ...patch,
          },
        });
      }
    }
  };

  const handlePropUpdate = (field: string, newValue: any) => {
    handlePropsBatchUpdate({ [field]: newValue });
  };

  const handleKeyDownSingleLine = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isVertical = rect.height >= rect.width;
    const pos = isVertical
      ? (e.clientY - rect.top < rect.height / 2 ? 'before' : 'after')
      : (e.clientX - rect.left < rect.width / 2 ? 'before' : 'after');
    setDropPosition(pos);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = dropPosition || 'after';
    setDropPosition(null);

    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);

      // CASO A: MOVER ELEMENTO EXISTENTE
      if (data.isExistingElement && data.elementId) {
        if (data.elementId === component.id) return;
        if (onMoveElementBeforeOrAfter) {
          onMoveElementBeforeOrAfter(data.elementId, component.id, pos);
        }
        return;
      }

      // CASO B: NOVO ELEMENTO DA SIDEBAR
      const { itemType, preset } = data;
      if (itemType === 'div') {
        const newDiv = createDefaultDiv('Container (Div)');
        if (preset === '2col') {
          const col1 = createDefaultDiv('Coluna 1');
          const col2 = createDefaultDiv('Coluna 2');
          col1.layout.flexBasis = '50%';
          col1.layout.width = '50%';
          col2.layout.flexBasis = '50%';
          col2.layout.width = '50%';
          newDiv.components = [col1, col2];
          newDiv.layout.flexDirection = 'row';
        } else if (preset === '3col') {
          const col1 = createDefaultDiv('Coluna 1');
          const col2 = createDefaultDiv('Coluna 2');
          const col3 = createDefaultDiv('Coluna 3');
          col1.layout.flexBasis = '33.33%';
          col1.layout.width = '33.33%';
          col2.layout.flexBasis = '33.33%';
          col2.layout.width = '33.33%';
          col3.layout.flexBasis = '33.33%';
          col3.layout.width = '33.33%';
          newDiv.components = [col1, col2, col3];
          newDiv.layout.flexDirection = 'row';
        }
        if (onAddComponentBeforeOrAfter) {
          onAddComponentBeforeOrAfter(component.id, newDiv, pos);
        }
      } else if (itemType === 'carousel') {
        const newCarousel = createDefaultCarousel('Galeria / Carrossel');
        if (onAddComponentBeforeOrAfter) {
          onAddComponentBeforeOrAfter(component.id, newCarousel, pos);
        }
      } else if (itemType) {
        const newComp = createDefaultComponent(itemType);
        if (onAddComponentBeforeOrAfter) {
          onAddComponentBeforeOrAfter(component.id, newComp, pos);
        }
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div
      ref={parallax.ref as any}
      onClick={(e) => {
        if (!isPublicView) {
          const sel = typeof window !== 'undefined' ? window.getSelection() : null;
          if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
            return;
          }
          e.stopPropagation();
          onSelect(component.id, component.type);
        }
      }}
      onContextMenu={!isPublicView ? handleContextMenu : undefined}
      onDragOver={!isPublicView ? handleDragOver : undefined}
      onDragLeave={!isPublicView ? handleDragLeave : undefined}
      onDrop={!isPublicView ? handleDrop : undefined}
      onMouseEnter={(e) => {
        if (!isPublicView) {
          e.stopPropagation();
          setIsSelfHovered(true);
        }
      }}
      onMouseLeave={(e) => {
        if (!isPublicView) {
          e.stopPropagation();
          setIsSelfHovered(false);
        }
      }}
      className={`relative transition-all duration-150 ${!isPublicView ? 'cursor-pointer' : ''} ${
        isMobileHidden ? 'opacity-40 outline-dashed outline-1 outline-amber-400' : ''
      } ${getComponentHoverClasses(effectiveStyle.hoverEffect || (effectiveProps as any)?.hoverEffect, component.type === 'button')}`}
      style={{
        ...parallax.style,
        textAlign: effectiveStyle.textAlign || 'inherit',
        marginTop: effectiveStyle.marginTop || '0px',
        marginBottom: effectiveStyle.marginBottom || '0px',
        paddingTop: effectiveStyle.paddingTop || '0px',
        paddingRight: effectiveStyle.paddingRight || '0px',
        paddingBottom: effectiveStyle.paddingBottom || '0px',
        paddingLeft: effectiveStyle.paddingLeft || '0px',
        display: (effectiveStyle.display as any) || (
          (effectiveStyle.width && effectiveStyle.width !== 'auto')
            ? 'block'
            : (['faq_item', 'card', 'testimonial', 'divider', 'video'].includes(component.type) ? 'block' : 'inline-block')
        ),
        width: (effectiveStyle.width && effectiveStyle.width !== 'auto')
          ? effectiveStyle.width
          : (['faq_item', 'card', 'testimonial', 'divider', 'video'].includes(component.type) ? '100%' : 'fit-content'),
        height: effectiveStyle.height || 'auto',
        minWidth: effectiveStyle.minWidth,
        maxWidth: effectiveStyle.maxWidth || '100%',
        minHeight: effectiveStyle.minHeight,
        ...getComponentTransitionAndHoverStyle(effectiveStyle, isStylingHovered),
      }}
    >
      {/* Borda Flutuante de Seleção / Hover no topo dos filhos (z-20) */}
      {!isPublicView && isSelected && (
        <div className="absolute inset-0 border-2 border-purple-600 pointer-events-none z-20 rounded-[inherit]" />
      )}
      {!isPublicView && isSelfHovered && !isSelected && (
        <div className="absolute inset-0 border border-blue-400/60 pointer-events-none z-20 rounded-[inherit]" />
      )}
      {/* Linha Indicadora de Inserção (Antes / Depois) */}
      {!isPublicView && dropPosition === 'before' && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-blue-500 rounded-full z-40 shadow-sm pointer-events-none" />
      )}
      {!isPublicView && dropPosition === 'after' && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-blue-500 rounded-full z-40 shadow-sm pointer-events-none" />
      )}
      {/* Botão de Arrastar / Mover Componente no Hover */}
      {!isPublicView && (
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            onSelect(component.id, component.type);
            e.dataTransfer.setData(
              'application/json',
              JSON.stringify({
                isExistingElement: true,
                elementId: component.id,
                elementType: component.type,
              })
            );
            e.dataTransfer.effectAllowed = 'move';
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(component.id, component.type);
          }}
          className={`absolute top-1 left-2 transition-opacity bg-blue-600 text-white p-1 rounded-md shadow-md z-30 cursor-grab active:cursor-grabbing flex items-center justify-center select-none ${
            isSelfHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          title="Arrastar componente para mover de lugar"
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}

      {/* Badge de Seleção Flutuante */}
      {!isPublicView && isSelected && (
        <div className="absolute top-1 right-2 flex items-center gap-1 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md z-30 select-none">
          <span>{getComponentTypeLabel(component.type)}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(component.id);
            }}
            className="hover:text-red-300 ml-1 cursor-pointer"
            title="Excluir Componente"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Render Visual Real com Suporte a Edição Inline de Texto */}
      <div
        className={`w-full ${effectiveStyle.height && effectiveStyle.height !== 'auto' ? 'h-full flex items-center justify-center' : ''}`}
        style={{ textAlign: effectiveStyle.textAlign || 'inherit' }}
      >
        {/* HEADING */}
        {component.type === 'heading' && (() => {
          const level = effectiveProps.level || 1;
          const typo = getTypographyStyle('heading', level);

          let renderedHtml = effectiveProps.html;
          const highlightWords = effectiveProps.highlightWords;
          const highlightColor = effectiveProps.highlightColor || primaryStart;

          if (!renderedHtml && effectiveProps.text && Array.isArray(highlightWords) && highlightWords.length > 0) {
            let tempText = effectiveProps.text;
            highlightWords.forEach((word: string) => {
              if (word && word.trim()) {
                const regex = new RegExp(`(${word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                tempText = tempText.replace(regex, `<span style="color: ${highlightColor}; font-weight: bold;">$1</span>`);
              }
            });
            renderedHtml = tempText;
          }

          return (
            <InlineEditableText
              tagName="div"
              html={renderedHtml}
              text={effectiveProps.text}
              placeholder="Digite seu título aqui"
              isSelected={isSelected}
              onChange={(patch) => {
                handlePropsBatchUpdate({
                  text: patch.text,
                  html: patch.html,
                });
              }}
              onKeyDown={handleKeyDownSingleLine}
              style={{
                fontSize: typo.fontSize,
                fontWeight: typo.fontWeight || 'bold',
                lineHeight: typo.lineHeight || '1.2',
                letterSpacing: typo.letterSpacing,
                textTransform: typo.textTransform,
                textAlign: typo.textAlign || 'left',
                color: typo.color,
                background: typo.background || (isSelfHovered && effectiveStyle.hoverBackgroundColor ? effectiveStyle.hoverBackgroundColor : effectiveStyle.backgroundColor),
                WebkitBackgroundClip: typo.WebkitBackgroundClip as any,
                backgroundClip: typo.backgroundClip as any,
                marginBottom: typo.marginBottom,
                fontFamily: typo.fontFamily,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: isSelfHovered && effectiveStyle.hoverBorderColor ? effectiveStyle.hoverBorderColor : effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius,
              }}
              className={`outline-none ${isSelected ? 'cursor-text' : ''}`}
            />
          );
        })()}

        {/* PARAGRAPH */}
        {component.type === 'paragraph' && (() => {
          const typo = getTypographyStyle('body');
          return (
            <InlineEditableText
              tagName="div"
              html={effectiveProps.html}
              text={effectiveProps.text}
              placeholder="<p>Escreva seu texto aqui com acolhimento...</p>"
              isSelected={isSelected}
              onSelect={() => onSelect(component.id, component.type)}
              onChange={(patch) => {
                handlePropsBatchUpdate({
                  html: patch.html,
                  text: patch.text,
                });
              }}
              style={{
                fontSize: typo.fontSize,
                fontWeight: typo.fontWeight,
                lineHeight: typo.lineHeight || '1.6',
                letterSpacing: typo.letterSpacing,
                textTransform: typo.textTransform,
                textAlign: typo.textAlign || 'left',
                color: typo.color,
                background: typo.background || (isSelfHovered && effectiveStyle.hoverBackgroundColor ? effectiveStyle.hoverBackgroundColor : effectiveStyle.backgroundColor),
                WebkitBackgroundClip: typo.WebkitBackgroundClip as any,
                backgroundClip: typo.backgroundClip as any,
                marginBottom: typo.marginBottom,
                fontFamily: typo.fontFamily,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: isSelfHovered && effectiveStyle.hoverBorderColor ? effectiveStyle.hoverBorderColor : effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius,
              }}
              className={`leading-relaxed outline-none ${isSelected ? 'cursor-text' : ''}`}
            />
          );
        })()}

        {/* LABEL */}
        {component.type === 'label' && (() => {
          const typo = getTypographyStyle('heading', 4);
          const defaultLabelColor = page?.siteConfig?.theme?.primaryStart || page?.theme?.primaryStart || 'var(--brand-gradient-start)';
          return (
            <InlineEditableText
              tagName="span"
              html={effectiveProps.html}
              text={effectiveProps.text}
              placeholder="SUBTÍTULO / ETIQUETA"
              isSelected={isSelected}
              onChange={(patch) => {
                handlePropsBatchUpdate({
                  text: patch.text,
                  html: patch.html,
                });
              }}
              onKeyDown={handleKeyDownSingleLine}
              style={{
                fontSize: typo.fontSize || '0.875rem',
                fontWeight: typo.fontWeight || '600',
                lineHeight: typo.lineHeight,
                letterSpacing: typo.letterSpacing || '0.05em',
                textTransform: typo.textTransform || 'uppercase',
                color: effectiveStyle.color ? typo.color : defaultLabelColor,
                background: typo.background || (isSelfHovered && effectiveStyle.hoverBackgroundColor ? effectiveStyle.hoverBackgroundColor : effectiveStyle.backgroundColor),
                WebkitBackgroundClip: typo.WebkitBackgroundClip as any,
                backgroundClip: typo.backgroundClip as any,
                marginBottom: typo.marginBottom,
                fontFamily: typo.fontFamily,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: isSelfHovered && effectiveStyle.hoverBorderColor ? effectiveStyle.hoverBorderColor : effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius,
              }}
              className={`tracking-wider block font-bold outline-none ${isSelected ? 'cursor-text' : ''}`}
            />
          );
        })()}

        {/* BUTTON */}
        {component.type === 'button' && (() => {
          const buttonDefaults = getThemeButtonDefaults(page, effectiveProps.templateId || effectiveProps.buttonTemplateId);
          const typo = getTypographyStyle('buttons');
          const legacyDefaultBg = 'linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))';
          const hasCustomBg = !!effectiveStyle.backgroundColor && effectiveStyle.backgroundColor !== legacyDefaultBg;
          const hasCustomColor =
            (!!effectiveStyle.color && effectiveStyle.color !== 'var(--brand-contrast-color)') ||
            !!effectiveProps.textColor ||
            !!effectiveProps.color;
          const isWidthSet = !!effectiveStyle.width && effectiveStyle.width !== 'auto';
          const isFullWidth = effectiveProps.fullWidth || isWidthSet;
          const isHeightSet = !!effectiveStyle.height && effectiveStyle.height !== 'auto';

          const buttonVariant = effectiveProps.variant || buttonDefaults.variant || 'primary';

          let computedBg = buttonDefaults.gradientString || 'linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))';
          let computedColor =
            effectiveStyle.color ||
            effectiveProps.textColor ||
            effectiveProps.color ||
            ((buttonDefaults.color && buttonDefaults.color !== '#000000' && buttonDefaults.color !== '#18181B') ? buttonDefaults.color : (contrast || 'var(--brand-contrast-color)'));
          let computedBorderColor = buttonDefaults.borderColor || 'transparent';

          if (hasCustomBg && effectiveStyle.backgroundColor) {
            computedBg = effectiveStyle.backgroundColor;
          } else if (buttonVariant === 'solid') {
            computedBg = buttonDefaults.backgroundColor || primaryStart;
          } else if (buttonVariant === 'glass') {
            computedBg = 'color-mix(in srgb, var(--brand-gradient-start) 20%, transparent)';
            computedBorderColor = 'color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)';
          } else if (buttonVariant === 'outline') {
            computedBg = 'transparent';
            if (!hasCustomColor) computedColor = 'var(--brand-gradient-start)';
            computedBorderColor = 'var(--brand-gradient-start)';
          } else if (buttonVariant === 'soft') {
            computedBg = 'color-mix(in srgb, var(--brand-gradient-start) 15%, transparent)';
            if (!hasCustomColor) computedColor = 'var(--brand-gradient-start)';
            computedBorderColor = 'transparent';
          }

          if (hasCustomColor) {
            computedColor =
              effectiveProps.textColor ||
              effectiveProps.color ||
              effectiveStyle.color ||
              typo.color;
          }

          // Rounded prop map
          let roundedRadius: string | undefined = undefined;
          if (effectiveProps.rounded === 'none') roundedRadius = '0px';
          if (effectiveProps.rounded === 'sm') roundedRadius = '4px';
          if (effectiveProps.rounded === 'md') roundedRadius = '8px';
          if (effectiveProps.rounded === 'lg') roundedRadius = '16px';
          if (effectiveProps.rounded === 'full') roundedRadius = '9999px';

          // Hover styles computation
          const hoverBg = effectiveStyle.hoverBackgroundColor || buttonDefaults.hoverBackgroundColor;
          const hoverColor = effectiveStyle.hoverColor || buttonDefaults.hoverColor;
          const hoverBorderColor = effectiveStyle.hoverBorderColor || buttonDefaults.hoverBorderColor;
          const hoverShadow = effectiveStyle.hoverBoxShadow || buttonDefaults.hoverBoxShadow;
          const hoverOpacity = effectiveStyle.hoverOpacity !== undefined ? effectiveStyle.hoverOpacity : buttonDefaults.hoverOpacity;
          const hoverScale = effectiveStyle.hoverScale !== undefined ? effectiveStyle.hoverScale : buttonDefaults.hoverScale;
          const hoverTranslateY = effectiveStyle.hoverTranslateY !== undefined ? effectiveStyle.hoverTranslateY : buttonDefaults.hoverTranslateY;

          const duration = effectiveStyle.transitionDurationMs !== undefined ? `${effectiveStyle.transitionDurationMs}ms` : `${buttonDefaults.transitionDurationMs || 200}ms`;
          const timing = effectiveStyle.transitionTimingFunction || buttonDefaults.transitionTimingFunction || 'ease-in-out';

          if (isSelfHovered) {
            if (hoverBg) computedBg = hoverBg;
            if (hoverColor) computedColor = hoverColor;
            if (hoverBorderColor) computedBorderColor = hoverBorderColor;
          }

          const btnTransforms: string[] = [];
          if (isSelfHovered) {
            if (hoverScale !== undefined && hoverScale !== 1) btnTransforms.push(`scale(${hoverScale})`);
            if (hoverTranslateY !== undefined && hoverTranslateY !== 0) {
              const ty = typeof hoverTranslateY === 'number' ? `${hoverTranslateY}px` : hoverTranslateY;
              btnTransforms.push(`translateY(${ty})`);
            }
          }

          const btnAlignVal = effectiveProps.contentAlign || effectiveProps.textAlign || typo.textAlign || 'center';
          let btnJustifyClass = 'justify-center text-center';
          if (btnAlignVal === 'left' || btnAlignVal === 'flex-start') btnJustifyClass = 'justify-start text-left';
          if (btnAlignVal === 'right' || btnAlignVal === 'flex-end') btnJustifyClass = 'justify-end text-right';

          const ButtonIconLeft = effectiveProps.iconLeft ? getLucideIcon(effectiveProps.iconLeft) : null;
          const ButtonIconRight = effectiveProps.iconRight ? getLucideIcon(effectiveProps.iconRight) : null;

          const btnPaddingX = (effectiveStyle.paddingLeft && effectiveStyle.paddingLeft !== '0px')
            ? effectiveStyle.paddingLeft
            : (buttonDefaults.paddingX || '24px');
          const btnPaddingY = (effectiveStyle.paddingTop && effectiveStyle.paddingTop !== '0px')
            ? effectiveStyle.paddingTop
            : (buttonDefaults.paddingY || '12px');

          return (
            <button
              type="button"
              className={`text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all ${btnJustifyClass} ${
                isFullWidth ? 'w-full' : ''
              } ${
                isHeightSet ? 'h-full' : ''
              }`}
              style={{
                paddingLeft: btnPaddingX,
                paddingRight: btnPaddingX,
                paddingTop: btnPaddingY,
                paddingBottom: btnPaddingY,
                width: isFullWidth ? '100%' : undefined,
                height: isHeightSet ? '100%' : undefined,
                fontSize: effectiveStyle.fontSize || effectiveProps.fontSize || typo.fontSize || buttonDefaults.fontSize,
                fontWeight: effectiveStyle.fontWeight || effectiveProps.fontWeight || typo.fontWeight || buttonDefaults.fontWeight,
                letterSpacing: effectiveStyle.letterSpacing || effectiveProps.letterSpacing || typo.letterSpacing || buttonDefaults.letterSpacing,
                textTransform: (effectiveStyle.textTransform || effectiveProps.textTransform || typo.textTransform || buttonDefaults.textTransform) as any,
                color: computedColor,
                fontFamily: effectiveStyle.fontFamily || effectiveProps.fontFamily || typo.fontFamily || buttonDefaults.fontFamily,
                marginBottom: typo.marginBottom,
                background: computedBg,
                borderStyle: effectiveStyle.borderStyle || buttonDefaults.borderStyle || (buttonVariant === 'outline' ? 'solid' : 'none'),
                borderWidth: effectiveStyle.borderWidth || buttonDefaults.borderWidth || (buttonVariant === 'outline' ? '1px' : '0px'),
                borderColor: effectiveStyle.borderColor || computedBorderColor,
                borderRadius: effectiveStyle.borderRadius || roundedRadius || buttonDefaults.borderRadius,
                boxShadow: isSelfHovered && hoverShadow ? hoverShadow : effectiveStyle.boxShadow,
                opacity: isSelfHovered && hoverOpacity !== undefined ? hoverOpacity : effectiveStyle.opacity,
                transform: btnTransforms.length > 0 ? btnTransforms.join(' ') : undefined,
                transition: `all ${duration} ${timing}`,
              }}
            >
              {ButtonIconLeft && <ButtonIconLeft className="w-4 h-4 pointer-events-none shrink-0" />}
              <InlineEditableText
                tagName="span"
                html={effectiveProps.html}
                text={effectiveProps.label || effectiveProps.text}
                placeholder="Agendar Consulta"
                isSelected={isSelected}
                onChange={(patch) => {
                  handlePropsBatchUpdate({
                    label: patch.text,
                    text: patch.text,
                    html: patch.html,
                  });
                }}
                onKeyDown={handleKeyDownSingleLine}
                className={`outline-none ${isSelected ? 'cursor-text' : ''}`}
              />
              {ButtonIconRight && <ButtonIconRight className="w-4 h-4 pointer-events-none shrink-0" />}
            </button>
          );
        })()}

        {/* ICON */}
        {component.type === 'icon' && (() => {
          const IconComp = getLucideIcon(effectiveProps.name);
          const iconSize = effectiveProps.size || 24;
          const strokeWidth = effectiveProps.strokeWidth || 2;
          const iconColor = effectiveStyle.color || 'currentColor';
          return (
            <div className="inline-flex items-center justify-center p-1">
              {IconComp && (
                <IconComp
                  size={iconSize}
                  strokeWidth={strokeWidth}
                  style={{ color: iconColor }}
                />
              )}
            </div>
          );
        })()}

        {/* BADGE */}
        {component.type === 'badge' && (() => {
          const typo = getTypographyStyle('body');
          const isWidthSet = !!effectiveStyle.width && effectiveStyle.width !== 'auto';
          const isHeightSet = !!effectiveStyle.height && effectiveStyle.height !== 'auto';
          const BadgeIconComp = getLucideIcon(effectiveProps.iconLeft !== undefined ? effectiveProps.iconLeft : 'Sparkles');
          const badgeColor = effectiveProps.color || (effectiveStyle.color && effectiveStyle.color !== 'var(--brand-contrast-color)' ? effectiveStyle.color : primaryStart);
          const badgeBg = effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 15%, transparent)`;
          const badgeRadius = effectiveStyle.borderRadius || (effectiveProps.rounded !== false ? '9999px' : '8px');

          const bdgAlignVal = effectiveProps.contentAlign || effectiveProps.textAlign || typo.textAlign || 'center';
          let bdgJustifyClass = 'justify-center text-center';
          if (bdgAlignVal === 'left' || bdgAlignVal === 'flex-start') bdgJustifyClass = 'justify-start text-left';
          if (bdgAlignVal === 'right' || bdgAlignVal === 'flex-end') bdgJustifyClass = 'justify-end text-right';

          return (
            <div
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 uppercase tracking-wide transition-all ${bdgJustifyClass} ${
                isWidthSet ? 'w-full' : ''
              } ${
                isHeightSet ? 'h-full' : ''
              }`}
              style={{
                width: isWidthSet ? '100%' : undefined,
                height: isHeightSet ? '100%' : undefined,
                fontSize: typo.fontSize,
                fontWeight: typo.fontWeight || 'bold',
                letterSpacing: typo.letterSpacing,
                textTransform: typo.textTransform,
                color: (effectiveProps.color || (effectiveProps.typoPreset && effectiveProps.typoPreset !== 'h4')) ? typo.color : badgeColor,
                fontFamily: typo.fontFamily,
                marginBottom: typo.marginBottom,
                background: badgeBg,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: effectiveStyle.borderColor,
                borderRadius: badgeRadius,
                boxShadow: effectiveStyle.boxShadow,
              }}
            >
              {BadgeIconComp && (
                <BadgeIconComp
                  className="pointer-events-none shrink-0"
                  style={{
                    width: '1.1em',
                    height: '1.1em',
                  }}
                />
              )}
              <InlineEditableText
                tagName="span"
                html={effectiveProps.html}
                text={effectiveProps.text}
                placeholder="Atendimento Online & Presencial"
                isSelected={isSelected}
                onChange={(patch) => handlePropUpdate('text', patch.text)}
                onKeyDown={handleKeyDownSingleLine}
                className="outline-none"
              />
            </div>
          );
        })()}

        {/* IMAGE */}
        {component.type === 'image' && (() => {
          const hasCustomRadius = !!effectiveStyle.borderRadius;
          const hasCustomBorder = effectiveStyle.borderStyle && effectiveStyle.borderStyle !== 'none';
          const imgContent = (
            <div
              className={`w-full overflow-hidden flex items-center justify-center pointer-events-none ${
                hasCustomRadius ? '' : ''
              } ${
                hasCustomBorder ? '' : 'glass-sm'
              }`}
              style={{
                aspectRatio: effectiveProps.aspectRatio || (effectiveStyle as any).aspectRatio || '16/9',
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius,
                boxShadow: effectiveStyle.boxShadow,
                background: effectiveStyle.backgroundColor,
              }}
            >
              {effectiveProps.src ? (
                <img
                  src={effectiveProps.src}
                  alt={effectiveProps.alt || ''}
                  loading={effectiveProps.lazyLoad !== false ? 'lazy' : 'eager'}
                  className="w-full h-full"
                  style={{
                    objectFit: (effectiveProps.objectFit || (effectiveStyle as any).objectFit || 'cover') as any,
                  }}
                />
              ) : (
                <div className="text-center p-6 space-y-2 text-slate-400">
                  <span className="text-xs font-semibold block">🖼 [Imagem R2]</span>
                  <span className="text-[10px] block">Clique para enviar foto na barra lateral</span>
                </div>
              )}
            </div>
          );

          if (effectiveProps.linkTo) {
            return (
              <a href={effectiveProps.linkTo} target="_blank" rel="noopener noreferrer" className="block w-full cursor-pointer">
                {imgContent}
              </a>
            );
          }
          return imgContent;
        })()}

        {/* VIDEO */}
        {component.type === 'video' && (() => {
          const src = effectiveProps.src || '';
          const embedType = effectiveProps.embedType || (src.includes('youtube') || src.includes('youtu.be') ? 'youtube' : src.includes('vimeo') ? 'vimeo' : 'upload');
          const isYoutube = embedType === 'youtube' || src.includes('youtube') || src.includes('youtu.be');
          const isVimeo = embedType === 'vimeo' || src.includes('vimeo');
          const aspectRatio = effectiveProps.aspectRatio || (effectiveStyle as any).aspectRatio || '16/9';

          let iframeSrc = src;
          if (isYoutube && src) {
            const ytMatch = src.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
            if (ytMatch && ytMatch[1]) {
              iframeSrc = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=${effectiveProps.autoplay ? 1 : 0}&mute=${effectiveProps.muted ? 1 : 0}&controls=${effectiveProps.controls !== false ? 1 : 0}`;
            }
          } else if (isVimeo && src) {
            const vmMatch = src.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
            if (vmMatch && vmMatch[1]) {
              iframeSrc = `https://player.vimeo.com/video/${vmMatch[1]}?autoplay=${effectiveProps.autoplay ? 1 : 0}&muted=${effectiveProps.muted ? 1 : 0}&controls=${effectiveProps.controls !== false ? 1 : 0}`;
            }
          }

          return (
            <div
              className="w-full overflow-hidden flex items-center justify-center rounded-xl border border-[var(--surface-border)] glass-sm"
              style={{
                aspectRatio,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius || '16px',
                boxShadow: effectiveStyle.boxShadow,
                background: effectiveStyle.backgroundColor || '#000000',
              }}
            >
              {src ? (
                (isYoutube || isVimeo) ? (
                  <iframe
                    src={iframeSrc}
                    className="w-full h-full border-0 pointer-events-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={src}
                    poster={effectiveProps.thumbnail}
                    controls={effectiveProps.controls !== false}
                    autoPlay={effectiveProps.autoplay}
                    muted={effectiveProps.muted}
                    loop={effectiveProps.loop}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                )
              ) : (
                <div className="text-center p-8 space-y-2 text-slate-400 flex flex-col items-center justify-center">
                  <Video className="w-8 h-8 text-blue-500 opacity-80 mb-1" />
                  <span className="text-xs font-bold text-slate-300 block">📹 Player de Vídeo</span>
                  <span className="text-[10px] block text-slate-400">Insira a URL do vídeo (YouTube, Vimeo ou MP4) na barra lateral</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* AVATAR */}
        {component.type === 'avatar' && (() => {
          const shape = effectiveProps.shape || 'circle';
          const avatarSize = typeof effectiveProps.size === 'number' ? `${effectiveProps.size}px` : (effectiveProps.size || '48px');
          let borderRadius = '9999px';
          if (shape === 'rounded') borderRadius = '12px';
          if (shape === 'square') borderRadius = '4px';
          if (effectiveStyle.borderRadius) borderRadius = effectiveStyle.borderRadius;

          const hasBorder = effectiveProps.hasBorder !== false;
          const borderColor = effectiveProps.borderColor || primaryStart;
          const hasShadow = effectiveProps.hasShadow !== false;

          return (
            <div
              className={`inline-flex items-center justify-center overflow-hidden pointer-events-none transition-all ${
                hasShadow ? 'shadow-md' : ''
              }`}
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius,
                borderWidth: hasBorder ? (effectiveStyle.borderWidth || '2px') : '0px',
                borderStyle: hasBorder ? (effectiveStyle.borderStyle || 'solid') : 'none',
                borderColor: hasBorder ? borderColor : 'transparent',
                background: effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 20%, transparent)`,
                boxShadow: effectiveStyle.boxShadow,
              }}
            >
              {effectiveProps.src ? (
                <img
                  src={effectiveProps.src}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User
                  className="w-1/2 h-1/2"
                  style={{ color: primaryStart }}
                />
              )}
            </div>
          );
        })()}

        {/* LIST */}
        {component.type === 'list' && (() => {
          const typo = getTypographyStyle('body');
          const listType = effectiveProps.listType || 'check';
          const listIconColor = effectiveProps.iconColor || primaryStart;
          const listGap = effectiveProps.gap || '8px';

          const renderBullet = (item: any, idx: number) => {
            const fontNum = parseFloat(typo.fontSize || '14px') || 14;
            const containerPx = Math.max(16, Math.round(fontNum * 1.3));
            const iconPx = Math.max(10, Math.round(fontNum * 0.75));
            const bulletPx = Math.max(4, Math.round(fontNum * 0.35));

            if (listType === 'number') {
              return (
                <span
                  className="rounded-full flex items-center justify-center shrink-0 font-extrabold pointer-events-none"
                  style={{
                    width: `${containerPx}px`,
                    height: `${containerPx}px`,
                    fontSize: `${Math.max(9, Math.round(fontNum * 0.7))}px`,
                    backgroundColor: `color-mix(in srgb, ${listIconColor} 15%, transparent)`,
                    color: listIconColor,
                    marginTop: `${Math.max(0, Math.round((fontNum - 14) * 0.15))}px`,
                  }}
                >
                  {idx + 1}
                </span>
              );
            }
            if (listType === 'bullet') {
              return (
                <span
                  className="rounded-full shrink-0 pointer-events-none"
                  style={{
                    width: `${bulletPx}px`,
                    height: `${bulletPx}px`,
                    backgroundColor: listIconColor,
                    marginTop: `${Math.max(2, Math.round(fontNum * 0.35))}px`,
                  }}
                />
              );
            }
            if (listType === 'icon') {
              const ItemIcon = getLucideIcon(item.iconName !== undefined ? item.iconName : 'Check');
              if (!ItemIcon) return null;
              return (
                <ItemIcon
                  size={iconPx + 2}
                  className="shrink-0 pointer-events-none"
                  style={{
                    color: listIconColor,
                    marginTop: `${Math.max(1, Math.round(fontNum * 0.15))}px`,
                  }}
                />
              );
            }
            // default: check
            const ItemIcon = getLucideIcon(item.iconName !== undefined ? item.iconName : 'Check');
            if (!ItemIcon) return null;
            return (
              <span
                className="rounded-full flex items-center justify-center shrink-0 font-bold pointer-events-none"
                style={{
                  width: `${containerPx}px`,
                  height: `${containerPx}px`,
                  backgroundColor: `color-mix(in srgb, ${listIconColor} 15%, transparent)`,
                  color: listIconColor,
                  marginTop: `${Math.max(0, Math.round((fontNum - 14) * 0.15))}px`,
                }}
              >
                <ItemIcon size={iconPx} />
              </span>
            );
          };

          return (
            <ul
              style={{
                fontFamily: typo.fontFamily,
                fontSize: typo.fontSize || '0.875rem',
                fontWeight: typo.fontWeight,
                lineHeight: typo.lineHeight || '1.5',
                letterSpacing: typo.letterSpacing,
                textTransform: typo.textTransform,
                color: typo.color,
                textAlign: typo.textAlign,
                marginBottom: typo.marginBottom,
                display: 'flex',
                flexDirection: 'column',
                gap: listGap,
              }}
            >
              {(effectiveProps.items || []).map((item: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2.5">
                  {renderBullet(item, idx)}
                  <InlineEditableText
                    tagName="span"
                    html={typeof item === 'object' ? item.html : undefined}
                    text={typeof item === 'object' ? item.text : item}
                    placeholder="Item da lista"
                    isSelected={isSelected}
                    onChange={(patch) => {
                      const newItems = [...(effectiveProps.items || [])];
                      newItems[idx] = typeof item === 'object'
                        ? { ...item, text: patch.text, html: patch.html }
                        : patch.text;
                      handlePropUpdate('items', newItems);
                    }}
                    className={`outline-none flex-1 ${isSelected ? 'cursor-text' : ''}`}
                  />
                </li>
              ))}
            </ul>
          );
        })()}

        {/* CARD */}
        {component.type === 'card' && (() => {
          const isWidthSet = !!effectiveStyle.width && effectiveStyle.width !== 'auto';
          const isHeightSet = !!effectiveStyle.height && effectiveStyle.height !== 'auto';
          const CardIconComp = getLucideIcon(effectiveProps.iconName !== undefined ? effectiveProps.iconName : 'HeartHandshake');
          const cardIconColor = effectiveProps.iconColor || primaryStart;

          const effectiveIconAlign = effectiveProps.iconAlign || effectiveStyle.textAlign || 'left';
          const iconMargin = effectiveIconAlign === 'center'
            ? '0 auto'
            : effectiveIconAlign === 'right'
            ? '0 0 0 auto'
            : '0 auto 0 0';

          const iconSizePx = typeof effectiveProps.iconSize === 'number' ? `${effectiveProps.iconSize}px` : (effectiveProps.iconSize || '20px');
          const iconMarginBottomPx = typeof effectiveProps.iconMarginBottom === 'number' ? `${effectiveProps.iconMarginBottom}px` : (effectiveProps.iconMarginBottom !== undefined ? `${effectiveProps.iconMarginBottom}px` : '8px');
          const titleMarginBottomPx = typeof effectiveProps.titleMarginBottom === 'number' ? `${effectiveProps.titleMarginBottom}px` : (effectiveProps.titleMarginBottom !== undefined ? `${effectiveProps.titleMarginBottom}px` : '8px');
          const iconBgColor = effectiveProps.iconBgColor || `color-mix(in srgb, ${cardIconColor} 12%, transparent)`;
          const iconBorderRadius = effectiveProps.iconBorderRadius || '12px';

          const titleTypo = getTypographyStyle('heading', 4, 'title');
          const bodyTypo = getTypographyStyle('body', 1, 'body');

          const imagePos = effectiveProps.imagePosition || 'top';
          const hasCoverImage = !!effectiveProps.imageUrl && (imagePos === 'top' || imagePos === 'left' || imagePos === 'right');

          let cardFlexClass = 'flex-col';
          if (imagePos === 'left') cardFlexClass = 'flex-col md:flex-row';
          if (imagePos === 'right') cardFlexClass = 'flex-col md:flex-row-reverse';

          return (
            <div
              className={`flex overflow-hidden transition-all ${cardFlexClass} ${
                isWidthSet ? 'w-full' : ''
              } ${
                isHeightSet ? 'h-full' : ''
              }`}
              style={{
                width: isWidthSet ? '100%' : undefined,
                height: isHeightSet ? '100%' : undefined,
                background: effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 4%, ${siteBg})`,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius || '16px',
                boxShadow: effectiveStyle.boxShadow,
              }}
            >
              {hasCoverImage && (
                <div className={`${imagePos === 'top' ? 'w-full h-40' : 'w-full md:w-2/5 h-40 md:h-auto'} shrink-0 overflow-hidden`}>
                  <img
                    src={effectiveProps.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div
                className="p-5 flex-1 flex"
                style={{
                  flexDirection: effectiveProps.flexDirection || (effectiveStyle as any).flexDirection || 'column',
                  justifyContent: effectiveProps.justifyContent || (effectiveStyle as any).justifyContent || 'center',
                  alignItems: effectiveProps.alignItems || (effectiveStyle as any).alignItems,
                  textAlign: effectiveProps.textAlign || effectiveStyle.textAlign,
                  gap: typeof effectiveProps.gap === 'number' ? `${effectiveProps.gap}px` : (effectiveProps.gap || (effectiveStyle as any).gap),
                }}
              >
                {!hasCoverImage && (
                  <div
                    className="p-2 w-fit pointer-events-none overflow-hidden flex items-center justify-center"
                    style={{
                      background: iconBgColor,
                      color: cardIconColor,
                      borderRadius: iconBorderRadius,
                      margin: iconMargin,
                      marginBottom: iconMarginBottomPx,
                    }}
                  >
                    {effectiveProps.imageUrl ? (
                      <img src={effectiveProps.imageUrl} alt="" style={{ width: iconSizePx, height: iconSizePx, objectFit: 'contain' }} />
                    ) : CardIconComp ? (
                      <CardIconComp style={{ width: iconSizePx, height: iconSizePx }} />
                    ) : null}
                  </div>
                )}
                <InlineEditableText
                  tagName="h4"
                  html={effectiveProps.titleHtml}
                  text={effectiveProps.title}
                  placeholder="Título do Card"
                  isSelected={isSelected}
                  onChange={(patch) => handlePropUpdate('title', patch.text)}
                  onKeyDown={handleKeyDownSingleLine}
                  className={`outline-none ${isSelected ? 'cursor-text' : ''}`}
                  style={{
                    ...titleTypo,
                    marginBottom: titleMarginBottomPx,
                  }}
                />
                <InlineEditableText
                  tagName="p"
                  html={effectiveProps.bodyHtml}
                  text={effectiveProps.body}
                  placeholder="Descrição do cartão informativo para o visitante..."
                  isSelected={isSelected}
                  onChange={(patch) => handlePropUpdate('body', patch.text)}
                  className={`leading-relaxed outline-none opacity-80 ${isSelected ? 'cursor-text' : ''}`}
                  style={bodyTypo}
                />
              </div>
            </div>
          );
        })()}

        {/* FAQ ITEM */}
        {component.type === 'faq_item' && (() => {
          const isHeightSet = !!effectiveStyle.height && effectiveStyle.height !== 'auto';
          const questionTypo = getTypographyStyle('heading', 4, 'question');
          const answerTypo = getTypographyStyle('body', 1, 'answer');

          return (
            <div
              className={`w-full p-4 space-y-2 transition-all ${
                isHeightSet ? 'h-full' : ''
              }`}
              style={{
                width: '100%',
                height: isHeightSet ? '100%' : undefined,
                background: effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 3%, ${siteBg})`,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius,
                boxShadow: effectiveStyle.boxShadow,
              }}
            >
              <div className="flex items-center justify-between">
                <InlineEditableText
                  tagName="span"
                  html={effectiveProps.questionHtml}
                  text={effectiveProps.question}
                  placeholder="Como funciona a primeira sessão?"
                  isSelected={isSelected}
                  onChange={(patch) => handlePropUpdate('question', patch.text)}
                  onKeyDown={handleKeyDownSingleLine}
                  className={`outline-none ${isSelected ? 'cursor-text' : ''}`}
                  style={questionTypo}
                />
                <ChevronDown className="w-4 h-4 opacity-60 pointer-events-none shrink-0" style={{ color: (questionTypo.color !== 'transparent' && questionTypo.color) || contrast }} />
              </div>
              <InlineEditableText
                tagName="p"
                html={effectiveProps.answerHtml}
                text={effectiveProps.answer}
                placeholder="Na primeira sessão realizamos uma escuta acolhedora..."
                isSelected={isSelected}
                onChange={(patch) => handlePropUpdate('answer', patch.text)}
                className={`leading-relaxed outline-none opacity-75 ${isSelected ? 'cursor-text' : ''}`}
                style={answerTypo}
              />
            </div>
          );
        })()}

        {/* TESTIMONIAL */}
        {component.type === 'testimonial' && (() => {
          const quoteTypo = getTypographyStyle('body', 1, 'quote');
          const authorNameTypo = getTypographyStyle('heading', 4, 'authorName');
          const authorTitleTypo = getTypographyStyle('body', 1, 'authorTitle');
          const ratingNum = typeof effectiveProps.rating === 'number' ? effectiveProps.rating : 5;
          const showQuoteIcon = effectiveProps.showQuoteIcon !== false;

          return (
            <div
              className="p-5 space-y-3 border border-[var(--surface-border)] rounded-2xl relative"
              style={{
                background: effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 4%, ${siteBg})`,
              }}
            >
              {showQuoteIcon && (
                <Quote className="w-6 h-6 text-[var(--brand-gradient-start)] opacity-30 absolute top-4 right-4 pointer-events-none" />
              )}
              {ratingNum > 0 && (
                <div className="flex items-center gap-1 text-amber-400 pointer-events-none">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < ratingNum ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}`}
                    />
                  ))}
                </div>
              )}
              <InlineEditableText
                tagName="p"
                html={effectiveProps.quoteHtml}
                text={effectiveProps.quote}
                placeholder="A terapia mudou minha visão de mundo..."
                isSelected={isSelected}
                onChange={(patch) => handlePropUpdate('quote', patch.text)}
                className={`italic outline-none opacity-90 ${
                  isSelected ? 'cursor-text' : ''
                }`}
                style={quoteTypo}
              />
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs pointer-events-none overflow-hidden shrink-0"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${primaryStart} 20%, transparent)`,
                    color: primaryStart,
                  }}
                >
                  {effectiveProps.authorAvatar ? (
                    <img src={effectiveProps.authorAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <InlineEditableText
                    tagName="span"
                    html={effectiveProps.authorNameHtml}
                    text={effectiveProps.authorName}
                    placeholder="M. S."
                    isSelected={isSelected}
                    onChange={(patch) => handlePropUpdate('authorName', patch.text)}
                    onKeyDown={handleKeyDownSingleLine}
                    className={`block outline-none ${
                      isSelected ? 'cursor-text' : ''
                    }`}
                    style={authorNameTypo}
                  />
                  <InlineEditableText
                    tagName="span"
                    html={effectiveProps.authorTitleHtml}
                    text={effectiveProps.authorTitle}
                    placeholder="Paciente"
                    isSelected={isSelected}
                    onChange={(patch) => handlePropUpdate('authorTitle', patch.text)}
                    onKeyDown={handleKeyDownSingleLine}
                    className={`block outline-none opacity-70 ${
                      isSelected ? 'cursor-text' : ''
                    }`}
                    style={authorTitleTypo}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* STAT COUNTER */}
        {component.type === 'stat_counter' && (() => {
          const StatIconComp = effectiveProps.iconName ? getLucideIcon(effectiveProps.iconName) : null;
          const statIconColor = effectiveProps.iconColor || primaryStart;
          const valueTypo = getTypographyStyle('heading', 1, 'value');
          const labelTypo = getTypographyStyle('body', 1, 'label');

          return (
            <div className="text-center p-4 space-y-1">
              {StatIconComp && (
                <div className="flex justify-center mb-1 pointer-events-none">
                  <StatIconComp size={24} style={{ color: statIconColor }} />
                </div>
              )}
              <AnimatedCounterDisplay
                targetValueStr={effectiveProps.value || '+500'}
                enableAnimation={effectiveProps.enableAnimation !== false}
                startVal={effectiveProps.startValue ?? 0}
                durationMs={effectiveProps.animationDuration || 2000}
                isSelected={isSelected}
                onBlur={(e) => handlePropUpdate('value', e.currentTarget.innerText)}
                onKeyDown={handleKeyDownSingleLine}
                className={`font-extrabold font-mono block outline-none ${isSelected ? 'cursor-text' : ''}`}
                style={{
                  ...valueTypo,
                  color: effectiveProps.valueColor || valueTypo.color || primaryStart,
                }}
              />
              <InlineEditableText
                tagName="span"
                html={effectiveProps.labelHtml}
                text={effectiveProps.label}
                placeholder="Horas de Atendimento"
                isSelected={isSelected}
                onChange={(patch) => handlePropUpdate('label', patch.text)}
                onKeyDown={handleKeyDownSingleLine}
                className={`block outline-none opacity-80 ${isSelected ? 'cursor-text' : ''}`}
                style={{
                  ...labelTypo,
                  color: effectiveProps.labelColor || labelTypo.color,
                }}
              />
            </div>
          );
        })()}

        {/* DIVIDER */}
        {component.type === 'divider' && (
          <hr
            style={{
              borderTopWidth: effectiveProps.thickness || '1px',
              borderTopColor: effectiveProps.color || 'var(--surface-border)',
              borderTopStyle: (effectiveProps.style as any) || 'solid',
              marginTop: '16px',
              marginBottom: '16px',
              width: '100%',
            }}
            className="pointer-events-none"
          />
        )}

        {/* SPACER */}
        {component.type === 'spacer' && (
          <div style={{ height: effectiveProps.height || '32px' }} className="w-full pointer-events-none" />
        )}

        {/* LOGO */}
        {component.type === 'logo' && (() => {
          const resolvedLogoUrl =
            (effectiveProps.mode === 'image' && effectiveProps.imageUrl)
              ? effectiveProps.imageUrl
              : (page?.logoUrl || page?.siteConfig?.logoUrl || page?.siteConfig?.theme?.logoUrl);

          const resolvedLogoConfig =
            (effectiveProps.mode === 'html' && effectiveProps.htmlConfig)
              ? effectiveProps.htmlConfig
              : (page?.siteConfig?.logoConfig || page?.siteConfig?.theme?.logoConfig);

          const resolvedFaviconUrl =
            page?.faviconUrl || page?.siteConfig?.theme?.faviconUrl;

          const resolvedTitle =
            page?.siteConfig?.professional?.name ||
            page?.siteConfig?.logoConfig?.text ||
            page?.title ||
            page?.workspace?.name ||
            'Psicologia';

          const align = effectiveProps.align || effectiveStyle.textAlign || 'left';
          const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';

          const fontHeading = page?.siteConfig?.theme?.fontHeading || page?.theme?.fontHeading;
          const logoWidth = effectiveProps.width || effectiveStyle.width || '180px';
          const logoHeight = effectiveProps.height || effectiveStyle.height;

          return (
            <div className={`w-full flex items-center ${justifyClass}`}>
              <BrandLogo
                logoUrl={resolvedLogoUrl}
                logoConfig={resolvedLogoConfig}
                faviconUrl={resolvedFaviconUrl}
                title={resolvedTitle}
                fallbackText="Psicologia"
                primaryStart={primaryStart}
                primaryEnd={primaryEnd}
                contrastColor={contrast}
                fontHeading={fontHeading}
                width={logoWidth}
                height={logoHeight}
              />
            </div>
          );
        })()}

        {/* NAVBAR LINKS / MENU */}
        {component.type === 'navbar_links' && (
          <NavbarLinksWrapper
            component={component}
            isSelected={isSelected}
            viewportMode={viewportMode}
            page={page}
            isPublicView={isPublicView}
          />
        )}

        {/* SOCIAL LINKS */}
        {component.type === 'social_links' && (
          <SocialLinksWrapper
            component={component}
            isSelected={isSelected}
            viewportMode={viewportMode}
            page={page}
            isPublicView={isPublicView}
          />
        )}

        {/* FALLBACK */}
        {!['heading', 'paragraph', 'label', 'button', 'icon', 'badge', 'image', 'video', 'avatar', 'list', 'card', 'faq_item', 'testimonial', 'stat_counter', 'divider', 'spacer', 'logo', 'navbar_links', 'social_links'].includes(
          component.type
        ) && (
          <div className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm text-xs font-semibold text-slate-500 flex items-center gap-2">
            <span>[{getComponentTypeLabel(component.type)}]</span>
          </div>
        )}
      </div>
    </div>
  );
}
