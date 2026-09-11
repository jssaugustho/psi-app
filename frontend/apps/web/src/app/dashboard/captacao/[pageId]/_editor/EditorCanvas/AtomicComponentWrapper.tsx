'use client';

import React, { useState, useRef } from 'react';
import { AtomicComponent, ViewportMode } from '../types';
import { Trash2, Sparkles, Check, ChevronDown, User, GripVertical } from 'lucide-react';
import { BrandLogo } from '@psi/ui';
import { getLucideIcon } from '../PropertiesPanel/components/IconPicker';
import { createDefaultDiv, createDefaultComponent } from '../constants';
import { getThemeColors } from '../utils/colorHelpers';

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
}: AtomicComponentWrapperProps) {
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [isSelfHovered, setIsSelfHovered] = useState(false);
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

  const themeHeadingFont = page?.siteConfig?.theme?.fontHeading || page?.theme?.fontHeading;
  const themeBodyFont = page?.siteConfig?.theme?.fontBody || page?.theme?.fontBody;

  const getTypographyStyle = (defaultCategory: 'heading' | 'body' = 'body') => {
    const defaultFont = defaultCategory === 'heading' ? themeHeadingFont : themeBodyFont;
    const fontFamily = effectiveStyle.fontFamily
      ? `'${effectiveStyle.fontFamily}', sans-serif`
      : defaultFont
      ? `'${defaultFont}', sans-serif`
      : 'inherit';

    const rawColor = effectiveStyle.color;
    const isGradient = rawColor && (rawColor.includes('gradient') || rawColor.includes('var(--brand-gradient'));

    return {
      fontFamily,
      fontSize: effectiveStyle.fontSize,
      fontWeight: effectiveStyle.fontWeight,
      lineHeight: effectiveStyle.lineHeight,
      letterSpacing: effectiveStyle.letterSpacing,
      textTransform: effectiveStyle.textTransform as any,
      color: isGradient ? 'transparent' : (rawColor || contrast),
      background: isGradient ? rawColor : undefined,
      WebkitBackgroundClip: isGradient ? 'text' : undefined,
      backgroundClip: isGradient ? 'text' : undefined,
      textAlign: effectiveStyle.textAlign,
      marginBottom: effectiveStyle.marginBottom,
    };
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, component.id, component.type);
    }
  };

  const handlePropUpdate = (field: string, newValue: any) => {
    if (onUpdateComponent) {
      if (isMobile) {
        onUpdateComponent(component.id, {
          mobile: {
            ...(component.mobile || {}),
            props: {
              ...(component.mobile?.props || {}),
              [field]: newValue,
            },
          },
        });
      } else {
        onUpdateComponent(component.id, {
          props: {
            ...props,
            [field]: newValue,
          },
        });
      }
    }
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
          col2.layout.flexBasis = '50%';
          newDiv.components = [col1, col2];
          newDiv.layout.flexDirection = 'row';
        } else if (preset === '3col') {
          const col1 = createDefaultDiv('Coluna 1');
          const col2 = createDefaultDiv('Coluna 2');
          const col3 = createDefaultDiv('Coluna 3');
          col1.layout.flexBasis = '33.33%';
          col2.layout.flexBasis = '33.33%';
          col3.layout.flexBasis = '33.33%';
          newDiv.components = [col1, col2, col3];
          newDiv.layout.flexDirection = 'row';
        }
        if (onAddComponentBeforeOrAfter) {
          onAddComponentBeforeOrAfter(component.id, newDiv, pos);
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
      onClick={(e) => {
        e.stopPropagation();
        onSelect(component.id, component.type);
      }}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={(e) => {
        e.stopPropagation();
        setIsSelfHovered(true);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        setIsSelfHovered(false);
      }}
      className={`relative transition-all duration-150 cursor-pointer ${
        isMobileHidden ? 'opacity-40 outline-dashed outline-1 outline-amber-400' : ''
      } ${
        isSelected
          ? 'outline outline-2 outline-blue-500 -outline-offset-2'
          : isSelfHovered
          ? 'outline outline-1 outline-blue-400/60 -outline-offset-1'
          : ''
      }`}
      style={{
        alignSelf: effectiveStyle.alignSelf || 'auto',
        textAlign: effectiveStyle.textAlign || 'inherit',
        marginTop: effectiveStyle.marginTop || '0px',
        marginBottom: effectiveStyle.marginBottom || '0px',
        paddingTop: effectiveStyle.paddingTop || '0px',
        paddingRight: effectiveStyle.paddingRight || '0px',
        paddingBottom: effectiveStyle.paddingBottom || '0px',
        paddingLeft: effectiveStyle.paddingLeft || '0px',
        width: effectiveStyle.width || 'auto',
        height: effectiveStyle.height || 'auto',
        minWidth: effectiveStyle.minWidth,
        maxWidth: effectiveStyle.maxWidth,
        minHeight: effectiveStyle.minHeight,
      }}
    >
      {/* Linha Indicadora de Inserção (Antes / Depois) */}
      {dropPosition === 'before' && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-blue-500 rounded-full z-40 shadow-sm pointer-events-none" />
      )}
      {dropPosition === 'after' && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-blue-500 rounded-full z-40 shadow-sm pointer-events-none" />
      )}
      {/* Botão de Arrastar / Mover Componente no Hover */}
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
        className={`absolute -top-2.5 left-2 transition-opacity bg-blue-600 text-white p-1 rounded-md shadow-md z-30 cursor-grab active:cursor-grabbing flex items-center justify-center select-none ${
          isSelfHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        title="Arrastar componente para mover de lugar"
      >
        <GripVertical className="w-3 h-3" />
      </div>

      {/* Badge de Seleção Flutuante */}
      {isSelected && (
        <div className="absolute -top-3 right-2 flex items-center gap-1 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md z-30 select-none">
          <span>{component.label || component.type}</span>
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
          const typo = getTypographyStyle('heading');
          return (
            <div
              contentEditable={isSelected}
              suppressContentEditableWarning
              onBlur={(e) => handlePropUpdate('text', e.currentTarget.innerText)}
              onKeyDown={handleKeyDownSingleLine}
              style={{
                fontSize: typo.fontSize || (effectiveProps.level === 1 ? '2.5rem' : effectiveProps.level === 2 ? '1.75rem' : '1.25rem'),
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
                backgroundColor: typo.background ? undefined : effectiveStyle.backgroundColor,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius,
              }}
              className={`outline-none ${isSelected ? 'cursor-text' : ''}`}
            >
              {effectiveProps.text || 'Digite seu título aqui'}
            </div>
          );
        })()}

        {/* PARAGRAPH */}
        {component.type === 'paragraph' && (() => {
          const typo = getTypographyStyle('body');
          return (
            <div
              contentEditable={isSelected}
              suppressContentEditableWarning
              onBlur={(e) => handlePropUpdate('html', e.currentTarget.innerHTML)}
              style={{
                fontSize: typo.fontSize || '1rem',
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
                backgroundColor: typo.background ? undefined : effectiveStyle.backgroundColor,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius,
              }}
              className={`leading-relaxed outline-none ${isSelected ? 'cursor-text' : ''}`}
              dangerouslySetInnerHTML={{ __html: effectiveProps.html || '<p>Escreva seu texto aqui com acolhimento...</p>' }}
            />
          );
        })()}

        {/* LABEL */}
        {component.type === 'label' && (() => {
          const typo = getTypographyStyle('heading');
          const defaultLabelColor = page?.siteConfig?.theme?.primaryStart || page?.theme?.primaryStart || 'var(--brand-gradient-start)';
          return (
            <span
              contentEditable={isSelected}
              suppressContentEditableWarning
              onBlur={(e) => handlePropUpdate('text', e.currentTarget.innerText)}
              onKeyDown={handleKeyDownSingleLine}
              style={{
                fontSize: typo.fontSize || '0.875rem',
                fontWeight: typo.fontWeight || '600',
                lineHeight: typo.lineHeight,
                letterSpacing: typo.letterSpacing || '0.05em',
                textTransform: typo.textTransform || 'uppercase',
                color: effectiveStyle.color ? typo.color : defaultLabelColor,
                background: typo.background,
                WebkitBackgroundClip: typo.WebkitBackgroundClip as any,
                backgroundClip: typo.backgroundClip as any,
                marginBottom: typo.marginBottom,
                fontFamily: typo.fontFamily,
                backgroundColor: typo.background ? undefined : effectiveStyle.backgroundColor,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius,
              }}
              className={`tracking-wider block font-bold outline-none ${isSelected ? 'cursor-text' : ''}`}
            >
              {effectiveProps.text || 'SUBTÍTULO / ETIQUETA'}
            </span>
          );
        })()}

        {/* BUTTON */}
        {component.type === 'button' && (() => {
          const typo = getTypographyStyle('body');
          const hasCustomBg = !!effectiveStyle.backgroundColor;
          const hasCustomBorder = effectiveStyle.borderStyle && effectiveStyle.borderStyle !== 'none';
          const hasCustomRadius = !!effectiveStyle.borderRadius;
          const isWidthSet = !!effectiveStyle.width && effectiveStyle.width !== 'auto';
          const isHeightSet = !!effectiveStyle.height && effectiveStyle.height !== 'auto';

          const isOutline = effectiveProps.variant === 'outline';

          return (
            <button
              type="button"
              className={`px-5 py-2.5 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                isWidthSet ? 'w-full' : ''
              } ${
                isHeightSet ? 'h-full' : ''
              }`}
              style={{
                width: isWidthSet ? '100%' : undefined,
                height: isHeightSet ? '100%' : undefined,
                fontSize: typo.fontSize,
                fontWeight: typo.fontWeight,
                letterSpacing: typo.letterSpacing,
                textTransform: typo.textTransform,
                color: typo.color || (hasCustomBg
                  ? undefined
                  : isOutline
                  ? 'var(--brand-gradient-start)'
                  : 'var(--brand-contrast-color)'),
                fontFamily: typo.fontFamily,
                marginBottom: typo.marginBottom,
                background: hasCustomBg
                  ? effectiveStyle.backgroundColor
                  : isOutline
                  ? 'transparent'
                  : 'linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))',
                borderStyle: effectiveStyle.borderStyle || (hasCustomBorder || isOutline ? 'solid' : undefined),
                borderWidth: effectiveStyle.borderWidth || (isOutline ? '1px' : undefined),
                borderColor: effectiveStyle.borderColor || (isOutline ? 'var(--brand-gradient-start)' : undefined),
                borderRadius: effectiveStyle.borderRadius || '0px',
                boxShadow: effectiveStyle.boxShadow,
                opacity: effectiveStyle.opacity,
              }}
            >
              <span
                contentEditable={isSelected}
                suppressContentEditableWarning
                onBlur={(e) => handlePropUpdate('label', e.currentTarget.innerText)}
                onKeyDown={handleKeyDownSingleLine}
                className="outline-none"
              >
                {effectiveProps.label || 'Agendar Consulta'}
              </span>
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
              <IconComp
                size={iconSize}
                strokeWidth={strokeWidth}
                style={{ color: iconColor }}
              />
            </div>
          );
        })()}

        {/* BADGE */}
        {component.type === 'badge' && (() => {
          const typo = getTypographyStyle('body');
          const isWidthSet = !!effectiveStyle.width && effectiveStyle.width !== 'auto';
          const isHeightSet = !!effectiveStyle.height && effectiveStyle.height !== 'auto';
          const BadgeIconComp = effectiveProps.iconLeft ? getLucideIcon(effectiveProps.iconLeft) : Sparkles;
          const badgeColor = effectiveStyle.color || primaryStart;
          const badgeBg = effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 15%, transparent)`;
          const badgeRadius = effectiveStyle.borderRadius || (effectiveProps.rounded !== false ? '9999px' : '8px');

          return (
            <span
              className={`inline-flex items-center justify-center gap-1.5 text-[10px] font-bold px-3 py-1 uppercase tracking-wide transition-all ${
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
                color: typo.color || badgeColor,
                fontFamily: typo.fontFamily,
                marginBottom: typo.marginBottom,
                backgroundColor: badgeBg,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: effectiveStyle.borderColor,
                borderRadius: badgeRadius,
                boxShadow: effectiveStyle.boxShadow,
              }}
            >
              <BadgeIconComp className="w-3 h-3 pointer-events-none" />
              <span
                contentEditable={isSelected}
                suppressContentEditableWarning
                onBlur={(e) => handlePropUpdate('text', e.currentTarget.innerText)}
                onKeyDown={handleKeyDownSingleLine}
                className="outline-none"
              >
                {effectiveProps.text || 'Atendimento Online & Presencial'}
              </span>
            </span>
          );
        })()}

        {/* IMAGE */}
        {component.type === 'image' && (() => {
          const hasCustomRadius = !!effectiveStyle.borderRadius;
          const hasCustomBorder = effectiveStyle.borderStyle && effectiveStyle.borderStyle !== 'none';
          return (
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
                backgroundColor: effectiveStyle.backgroundColor,
              }}
            >
              {effectiveProps.src ? (
                <img
                  src={effectiveProps.src}
                  alt={effectiveProps.alt || ''}
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
        })()}

        {/* LIST */}
        {component.type === 'list' && (() => {
          const listType = effectiveProps.listType || 'check';
          const listIconColor = effectiveProps.iconColor || primaryStart;
          const listGap = effectiveProps.gap || '8px';

          const renderBullet = (item: any, idx: number) => {
            if (listType === 'number') {
              return (
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-extrabold pointer-events-none"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${listIconColor} 15%, transparent)`,
                    color: listIconColor,
                  }}
                >
                  {idx + 1}
                </span>
              );
            }
            if (listType === 'bullet') {
              return (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 pointer-events-none mt-1"
                  style={{ backgroundColor: listIconColor }}
                />
              );
            }
            if (listType === 'icon' && item.iconName) {
              const ItemIcon = getLucideIcon(item.iconName);
              return <ItemIcon size={14} className="shrink-0 pointer-events-none" style={{ color: listIconColor }} />;
            }
            // default: check
            const ItemIcon = item.iconName ? getLucideIcon(item.iconName) : Check;
            return (
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 font-bold pointer-events-none"
                style={{
                  backgroundColor: `color-mix(in srgb, ${listIconColor} 15%, transparent)`,
                  color: listIconColor,
                }}
              >
                <ItemIcon size={10} />
              </span>
            );
          };

          return (
            <ul className="text-xs" style={{ color: contrast, display: 'flex', flexDirection: 'column', gap: listGap }}>
              {(effectiveProps.items || []).map((item: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  {renderBullet(item, idx)}
                  <span
                    contentEditable={isSelected}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newItems = [...(effectiveProps.items || [])];
                      newItems[idx] = typeof item === 'object' ? { ...item, text: e.currentTarget.innerText } : e.currentTarget.innerText;
                      handlePropUpdate('items', newItems);
                    }}
                    className={`outline-none ${isSelected ? 'cursor-text' : ''}`}
                  >
                    {typeof item === 'object' ? item.text : item}
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
          const CardIconComp = getLucideIcon(effectiveProps.iconName || 'HeartHandshake');
          const cardIconColor = effectiveProps.iconColor || primaryStart;

          return (
            <div
              className={`p-5 space-y-2 transition-all ${
                isWidthSet ? 'w-full' : ''
              } ${
                isHeightSet ? 'h-full' : ''
              }`}
              style={{
                width: isWidthSet ? '100%' : undefined,
                height: isHeightSet ? '100%' : undefined,
                backgroundColor: effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 4%, ${siteBg})`,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius,
                boxShadow: effectiveStyle.boxShadow,
              }}
            >
              <div
                className="p-2 rounded-xl w-fit pointer-events-none"
                style={{
                  backgroundColor: `color-mix(in srgb, ${cardIconColor} 12%, transparent)`,
                  color: cardIconColor,
                }}
              >
                <CardIconComp className="w-4 h-4" />
              </div>
              <h4
                contentEditable={isSelected}
                suppressContentEditableWarning
                onBlur={(e) => handlePropUpdate('title', e.currentTarget.innerText)}
                onKeyDown={handleKeyDownSingleLine}
                className={`outline-none ${isSelected ? 'cursor-text' : ''}`}
                style={{
                  fontSize: effectiveProps.titleFontSize || '0.875rem',
                  fontWeight: effectiveProps.titleFontWeight || 'bold',
                  color: effectiveProps.titleColor || contrast,
                }}
              >
                {effectiveProps.title || 'Título do Card'}
              </h4>
              <p
                contentEditable={isSelected}
                suppressContentEditableWarning
                onBlur={(e) => handlePropUpdate('body', e.currentTarget.innerText)}
                className={`leading-relaxed outline-none opacity-80 ${isSelected ? 'cursor-text' : ''}`}
                style={{
                  fontSize: effectiveProps.bodyFontSize || '0.75rem',
                  color: effectiveProps.bodyColor || contrast,
                }}
              >
                {effectiveProps.body || 'Descrição do cartão informativo para o visitante...'}
              </p>
            </div>
          );
        })()}

        {/* FAQ ITEM */}
        {component.type === 'faq_item' && (() => {
          const isWidthSet = !!effectiveStyle.width && effectiveStyle.width !== 'auto';
          const isHeightSet = !!effectiveStyle.height && effectiveStyle.height !== 'auto';

          return (
            <div
              className={`p-4 space-y-2 transition-all ${
                isWidthSet ? 'w-full' : ''
              } ${
                isHeightSet ? 'h-full' : ''
              }`}
              style={{
                width: isWidthSet ? '100%' : undefined,
                height: isHeightSet ? '100%' : undefined,
                backgroundColor: effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 3%, ${siteBg})`,
                borderStyle: effectiveStyle.borderStyle,
                borderWidth: effectiveStyle.borderWidth,
                borderColor: effectiveStyle.borderColor,
                borderRadius: effectiveStyle.borderRadius,
                boxShadow: effectiveStyle.boxShadow,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  contentEditable={isSelected}
                  suppressContentEditableWarning
                  onBlur={(e) => handlePropUpdate('question', e.currentTarget.innerText)}
                  onKeyDown={handleKeyDownSingleLine}
                  className={`outline-none ${isSelected ? 'cursor-text' : ''}`}
                  style={{
                    fontSize: effectiveProps.questionFontSize || '0.75rem',
                    fontWeight: effectiveProps.questionFontWeight || 'bold',
                    color: effectiveProps.questionColor || contrast,
                  }}
                >
                  {effectiveProps.question || 'Como funciona a primeira sessão?'}
                </span>
                <ChevronDown className="w-4 h-4 opacity-60 pointer-events-none" style={{ color: effectiveProps.questionColor || contrast }} />
              </div>
              <p
                contentEditable={isSelected}
                suppressContentEditableWarning
                onBlur={(e) => handlePropUpdate('answer', e.currentTarget.innerText)}
                className={`leading-relaxed outline-none opacity-75 ${isSelected ? 'cursor-text' : ''}`}
                style={{
                  fontSize: effectiveProps.answerFontSize || '0.75rem',
                  color: effectiveProps.answerColor || contrast,
                }}
              >
                {effectiveProps.answer || 'Na primeira sessão realizamos uma escuta acolhedora...'}
              </p>
            </div>
          );
        })()}

        {/* TESTIMONIAL */}
        {component.type === 'testimonial' && (
          <div
            className="p-5 space-y-3 border border-[var(--surface-border)] rounded-2xl"
            style={{
              backgroundColor: effectiveStyle.backgroundColor || `color-mix(in srgb, ${primaryStart} 4%, ${siteBg})`,
            }}
          >
            <p
              contentEditable={isSelected}
              suppressContentEditableWarning
              onBlur={(e) => handlePropUpdate('quote', e.currentTarget.innerText)}
              className={`text-xs italic outline-none opacity-90 ${
                isSelected ? 'cursor-text' : ''
              }`}
              style={{ color: contrast }}
            >
              "{effectiveProps.quote || 'A terapia mudou minha visão de mundo...'}"
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs pointer-events-none"
                style={{
                  backgroundColor: `color-mix(in srgb, ${primaryStart} 20%, transparent)`,
                  color: primaryStart,
                }}
              >
                <User className="w-4 h-4" />
              </div>
              <div>
                <span
                  contentEditable={isSelected}
                  suppressContentEditableWarning
                  onBlur={(e) => handlePropUpdate('authorName', e.currentTarget.innerText)}
                  onKeyDown={handleKeyDownSingleLine}
                  className={`text-xs font-bold block outline-none ${
                    isSelected ? 'cursor-text' : ''
                  }`}
                  style={{ color: contrast }}
                >
                  {effectiveProps.authorName || 'M. S.'}
                </span>
                <span
                  contentEditable={isSelected}
                  suppressContentEditableWarning
                  onBlur={(e) => handlePropUpdate('authorTitle', e.currentTarget.innerText)}
                  onKeyDown={handleKeyDownSingleLine}
                  className={`text-[10px] block outline-none opacity-70 ${
                    isSelected ? 'cursor-text' : ''
                  }`}
                  style={{ color: contrast }}
                >
                  {effectiveProps.authorTitle || 'Paciente'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STAT COUNTER */}
        {component.type === 'stat_counter' && (() => {
          const StatIconComp = effectiveProps.iconName ? getLucideIcon(effectiveProps.iconName) : null;
          const statIconColor = effectiveProps.iconColor || primaryStart;
          return (
            <div className="text-center p-4 space-y-1">
              {StatIconComp && (
                <div className="flex justify-center mb-1 pointer-events-none">
                  <StatIconComp size={24} style={{ color: statIconColor }} />
                </div>
              )}
              <span
                contentEditable={isSelected}
                suppressContentEditableWarning
                onBlur={(e) => handlePropUpdate('value', e.currentTarget.innerText)}
                onKeyDown={handleKeyDownSingleLine}
                className={`font-extrabold font-mono block outline-none ${isSelected ? 'cursor-text' : ''}`}
                style={{
                  fontSize: effectiveProps.valueFontSize || '1.875rem',
                  fontWeight: effectiveProps.valueFontWeight || '800',
                  color: effectiveProps.valueColor || primaryStart,
                }}
              >
                {effectiveProps.value || '+500'}
              </span>
              <span
                contentEditable={isSelected}
                suppressContentEditableWarning
                onBlur={(e) => handlePropUpdate('label', e.currentTarget.innerText)}
                onKeyDown={handleKeyDownSingleLine}
                className={`font-semibold block outline-none opacity-80 ${isSelected ? 'cursor-text' : ''}`}
                style={{
                  fontSize: effectiveProps.labelFontSize || '0.75rem',
                  color: effectiveProps.labelColor || contrast,
                }}
              >
                {effectiveProps.label || 'Horas de Atendimento'}
              </span>
            </div>
          );
        })()}

        {/* DIVIDER */}
        {component.type === 'divider' && (
          <hr className="my-4 border-t border-[var(--surface-border)] w-full pointer-events-none" />
        )}

        {/* SPACER */}
        {component.type === 'spacer' && (
          <div style={{ height: effectiveProps.height || '32px' }} className="w-full pointer-events-none" />
        )}

        {/* LOGO */}
        {component.type === 'logo' && (
          <BrandLogo
            logoUrl={effectiveProps.mode === 'image' ? effectiveProps.imageUrl : (page?.logoUrl || page?.siteConfig?.theme?.logoUrl)}
            logoConfig={effectiveProps.mode === 'html' ? effectiveProps.htmlConfig : page?.siteConfig?.logoConfig}
            faviconUrl={page?.faviconUrl || page?.siteConfig?.theme?.faviconUrl}
            title={page?.title}
            fallbackText="Psicologia"
            primaryStart={page?.siteConfig?.theme?.primaryStart || 'var(--brand-gradient-start)'}
            primaryEnd={page?.siteConfig?.theme?.primaryEnd || 'var(--brand-gradient-end)'}
            contrastColor={page?.siteConfig?.theme?.contrast || '#FFFFFF'}
            fontHeading={page?.siteConfig?.theme?.fontHeading}
            size="md"
          />
        )}

        {/* FALLBACK */}
        {!['heading', 'paragraph', 'label', 'button', 'icon', 'badge', 'image', 'list', 'card', 'faq_item', 'testimonial', 'stat_counter', 'divider', 'spacer', 'logo'].includes(
          component.type
        ) && (
          <div className="p-3 rounded-xl border border-[var(--surface-border)] glass-sm text-xs font-semibold text-slate-500 flex items-center gap-2">
            <span>[{component.label || component.type}]</span>
          </div>
        )}
      </div>
    </div>
  );
}
