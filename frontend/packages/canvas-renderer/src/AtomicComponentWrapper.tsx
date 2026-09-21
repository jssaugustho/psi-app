'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AtomicComponent, ViewportMode, CanvasData } from './types';
import {
  GripVertical,
  Trash2,
  Sparkles,
  Check,
  ChevronDown,
  User,
  Video,
  Star,
  Quote,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { BrandLogo } from '@psi/ui';
import {
  getThemeColors,
  getThemeTypography,
  getThemeButtonDefaults,
  getTextFallbackColor,
  getLuminance,
  getComponentHoverClasses,
  getComponentTransitionAndHoverStyle,
  buildComponentCssStyle,
} from './utils/colorHelpers';
import { useParallaxEffect } from './hooks/useParallaxEffect';
import { useIsAdjustingProperty } from './utils/propertyAdjustHelpers';
import { NavbarLinksWrapper } from './NavbarLinksWrapper';
import { SocialLinksWrapper } from './SocialLinksWrapper';
import { createDefaultDiv, createDefaultCarousel, createDefaultComponent } from './constants';

function getLucideIcon(iconName?: string): React.ComponentType<any> | null {
  if (!iconName || iconName.toLowerCase() === 'none' || iconName.trim() === '') return null;
  const icon = (LucideIcons as any)[iconName];
  return icon || null;
}

function getComponentTypeLabel(type: string): string {
  switch (type) {
    case 'heading': return 'Título';
    case 'paragraph': return 'Texto / Parágrafo';
    case 'label': return 'Subtítulo / Etiqueta';
    case 'button': return 'Botão CTA';
    case 'icon': return 'Ícone Lucide';
    case 'badge': return 'Selo / Badge';
    case 'image': return 'Imagem / Foto';
    case 'video': return 'Vídeo';
    case 'avatar': return 'Foto de Perfil';
    case 'list': return 'Lista de Tópicos';
    case 'card': return 'Card de Conteúdo';
    case 'faq_item': return 'Pergunta Frequente (FAQ)';
    case 'testimonial': return 'Depoimento de Cliente';
    case 'stat_counter': return 'Contador Números';
    case 'divider': return 'Linha Divisória';
    case 'spacer': return 'Espaçador';
    case 'logo': return 'Logotipo / Marca';
    case 'navbar_links': return 'Menu de Navegação';
    case 'social_links': return 'Redes Sociais';
    default: return type;
  }
}

interface InlineEditableTextProps {
  tagName?: any;
  html?: string;
  text?: string;
  placeholder?: string;
  isSelected?: boolean;
  isPublicView?: boolean;
  onSelect?: () => void;
  onChange?: (patch: { text: string; html: string }) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  style?: React.CSSProperties;
  className?: string;
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

function InlineEditableText({
  tagName: TagName = 'div',
  html,
  text,
  placeholder = '',
  isSelected = false,
  isPublicView = false,
  onSelect,
  onChange,
  onKeyDown,
  style,
  className,
}: InlineEditableTextProps) {
  const ref = useRef<HTMLElement>(null);
  const isEditingRef = useRef(false);

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

  let normalizedStyle: React.CSSProperties = style ? { ...style } : {};

  const rawBg = (style as any)?.background;
  const rawBgImg = (style as any)?.backgroundImage;

  const activeBgImage =
    (typeof rawBgImg === 'string' && rawBgImg) ||
    (typeof rawBg === 'string' && (rawBg.includes('gradient') || rawBg.includes('url(') || rawBg.includes('var(--brand-gradient')) ? rawBg : undefined);

  const activeBgColor =
    (typeof style?.backgroundColor === 'string' && style.backgroundColor) ||
    (typeof rawBg === 'string' && !rawBg.includes('gradient') && !rawBg.includes('url(') && !rawBg.includes('var(--brand-gradient') ? rawBg : undefined);

  delete (normalizedStyle as any).background;

  const isTextGradient =
    typeof activeBgImage === 'string' &&
    (activeBgImage.includes('gradient') || activeBgImage.includes('var(--brand-gradient')) &&
    (style?.backgroundClip === 'text' || (style as any)?.WebkitBackgroundClip === 'text' || style?.color === 'transparent');

  if (isTextGradient) {
    normalizedStyle.backgroundImage = activeBgImage;
    normalizedStyle.backgroundColor = 'transparent';
    normalizedStyle.display = normalizedStyle.display || 'inline-block';
    normalizedStyle.WebkitBackgroundClip = 'text';
    normalizedStyle.backgroundClip = 'text';
    normalizedStyle.color = 'transparent';
    (normalizedStyle as any).WebkitTextFillColor = 'transparent';
  } else {
    normalizedStyle.backgroundImage = activeBgImage || 'none';
    if (activeBgColor) {
      normalizedStyle.backgroundColor = activeBgColor;
    } else {
      delete normalizedStyle.backgroundColor;
    }
    delete (normalizedStyle as any).WebkitBackgroundClip;
    delete (normalizedStyle as any).backgroundClip;
    delete (normalizedStyle as any).WebkitTextFillColor;
  }

  if (isPublicView) {
    if (html) {
      return (
        <Tag
          className={className}
          style={normalizedStyle}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    return (
      <Tag className={className} style={normalizedStyle}>
        {text !== undefined ? text : placeholder}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      contentEditable={true}
      style={normalizedStyle}
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
      onBlur={() => {
        isEditingRef.current = false;
        if (ref.current && onChange) {
          onChange({
            html: ref.current.innerHTML,
            text: ref.current.innerText,
          });
        }
      }}
      onInput={(e: React.FormEvent<HTMLElement>) => {
        isEditingRef.current = true;
        if (ref.current && onChange) {
          onChange({
            html: e.currentTarget.innerHTML,
            text: e.currentTarget.innerText,
          });
        }
      }}
      onKeyDown={onKeyDown}
      className={`cursor-text ${className}`}
    />
  );
}

function AnimatedCounterDisplay({
  targetValueStr,
  enableAnimation = true,
  startVal = 0,
  durationMs = 2000,
  className,
  style,
}: {
  targetValueStr: string;
  enableAnimation?: boolean;
  startVal?: number;
  durationMs?: number;
  className: string;
  style: React.CSSProperties;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState<string>(targetValueStr || '+500');

  useEffect(() => {
    if (enableAnimation === false) {
      setDisplayValue(targetValueStr || '+500');
      return;
    }

    const rawStr = targetValueStr || '+500';
    const match = rawStr.match(/(\D*)(\d[\d.,]*)(.*)/);
    if (!match) {
      setDisplayValue(rawStr);
      return;
    }

    const prefix = match[1] || '';
    const numberStr = match[2].replace(/,/g, '');
    const suffix = match[3] || '';
    const targetNum = parseFloat(numberStr);

    if (isNaN(targetNum)) {
      setDisplayValue(rawStr);
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    let hasStarted = false;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted) {
            hasStarted = true;

            const startTime = performance.now();
            const startNumber = startVal;

            const step = (now: number) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / durationMs, 1);
              const currentNum = startNumber + (targetNum - startNumber) * Math.pow(progress, 2);
              const formattedNum = Math.floor(currentNum).toLocaleString('pt-BR');

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
  }, [targetValueStr, enableAnimation, startVal, durationMs]);

  return (
    <span
      ref={containerRef}
      className={className}
      style={style}
    >
      {displayValue}
    </span>
  );
}

interface AtomicComponentWrapperProps {
  component: AtomicComponent;
  isSelected?: boolean;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  viewportMode?: ViewportMode;
  onSelect?: (id: string, type: any) => void;
  onRemove?: (id: string) => void;
  onUpdateComponent?: (id: string, patch: Partial<AtomicComponent>) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onContextMenu?: (e: React.MouseEvent, id: string, type: string) => void;
  onCtaClick?: () => void;
  isPublicView?: boolean;
  page?: any;
  canvasData?: CanvasData | null;
}

export function AtomicComponentWrapper({
  component,
  isSelected: isSelectedProp = false,
  hoveredId = null,
  onHover,
  viewportMode = 'desktop',
  onSelect,
  onRemove,
  onUpdateComponent,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onContextMenu,
  onCtaClick,
  isPublicView = false,
  page,
  canvasData,
}: AtomicComponentWrapperProps) {
  const isAdjustingProperty = useIsAdjustingProperty();
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [isMouseHovered, setIsMouseHovered] = useState(false);
  const isSelected = !isPublicView && isSelectedProp && !isAdjustingProperty;
  const isSelfHovered = !isPublicView && (isMouseHovered || hoveredId === component.id) && !isAdjustingProperty;
  const isStylingHovered = isMouseHovered || (isSelected && (isSelfHovered || !!(component.style as any)?.__isPreviewingHover));
  const isMobile = viewportMode === 'mobile';
  const props = component.props || {};
  const style = component.style || {};

  const effectiveStyle = isMobile
    ? { ...style, ...(component.mobile?.style || {}) }
    : style;
  const effectiveProps = isMobile
    ? { ...props, ...(component.mobile?.props || {}) }
    : props;

  const parallax = useParallaxEffect({
    speed: effectiveStyle.parallaxSpeed || 0,
    disableMobile: !!effectiveStyle.disableParallaxMobile,
    isMobile,
    isEditorMode: !isPublicView,
  });

  const isMobileHidden = isMobile
    ? (component.mobile?.hidden ?? component.hidden ?? false)
    : (component.hidden ?? false);

  if (isMobileHidden) return null;

  const { primaryStart, primaryEnd, contrast, siteBg } = getThemeColors(page);
  const themeTypo = getThemeTypography(page, canvasData || page?.canvasData || page?.siteConfig?.canvasData);

  const getTypographyStyle = (
    defaultCategory: 'heading' | 'body' | 'links' | 'nav_links' | 'buttons' = 'body',
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
    } else if (presetKey === 'nav_links' || (!presetKey && defaultCategory === 'nav_links')) {
      levelConfig = themeTypo.levels.nav_links || themeTypo.levels.links;
    }

    const explicitFontFamily = prefix ? effectiveProps[`${prefix}FontFamily`] : (effectiveProps.fontFamily || matchedCustomPreset?.patch?.fontFamily);
    const explicitFontSize = prefix ? effectiveProps[`${prefix}FontSize`] : (effectiveProps.fontSize || matchedCustomPreset?.patch?.fontSize);
    const explicitFontWeight = prefix ? effectiveProps[`${prefix}FontWeight`] : (effectiveProps.fontWeight || matchedCustomPreset?.patch?.fontWeight);
    const explicitLineHeight = prefix ? effectiveProps[`${prefix}LineHeight`] : (effectiveProps.lineHeight || matchedCustomPreset?.patch?.lineHeight);
    const explicitLetterSpacing = prefix ? effectiveProps[`${prefix}LetterSpacing`] : (effectiveProps.letterSpacing || matchedCustomPreset?.patch?.letterSpacing);
    const explicitTextTransform = prefix ? effectiveProps[`${prefix}TextTransform`] : (effectiveProps.textTransform || matchedCustomPreset?.patch?.textTransform);
    
    const isPlaceholder = (c?: string) =>
      !c ||
      c === 'inherit' ||
      c === 'currentColor';

    const rawPropColor = prefix
      ? effectiveProps[`${prefix}Color`]
      : (effectiveProps.color || (effectiveProps as any).textColor);

    const rawStyleColor = prefix
      ? (effectiveStyle as any)[`${prefix}Color`]
      : effectiveStyle.color;

    const rawPresetColor = prefix
      ? (matchedCustomPreset?.patch as any)?.[`${prefix}Color`]
      : matchedCustomPreset?.patch?.color;

    const rawLevelColor = (levelConfig as any)?.color;

    const validPropColor = !isPlaceholder(rawPropColor) ? rawPropColor : undefined;
    const validStyleColor = !isPlaceholder(rawStyleColor) ? rawStyleColor : undefined;
    const validPresetColor = !isPlaceholder(rawPresetColor) ? rawPresetColor : undefined;
    const validLevelColor = !isPlaceholder(rawLevelColor) ? rawLevelColor : undefined;

    const explicitColor = validPropColor || validStyleColor || validPresetColor || validLevelColor;

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

    const rawHoverColor = prefix
      ? ((effectiveStyle as any)[`hover${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}Color`] || effectiveStyle.hoverColor)
      : (effectiveStyle.hoverColor || (effectiveStyle as any).hoverTextColor);

    let rawColor = (isStylingHovered && rawHoverColor)
      ? rawHoverColor
      : explicitColor;

    if (!rawColor) {
      rawColor = fallbackColor;
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
      WebkitTextFillColor: isGradient ? 'transparent' : undefined,
      textAlign: explicitTextAlign || levelConfig.textAlign || (!prefix ? effectiveStyle.textAlign : undefined),
      marginBottom: !prefix ? effectiveStyle.marginBottom : undefined,
    };
  };

  const handleKeyDownSingleLine = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
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

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // No modo editor (canvas), botões NÃO abrem links e NÃO navegam.
    // Apenas selecionam o componente no editor para abrir o painel de propriedades.
    if (!isPublicView) {
      if (onSelect) {
        onSelect(component.id, component.type);
      }
      return;
    }

    const destType = effectiveProps.destinationType || effectiveProps.action || 'cta_primary';

    if (destType === 'whatsapp') {
      const number = effectiveProps.whatsappNumber ? effectiveProps.whatsappNumber.replace(/\D/g, '') : '';
      const msg = effectiveProps.whatsappMessage || 'Olá! Gostaria de agendar uma consulta.';
      const waUrl = number ? `https://wa.me/${number}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
      return;
    }

    if (destType === 'external_url' && (effectiveProps.externalUrl || effectiveProps.linkUrl)) {
      const url = effectiveProps.externalUrl || effectiveProps.linkUrl;
      const targetUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(targetUrl, '_blank');
      return;
    }

    if (destType === 'scroll_to' && (effectiveProps.scrollTargetId || effectiveProps.targetSectionId)) {
      const targetId = effectiveProps.scrollTargetId || effectiveProps.targetSectionId;
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (destType === 'form' && effectiveProps.targetFormId) {
      const formEl = document.getElementById(`form-${effectiveProps.targetFormId}`);
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth' });
      }
      if (onCtaClick) onCtaClick();
      return;
    }

    if (onCtaClick) {
      onCtaClick();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';
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

      // CASO B: INSERIR NOVO ELEMENTO DA SIDEBAR
      if (data.itemType) {
        let newComp: any = null;
        if (data.itemType === 'div') {
          newComp = createDefaultDiv('Container (Div)');
        } else if (data.itemType === 'carousel') {
          newComp = createDefaultCarousel();
        } else {
          newComp = createDefaultComponent(data.itemType, data.preset);
        }

        if (newComp && onAddComponentBeforeOrAfter) {
          onAddComponentBeforeOrAfter(component.id, newComp, pos);
          if (onSelect) {
            onSelect(newComp.id, newComp.type);
          }
        }
        return;
      }
    } catch (err) {
      console.error('Drop error on atomic component:', err);
    }
  };

  return (
    <div
      ref={parallax.ref as any}
      data-node-id={component.id}
      onClick={(e) => {
        if (!isPublicView && onSelect) {
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
      onMouseOver={(e) => {
        setIsMouseHovered(true);
        if (!isPublicView && onHover) {
          e.stopPropagation();
          onHover(component.id);
        }
      }}
      onMouseLeave={() => {
        setIsMouseHovered(false);
      }}
      className={`relative ${!isPublicView ? 'cursor-pointer' : ''} ${
        isMobileHidden ? 'opacity-40 outline-dashed outline-1 outline-amber-400' : ''
      } ${getComponentHoverClasses(effectiveStyle.hoverEffect || (effectiveProps as any)?.hoverEffect, component.type === 'button')}`}
      style={{
        ...parallax.style,
        display: (effectiveStyle.display as any) || (
          (effectiveStyle.width && effectiveStyle.width !== 'auto')
            ? 'block'
            : (['faq_item', 'card', 'testimonial', 'divider', 'paragraph', 'heading', 'label', 'list', 'stat_counter', 'video'].includes(component.type) ? 'block' : 'inline-block')
        ),
        width: (effectiveStyle.width && effectiveStyle.width !== 'auto')
          ? effectiveStyle.width
          : (['faq_item', 'card', 'testimonial', 'divider', 'paragraph', 'heading', 'label', 'list', 'stat_counter', 'video'].includes(component.type) ? '100%' : 'auto'),
        ...buildComponentCssStyle({
          component,
          viewportMode,
          isHovered: isStylingHovered,
          page,
          canvasData,
          componentCategory: component.type as any,
        }),
      }}
    >
      {/* Indicadores Visuais de Drop (Antes / Depois) */}
      {!isPublicView && dropPosition === 'before' && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-blue-500 rounded-full shadow-lg z-50 animate-pulse pointer-events-none" />
      )}
      {!isPublicView && dropPosition === 'after' && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-blue-500 rounded-full shadow-lg z-50 animate-pulse pointer-events-none" />
      )}

      {/* Borda Flutuante de Seleção / Hover no topo dos filhos (z-20) */}
      {!isPublicView && isSelected && !isAdjustingProperty && (
        <div className="absolute inset-0 border-2 border-purple-600 pointer-events-none z-20 rounded-[inherit]" />
      )}
      {!isPublicView && isSelfHovered && !isSelected && !isAdjustingProperty && (
        <div className="absolute inset-0 border border-blue-400/60 pointer-events-none z-20 rounded-[inherit]" />
      )}

      {/* Botão de Arrastar / Mover Componente no Hover (Apenas no Editor) */}
      {!isPublicView && !isAdjustingProperty && (
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect(component.id, component.type);
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
            if (onSelect) onSelect(component.id, component.type);
          }}
          onMouseEnter={(e) => {
            if (!isPublicView && onHover) {
              e.stopPropagation();
              onHover(component.id);
            }
          }}
          onMouseLeave={(e) => {
            if (!isPublicView && onHover) {
              e.stopPropagation();
              onHover(null);
            }
          }}
          className={`absolute -top-3.5 left-1 -translate-y-1/2 transition-opacity ${
            isSelected ? 'bg-purple-600' : 'bg-blue-600'
          } text-white p-1 rounded-md shadow-md z-40 cursor-grab active:cursor-grabbing flex items-center justify-center select-none ${
            isSelfHovered || isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          title="Arrastar componente para mover de lugar"
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}

      {/* Badge de Seleção Flutuante */}
      {!isPublicView && isSelected && !isAdjustingProperty && (
        <div
          onMouseEnter={(e) => {
            if (!isPublicView && onHover) {
              e.stopPropagation();
              onHover(component.id);
            }
          }}
          onMouseLeave={(e) => {
            if (!isPublicView && onHover) {
              e.stopPropagation();
              onHover(null);
            }
          }}
          className="absolute -top-3.5 right-1 -translate-y-1/2 flex items-center gap-1 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md z-40 select-none pointer-events-auto"
        >
          <span>{getComponentTypeLabel(component.type)}</span>
          {onRemove && (
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
          )}
        </div>
      )}

      {/* Render Visual Real com Suporte a Edição Inline de Texto quando no Editor */}
      <div
        className={`w-full ${effectiveStyle.height && effectiveStyle.height !== 'auto' ? 'h-full flex items-center justify-center' : ''}`}
        style={{ textAlign: effectiveStyle.textAlign || 'inherit' }}
      >
        {/* HEADING */}
        {component.type === 'heading' && (() => {
          const level = effectiveProps.level || 1;
          const typo = getTypographyStyle('heading', level);
          const tagName = (level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4') as any;

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
              tagName={tagName}
              html={renderedHtml}
              text={effectiveProps.text}
              placeholder="Digite seu título aqui"
              isSelected={isSelected}
              isPublicView={isPublicView}
              onSelect={() => onSelect && onSelect(component.id, component.type)}
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
                background: typo.background,
                WebkitBackgroundClip: typo.WebkitBackgroundClip as any,
                backgroundClip: typo.backgroundClip as any,
                marginBottom: typo.marginBottom,
                fontFamily: typo.fontFamily,
              }}
              className={`outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
            />
          );
        })()}

        {/* PARAGRAPH */}
        {component.type === 'paragraph' && (() => {
          const typo = getTypographyStyle('body');
          return (
            <InlineEditableText
              tagName="p"
              html={effectiveProps.html}
              text={effectiveProps.text}
              placeholder="Escreva seu parágrafo ou texto descritivo..."
              isSelected={isSelected}
              isPublicView={isPublicView}
              onSelect={() => onSelect && onSelect(component.id, component.type)}
              onChange={(patch) => {
                handlePropsBatchUpdate({
                  text: patch.text,
                  html: patch.html,
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
                background: typo.background,
                WebkitBackgroundClip: typo.WebkitBackgroundClip as any,
                backgroundClip: typo.backgroundClip as any,
                marginBottom: typo.marginBottom,
                fontFamily: typo.fontFamily,
              }}
              className={`leading-relaxed outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
            />
          );
        })()}

        {/* LABEL */}
        {component.type === 'label' && (() => {
          const typo = getTypographyStyle('heading', 4);
          const defaultLabelColor = primaryStart;
          return (
            <InlineEditableText
              tagName="span"
              html={effectiveProps.html}
              text={effectiveProps.text}
              placeholder="SUBTÍTULO / ETIQUETA"
              isSelected={isSelected}
              isPublicView={isPublicView}
              onSelect={() => onSelect && onSelect(component.id, component.type)}
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
                background: typo.background || (isStylingHovered && effectiveStyle.hoverBackgroundColor ? effectiveStyle.hoverBackgroundColor : effectiveStyle.backgroundColor) || undefined,
                WebkitBackgroundClip: typo.WebkitBackgroundClip as any,
                backgroundClip: typo.backgroundClip as any,
                marginBottom: typo.marginBottom,
                fontFamily: typo.fontFamily,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: isStylingHovered && effectiveStyle.hoverBorderColor ? effectiveStyle.hoverBorderColor : effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius,
              }}
              className={`tracking-wider block font-bold outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
            />
          );
        })()}

        {/* BUTTON */}
        {component.type === 'button' && (() => {
          const buttonDefaults = getThemeButtonDefaults(page, effectiveProps.templateId || effectiveProps.buttonTemplateId, canvasData);
          const typo = getTypographyStyle('buttons');
          const isWidthSet = !!effectiveStyle.width && effectiveStyle.width !== 'auto';
          const isFullWidth = effectiveProps.fullWidth || isWidthSet;
          const isHeightSet = !!effectiveStyle.height && effectiveStyle.height !== 'auto';

          const buttonVariant = effectiveProps.variant === 'secondary' ? 'secondary' : (buttonDefaults.variant || 'primary');
          const isSecondary = buttonVariant === 'secondary';
          const isPrimary = !isSecondary;
          const gradientBg = buttonDefaults.gradientString || 'linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))';
          const contrastColor = buttonDefaults.color || contrast || 'var(--brand-contrast-color)';
          const brandColor = primaryStart || 'var(--brand-gradient-start)';

          const effectiveBtnBorderStyle = effectiveStyle.borderStyle || buttonDefaults.borderStyle;
          const effectiveBtnBorderWidth = effectiveStyle.borderWidth || buttonDefaults.borderWidth;
          const hasBtnBorder = !!(
            (effectiveBtnBorderStyle && effectiveBtnBorderStyle !== 'none') ||
            (effectiveBtnBorderWidth && effectiveBtnBorderWidth !== '0px') ||
            effectiveStyle.borderColor
          );

          const defaultBg = isPrimary ? gradientBg : 'transparent';
          const defaultColor = isPrimary ? contrastColor : brandColor;
          const defaultBorderColor = isPrimary ? (hasBtnBorder ? brandColor : 'transparent') : brandColor;

          const defaultHoverBg = buttonDefaults.hoverBackgroundColor || (isPrimary ? 'transparent' : gradientBg);
          const defaultHoverColor = buttonDefaults.hoverColor || (isPrimary ? brandColor : contrastColor);
          const defaultHoverBorderColor = buttonDefaults.hoverBorderColor || (isPrimary ? brandColor : 'transparent');

          const hasExplicitTextColor =
            !!effectiveStyle.color ||
            !!effectiveProps.textColor ||
            !!effectiveProps.color;

          let computedBg =
            (effectiveStyle as any).background ||
            (effectiveStyle as any).gradientString ||
            effectiveStyle.backgroundColor ||
            buttonDefaults.gradientString ||
            buttonDefaults.backgroundColor ||
            defaultBg;

          let computedColor =
            effectiveProps.textColor ||
            effectiveProps.color ||
            effectiveStyle.color ||
            (typo.color !== 'var(--brand-contrast-color)' ? typo.color : undefined) ||
            buttonDefaults.color ||
            defaultColor;
          let computedBorderColor = effectiveStyle.borderColor || buttonDefaults.borderColor || defaultBorderColor;
          if (hasBtnBorder && (computedBorderColor === 'transparent' || !computedBorderColor)) {
            computedBorderColor = brandColor;
          }

          if (
            !hasExplicitTextColor &&
            isPrimary &&
            (computedColor === '#000000' || computedColor === '#18181B' || computedColor === '#18181b' || computedColor === 'black' || computedColor === 'var(--brand-contrast-color)')
          ) {
            computedColor = contrastColor;
          }

          if (isStylingHovered) {
            if ((effectiveStyle as any).hoverBackground || (effectiveStyle as any).hoverGradientString || effectiveStyle.hoverBackgroundColor) {
              computedBg = (effectiveStyle as any).hoverBackground || (effectiveStyle as any).hoverGradientString || effectiveStyle.hoverBackgroundColor;
            } else if (buttonDefaults.hoverBackgroundColor) {
              computedBg = buttonDefaults.hoverBackgroundColor;
            } else if (!effectiveStyle.backgroundColor && !(effectiveStyle as any).background) {
              computedBg = defaultHoverBg;
            }

            if (effectiveStyle.hoverColor) {
              computedColor = effectiveStyle.hoverColor;
              if (
                isSecondary &&
                (computedColor === '#000000' || computedColor === '#18181B' || computedColor === '#18181b' || computedColor === 'black')
              ) {
                computedColor = contrastColor;
              }
            } else if (buttonDefaults.hoverColor) {
              computedColor = buttonDefaults.hoverColor;
            } else if (!effectiveStyle.color) {
              computedColor = defaultHoverColor;
            }

            if (effectiveStyle.hoverBorderColor) {
              computedBorderColor = effectiveStyle.hoverBorderColor;
            } else if (buttonDefaults.hoverBorderColor) {
              computedBorderColor = buttonDefaults.hoverBorderColor;
            } else if (!effectiveStyle.borderColor) {
              computedBorderColor = defaultHoverBorderColor !== 'transparent' ? defaultHoverBorderColor : (hasBtnBorder ? brandColor : 'transparent');
            }
          }

          const isBtnTextGradient = typeof computedColor === 'string' && (computedColor.includes('gradient') || computedColor.includes('var(--brand-gradient'));

          let roundedRadius: string | undefined = undefined;
          if (effectiveProps.rounded === 'none') roundedRadius = '0px';
          if (effectiveProps.rounded === 'sm') roundedRadius = '4px';
          if (effectiveProps.rounded === 'md') roundedRadius = '8px';
          if (effectiveProps.rounded === 'lg') roundedRadius = '16px';
          if (effectiveProps.rounded === 'full') roundedRadius = '9999px';

          const hoverShadow = effectiveStyle.hoverBoxShadow || buttonDefaults.hoverBoxShadow;
          const hoverOpacity = effectiveStyle.hoverOpacity !== undefined ? effectiveStyle.hoverOpacity : buttonDefaults.hoverOpacity;

          const normScale = effectiveStyle.scale !== undefined && effectiveStyle.scale !== '' ? Number(effectiveStyle.scale) : 1;
          const normTranslateY = effectiveStyle.translateY !== undefined && effectiveStyle.translateY !== '' ? Number(effectiveStyle.translateY) : 0;
          const effScale = effectiveStyle.hoverScale !== undefined && effectiveStyle.hoverScale !== ''
            ? Number(effectiveStyle.hoverScale)
            : (buttonDefaults.hoverScale !== undefined ? Number(buttonDefaults.hoverScale) : 1);
          const effTranslateY = effectiveStyle.hoverTranslateY !== undefined && effectiveStyle.hoverTranslateY !== ''
            ? Number(effectiveStyle.hoverTranslateY)
            : (buttonDefaults.hoverTranslateY !== undefined ? Number(buttonDefaults.hoverTranslateY) : 0);

          const duration = effectiveStyle.transitionDurationMs !== undefined
            ? `${effectiveStyle.transitionDurationMs}ms`
            : `${buttonDefaults.transitionDurationMs || 200}ms`;
          const timing = effectiveStyle.transitionTimingFunction || buttonDefaults.transitionTimingFunction || 'ease-in-out';

          const hasBtnTransform = normScale !== 1 || normTranslateY !== 0 || effScale !== 1 || effTranslateY !== 0;
          const btnTransforms: string[] = [];

          if (hasBtnTransform) {
            const activeScale = isStylingHovered ? effScale : normScale;
            const activeTy = isStylingHovered ? effTranslateY : normTranslateY;

            if (normScale !== 1 || effScale !== 1) {
              btnTransforms.push(`scale(${activeScale})`);
            }
            if (normTranslateY !== 0 || effTranslateY !== 0) {
              const tyStr = typeof activeTy === 'number' ? `${activeTy}px` : activeTy;
              btnTransforms.push(`translateY(${tyStr})`);
            }
          }

          const btnAlignVal = effectiveProps.contentAlign || effectiveProps.textAlign || typo.textAlign || 'center';
          let btnJustifyClass = 'justify-center text-center';
          if (btnAlignVal === 'left' || btnAlignVal === 'flex-start') btnJustifyClass = 'justify-start text-left';
          if (btnAlignVal === 'right' || btnAlignVal === 'flex-end') btnJustifyClass = 'justify-end text-right';

          const ButtonIconLeft = effectiveProps.iconLeft ? getLucideIcon(effectiveProps.iconLeft) : null;
          const ButtonIconRight = effectiveProps.iconRight ? getLucideIcon(effectiveProps.iconRight) : null;

          const btnPaddingX = effectiveStyle.paddingLeft || buttonDefaults.paddingX || '24px';
          const btnPaddingY = effectiveStyle.paddingTop || buttonDefaults.paddingY || '12px';

          return (
            <button
              type="button"
              onClick={handleButtonClick}
              className={`text-xs font-bold flex items-center gap-2 cursor-pointer ${btnJustifyClass} ${
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
                fontSize: effectiveStyle.fontSize || effectiveProps.fontSize || typo.fontSize || buttonDefaults.fontSize || '0.875rem',
                fontWeight: effectiveStyle.fontWeight || effectiveProps.fontWeight || typo.fontWeight || buttonDefaults.fontWeight || '700',
                letterSpacing: effectiveStyle.letterSpacing || effectiveProps.letterSpacing || typo.letterSpacing || buttonDefaults.letterSpacing || '0.025em',
                textTransform: (effectiveStyle.textTransform || effectiveProps.textTransform || typo.textTransform || buttonDefaults.textTransform || 'none') as any,
                color: isBtnTextGradient ? undefined : computedColor,
                fontFamily: effectiveStyle.fontFamily || effectiveProps.fontFamily || typo.fontFamily || buttonDefaults.fontFamily,
                marginBottom: typo.marginBottom,
                background: computedBg,
                borderStyle: effectiveStyle.borderStyle || buttonDefaults.borderStyle || (hasBtnBorder ? 'solid' : 'none'),
                borderWidth: effectiveStyle.borderWidth || buttonDefaults.borderWidth || (hasBtnBorder ? '2px' : '0px'),
                borderColor: computedBorderColor,
                borderRadius: effectiveStyle.borderRadius || buttonDefaults.borderRadius || roundedRadius || '12px',
                boxShadow: isStylingHovered && hoverShadow ? hoverShadow : undefined,
                opacity: isStylingHovered && hoverOpacity !== undefined ? hoverOpacity : undefined,
                transform: isStylingHovered && btnTransforms.length > 0 ? btnTransforms.join(' ') : undefined,
                transitionProperty: 'all',
                transitionDuration: duration,
                transitionTimingFunction: timing,
              }}
            >
              {ButtonIconLeft && <ButtonIconLeft className="w-4 h-4 pointer-events-none shrink-0" style={{ color: isBtnTextGradient ? (computedColor.match(/#(?:[0-9a-fA-F]{3,8})|rgba?\([^)]+\)/)?.[0] || brandColor) : undefined }} />}
              <InlineEditableText
                tagName="span"
                html={effectiveProps.html}
                text={effectiveProps.label || effectiveProps.text}
                placeholder="Agendar Consulta"
                isSelected={isSelected}
                isPublicView={isPublicView}
                onChange={(patch) => {
                  handlePropsBatchUpdate({
                    label: patch.text,
                    text: patch.text,
                    html: patch.html,
                  });
                }}
                onKeyDown={handleKeyDownSingleLine}
                style={
                  isBtnTextGradient
                    ? {
                        background: computedColor,
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        color: 'transparent',
                        display: 'inline-block',
                      }
                    : undefined
                }
                className={`outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
              />
              {ButtonIconRight && <ButtonIconRight className="w-4 h-4 pointer-events-none shrink-0" style={{ color: isBtnTextGradient ? (computedColor.match(/#(?:[0-9a-fA-F]{3,8})|rgba?\([^)]+\)/)?.[0] || brandColor) : undefined }} />}
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
          const badgeBg = (effectiveStyle as any).background || effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 15%, transparent)`;
          const badgeRadius = effectiveStyle.borderRadius || (effectiveProps.rounded !== false ? '9999px' : '8px');

          const bdgAlignVal = effectiveProps.contentAlign || effectiveProps.textAlign || typo.textAlign || 'center';
          let bdgJustifyClass = 'justify-center text-center';
          if (bdgAlignVal === 'left' || bdgAlignVal === 'flex-start') bdgJustifyClass = 'justify-start text-left';
          if (bdgAlignVal === 'right' || bdgAlignVal === 'flex-end') bdgJustifyClass = 'justify-end text-right';

          const badgeElement = (
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
                color: typo.background ? undefined : (typo.color || badgeColor),
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
                isPublicView={isPublicView}
                onChange={(patch) => {
                  handlePropsBatchUpdate({
                    text: patch.text,
                    html: patch.html,
                  });
                }}
                onKeyDown={handleKeyDownSingleLine}
                style={typo.background ? {
                  background: typo.background,
                  WebkitBackgroundClip: typo.WebkitBackgroundClip as any,
                  backgroundClip: typo.backgroundClip as any,
                  color: 'transparent',
                  display: 'inline-block',
                } : undefined}
                className={`outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
              />
            </div>
          );

          if (effectiveProps.linkUrl) {
            return (
              <a
                href={isPublicView ? effectiveProps.linkUrl : '#'}
                onClick={!isPublicView ? (e) => e.preventDefault() : undefined}
                target={isPublicView ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="inline-block cursor-pointer hover:opacity-90 transition-opacity"
              >
                {badgeElement}
              </a>
            );
          }

          return badgeElement;
        })()}

        {/* IMAGE */}
        {component.type === 'image' && (() => {
          const imgContent = (
            <div
              className="w-full overflow-hidden flex items-center justify-center"
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
                  <span className="text-xs font-semibold block">🖼 Imagem</span>
                </div>
              )}
            </div>
          );

          if (effectiveProps.linkTo) {
            return (
              <a
                href={isPublicView ? effectiveProps.linkTo : '#'}
                onClick={!isPublicView ? (e) => e.preventDefault() : undefined}
                target={isPublicView ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="block w-full cursor-pointer"
              >
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
              className="w-full overflow-hidden flex items-center justify-center rounded-xl"
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
                    className="w-full h-full border-0"
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
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="text-center p-8 space-y-2 text-slate-400 flex flex-col items-center justify-center">
                  <Video className="w-8 h-8 text-blue-500 opacity-80 mb-1" />
                  <span className="text-xs font-bold text-slate-300 block">📹 Player de Vídeo</span>
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

          const hasBorder = effectiveProps.hasBorder === true;
          const borderColor = effectiveProps.borderColor || primaryStart;
          const hasShadow = effectiveProps.hasShadow === true;

          return (
            <div
              className={`inline-flex items-center justify-center overflow-hidden transition-all ${
                hasShadow ? 'shadow-md' : ''
              }`}
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius,
                borderWidth: hasBorder ? (effectiveStyle.borderWidth || '2px') : '0px',
                borderStyle: hasBorder ? (effectiveStyle.borderStyle || 'solid') : 'none',
                borderColor: hasBorder ? borderColor : 'transparent',
                background: (effectiveStyle as any).background || effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 20%, transparent)`,
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
                  className="rounded-full flex items-center justify-center shrink-0 font-extrabold"
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
                  className="rounded-full shrink-0"
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
                  className="shrink-0"
                  style={{
                    color: listIconColor,
                    marginTop: `${Math.max(1, Math.round(fontNum * 0.15))}px`,
                  }}
                />
              );
            }

            const ItemIcon = getLucideIcon(item.iconName !== undefined ? item.iconName : 'Check');
            if (!ItemIcon) return null;
            return (
              <span
                className="rounded-full flex items-center justify-center shrink-0 font-bold"
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
                color: typo.background ? undefined : typo.color,
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
                  <span
                    className="flex-1"
                    style={typo.background ? {
                      background: typo.background,
                      WebkitBackgroundClip: typo.WebkitBackgroundClip as any,
                      backgroundClip: typo.backgroundClip as any,
                      color: 'transparent',
                      display: 'inline-block',
                    } : undefined}
                  >
                    {typeof item === 'object' ? (item.text || '') : item}
                  </span>
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

          const formatDim = (val: any, fallback: string) => {
            if (val === undefined || val === null || val === '') return fallback;
            if (typeof val === 'number') return `${val}px`;
            if (typeof val === 'string') {
              if (/^\d+$/.test(val.trim())) return `${val.trim()}px`;
              return val;
            }
            return fallback;
          };

          const iconSizePx = formatDim(effectiveProps.iconSize, '20px');
          const iconMarginBottomPx = formatDim(effectiveProps.iconMarginBottom, '8px');
          const titleMarginBottomPx = formatDim(effectiveProps.titleMarginBottom, '8px');
          const iconBgColor = effectiveProps.iconBgColor || `color-mix(in srgb, ${cardIconColor} 12%, transparent)`;
          const iconBorderRadius = formatDim(effectiveProps.iconBorderRadius, '12px');

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
                background: (effectiveStyle as any).background || effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 4%, ${siteBg})`,
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
                  isPublicView={isPublicView}
                  onChange={(patch) => {
                    handlePropsBatchUpdate({
                      title: patch.text,
                      titleHtml: patch.html,
                    });
                  }}
                  onKeyDown={handleKeyDownSingleLine}
                  style={{
                    ...titleTypo,
                    marginBottom: titleMarginBottomPx,
                  }}
                  className={`outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
                />
                <InlineEditableText
                  tagName="p"
                  html={effectiveProps.bodyHtml}
                  text={effectiveProps.body}
                  placeholder="Descrição do card..."
                  isSelected={isSelected}
                  isPublicView={isPublicView}
                  onChange={(patch) => {
                    handlePropsBatchUpdate({
                      body: patch.text,
                      bodyHtml: patch.html,
                    });
                  }}
                  style={bodyTypo}
                  className={`leading-relaxed opacity-80 outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
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
            <details
              className={`w-full p-4 space-y-2 group transition-all ${
                isHeightSet ? 'h-full' : ''
              }`}
              open={effectiveProps.defaultOpen}
              style={{
                width: '100%',
                height: isHeightSet ? '100%' : undefined,
                background: (effectiveStyle as any).background || effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 3%, ${siteBg})`,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius || '12px',
                boxShadow: effectiveStyle.boxShadow,
              }}
            >
              <summary className="list-none flex items-center justify-between cursor-pointer outline-none select-none">
                <InlineEditableText
                  tagName="span"
                  html={effectiveProps.questionHtml}
                  text={effectiveProps.question}
                  placeholder="Pergunta?"
                  isSelected={isSelected}
                  isPublicView={isPublicView}
                  onChange={(patch) => {
                    handlePropsBatchUpdate({
                      question: patch.text,
                      questionHtml: patch.html,
                    });
                  }}
                  onKeyDown={handleKeyDownSingleLine}
                  style={questionTypo}
                  className={`outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
                />
                <ChevronDown
                  className="w-4 h-4 opacity-60 transition-transform group-open:rotate-180"
                  style={{ color: (questionTypo.color !== 'transparent' && questionTypo.color) || contrast }}
                />
              </summary>
              <div className="pt-2 border-t border-[var(--surface-border)]/40">
                <InlineEditableText
                  tagName="p"
                  html={effectiveProps.answerHtml}
                  text={effectiveProps.answer}
                  placeholder="Resposta explicativa da dúvida..."
                  isSelected={isSelected}
                  isPublicView={isPublicView}
                  onChange={(patch) => {
                    handlePropsBatchUpdate({
                      answer: patch.text,
                      answerHtml: patch.html,
                    });
                  }}
                  style={answerTypo}
                  className={`leading-relaxed opacity-75 outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
                />
              </div>
            </details>
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
                background: (effectiveStyle as any).background || effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 4%, ${siteBg})`,
              }}
            >
              {showQuoteIcon && (
                <Quote className="w-6 h-6 text-[var(--brand-gradient-start)] opacity-30 absolute top-4 right-4 pointer-events-none" />
              )}
              {ratingNum > 0 && (
                <div className="flex items-center gap-1 text-amber-400">
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
                placeholder="Depoimento do paciente..."
                isSelected={isSelected}
                isPublicView={isPublicView}
                onChange={(patch) => {
                  handlePropsBatchUpdate({
                    quote: patch.text,
                    quoteHtml: patch.html,
                  });
                }}
                style={quoteTypo}
                className={`italic opacity-90 outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
              />
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden shrink-0"
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
                    placeholder="Nome do Cliente"
                    isSelected={isSelected}
                    isPublicView={isPublicView}
                    onChange={(patch) => {
                      handlePropsBatchUpdate({
                        authorName: patch.text,
                        authorNameHtml: patch.html,
                      });
                    }}
                    onKeyDown={handleKeyDownSingleLine}
                    style={authorNameTypo}
                    className={`block outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
                  />
                  <InlineEditableText
                    tagName="span"
                    html={effectiveProps.authorTitleHtml}
                    text={effectiveProps.authorTitle}
                    placeholder="Cargo ou Cidade"
                    isSelected={isSelected}
                    isPublicView={isPublicView}
                    onChange={(patch) => {
                      handlePropsBatchUpdate({
                        authorTitle: patch.text,
                        authorTitleHtml: patch.html,
                      });
                    }}
                    onKeyDown={handleKeyDownSingleLine}
                    style={authorTitleTypo}
                    className={`block opacity-70 outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
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
                <div className="flex justify-center mb-1">
                  <StatIconComp size={24} style={{ color: statIconColor }} />
                </div>
              )}
              <AnimatedCounterDisplay
                targetValueStr={effectiveProps.value || '+500'}
                enableAnimation={effectiveProps.enableAnimation !== false}
                startVal={effectiveProps.startValue ?? 0}
                durationMs={effectiveProps.animationDuration || 2000}
                className="font-extrabold font-mono block"
                style={{
                  ...valueTypo,
                  color: effectiveProps.valueColor || valueTypo.color || primaryStart,
                }}
              />
              <InlineEditableText
                tagName="span"
                html={effectiveProps.labelHtml}
                text={effectiveProps.label}
                placeholder="Descrição do Dado"
                isSelected={isSelected}
                isPublicView={isPublicView}
                onChange={(patch) => {
                  handlePropsBatchUpdate({
                    label: patch.text,
                    labelHtml: patch.html,
                  });
                }}
                onKeyDown={handleKeyDownSingleLine}
                style={{
                  ...labelTypo,
                  color: effectiveProps.labelColor || labelTypo.color,
                }}
                className={`block opacity-80 outline-none ${!isPublicView && isSelected ? 'cursor-text' : ''}`}
              />
            </div>
          );
        })()}

        {/* DIVIDER */}
        {component.type === 'divider' && (() => {
          const thickness = typeof effectiveProps.thickness === 'number' ? `${effectiveProps.thickness}px` : (effectiveProps.thickness || effectiveStyle.borderWidth || '1px');
          const color = effectiveProps.color || effectiveStyle.borderColor || 'var(--surface-border)';
          const style = (effectiveProps.style as any) || effectiveStyle.borderStyle || 'solid';
          return (
            <hr
              style={{
                borderTopWidth: thickness,
                borderTopColor: color,
                borderTopStyle: style,
                marginTop: effectiveStyle.marginTop || '16px',
                marginBottom: effectiveStyle.marginBottom || '16px',
                width: '100%',
              }}
            />
          );
        })()}

        {/* SPACER */}
        {component.type === 'spacer' && (() => {
          const h = typeof effectiveProps.height === 'number' ? `${effectiveProps.height}px` : (effectiveProps.height || effectiveStyle.height || '32px');
          return (
            <div style={{ height: h }} className="w-full" />
          );
        })()}

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
            canvasData={canvasData}
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
            canvasData={canvasData}
            isPublicView={isPublicView}
          />
        )}
      </div>

      {/* Borda de Seleção (Roxa) / Hover (Azul) - Desenhar no Topo do Stacking Context (Z-20) */}
      {!isPublicView && isSelected && !isAdjustingProperty && (
        <div
          className="absolute inset-0 pointer-events-none z-20 rounded-[inherit]"
          style={{ borderColor: '#9333ea', borderStyle: 'solid', borderWidth: '2px' }}
        />
      )}
      {!isPublicView && isSelfHovered && !isSelected && !isAdjustingProperty && (
        <div
          className="absolute inset-0 pointer-events-none z-20 rounded-[inherit]"
          style={{ borderColor: '#3b82f6', borderStyle: 'solid', borderWidth: '2px' }}
        />
      )}
    </div>
  );
}
