import React, { useState } from 'react';
import { Section, ViewportMode } from '../types';
import { ComponentWrapper } from './ComponentWrapper';
import { Layout, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { createDefaultDiv, createDefaultComponent } from '../constants';

interface SectionWrapperProps {
  section: Section;
  index: number;
  selectedId: string | null;
  viewportMode?: ViewportMode;
  page?: any;
  onSelect: (id: string, type: any) => void;
  onRemoveSection: (id: string) => void;
  onRemoveComponent: (id: string) => void;
  onUpdateSection: (id: string, patch: Partial<Section>) => void;
  onUpdateComponent?: (id: string, patch: any) => void;
  onAddComponent: (parentId: string, comp: any) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onContextMenu?: (e: React.MouseEvent, id: string, type: string) => void;
}

export function SectionWrapper({
  section,
  index,
  selectedId,
  viewportMode = 'desktop',
  page,
  onSelect,
  onRemoveSection,
  onRemoveComponent,
  onUpdateSection,
  onUpdateComponent,
  onAddComponent,
  onMoveElement,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onContextMenu,
}: SectionWrapperProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSelfHovered, setIsSelfHovered] = useState(false);
  const isSelected = selectedId === section.id;
  const isMobile = viewportMode === 'mobile';
  const isHidden = isMobile
    ? (section.mobile?.hidden ?? section.hidden ?? false)
    : (section.hidden ?? false);

  const layout = isMobile
    ? { ...section.layout, ...(section.mobile || {}) }
    : section.layout;
  const border = isMobile
    ? { ...(section.border || {}), ...(section.mobile?.border || {}) }
    : (section.border || {});

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, section.id, 'section');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);

      // CASO A: MOVER ELEMENTO EXISTENTE
      if (data.isExistingElement && data.elementId) {
        if (data.elementId === section.id) return;
        if (onMoveElement) {
          onMoveElement(data.elementId, section.id);
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
        onAddComponent(section.id, newDiv);
      } else if (itemType) {
        const newComp = createDefaultComponent(itemType);
        onAddComponent(section.id, newComp);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <section
      onClick={(e) => {
        e.stopPropagation();
        onSelect(section.id, 'section');
      }}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setIsSelfHovered(true)}
      onMouseLeave={() => setIsSelfHovered(false)}
      className={`relative min-h-[120px] p-6 transition-all duration-200 ${
        isHidden ? 'opacity-40 outline-dashed outline-1 outline-amber-400' : ''
      } ${
        isDragOver
          ? 'outline outline-2 outline-blue-500 bg-blue-500/10 shadow-xl ring-2 ring-blue-400/50'
          : isSelected
          ? 'outline outline-2 outline-[var(--brand-gradient-start)] -outline-offset-2'
          : isSelfHovered
          ? 'outline outline-1 outline-slate-300 dark:outline-zinc-700 -outline-offset-1'
          : ''
      }`}
      style={{
        paddingTop: layout.paddingTop || '60px',
        paddingBottom: layout.paddingBottom || '60px',
        paddingLeft: layout.paddingLeft || '24px',
        paddingRight: layout.paddingRight || '24px',
        marginTop: layout.marginTop || '0px',
        marginBottom: layout.marginBottom || '0px',
        minHeight: layout.minHeight || '120px',
        backgroundColor: section.background?.color || 'transparent',
        background: section.background?.gradientString || section.background?.color || 'transparent',
        backgroundImage: section.background?.type === 'image' && section.background?.imageUrl
          ? `linear-gradient(${section.background.imageOverlayColor || 'transparent'}, ${section.background.imageOverlayColor || 'transparent'}), url(${section.background.imageUrl})`
          : section.background?.gradientString
          ? section.background.gradientString
          : undefined,
        backgroundSize: section.background?.imageSize || 'cover',
        backdropFilter: section.background?.backdropBlur && section.background.backdropBlur !== '0px'
          ? `blur(${section.background.backdropBlur})`
          : undefined,
        WebkitBackdropFilter: section.background?.backdropBlur && section.background.backdropBlur !== '0px'
          ? `blur(${section.background.backdropBlur})`
          : undefined,
        borderStyle: border.borderStyle || (section.border?.style as any) || 'none',
        borderWidth: border.borderWidth || section.border?.borderWidth || section.border?.topWidth || '1px',
        borderColor: border.borderColor || section.border?.color || 'transparent',
        borderRadius: border.borderRadius || section.border?.radiusTopLeft || '0px',
      }}
    >
      {/* Indicator Badge em Drag Over */}
      {isDragOver && (
        <div className="absolute -top-3.5 right-4 flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-30 select-none">
          <Plus className="w-3.5 h-3.5" />
          <span>Soltar elemento nesta Seção</span>
        </div>
      )}

      {/* Action Bar Flutuante da Seção (Apenas ao Selecionar ou no Hover) */}
      <div className={`absolute -top-3.5 left-4 flex items-center gap-2 brand-modal border border-[var(--surface-border)] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-30 select-none transition-opacity ${
        isSelected || isSelfHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <Layout className="w-3 h-3 text-[var(--brand-gradient-start)]" />
        <span>{index + 1}. {section.label || 'Seção'}</span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const newDiv = createDefaultDiv('Novo Container');
            onAddComponent(section.id, newDiv);
          }}
          className="ml-2 hover:text-emerald-300 font-extrabold flex items-center gap-1 cursor-pointer"
          title="Adicionar Container Div"
        >
          <Plus className="w-3 h-3" />
          + Div
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isMobile) {
              onUpdateSection(section.id, {
                mobile: {
                  ...(section.mobile || {}),
                  hidden: !isHidden,
                },
              });
            } else {
              onUpdateSection(section.id, { hidden: !isHidden });
            }
          }}
          className="hover:text-amber-300 cursor-pointer ml-1"
          title={isHidden ? 'Mostrar Seção' : 'Ocultar Seção'}
        >
          {isHidden ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3" />}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveSection(section.id);
          }}
          className="hover:text-red-400 cursor-pointer ml-1"
          title="Excluir Seção"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Conteúdo da Seção (Render dos Filhos) */}
      <div
        className="w-full mx-auto min-h-[60px]"
        style={{
          maxWidth: layout.fullWidth ? '100%' : (layout.maxContentWidth || '1200px'),
        }}
      >
        {section.components.length > 0 ? (
          <div
            className="flex w-full min-h-[60px]"
            style={{
              flexDirection: layout.flexDirection || 'row',
              flexWrap: layout.flexWrap || 'nowrap',
              gap: layout.gap || '24px',
              alignItems: layout.alignItems || 'flex-start',
              justifyContent: layout.justifyContent || 'flex-start',
              textAlign: layout.textAlign || 'inherit',
            }}
          >
            {section.components.map((comp) => (
              <ComponentWrapper
                key={comp.id}
                component={comp}
                selectedId={selectedId}
                viewportMode={viewportMode}
                page={page}
                onSelect={onSelect}
                onRemove={onRemoveComponent}
                onUpdateComponent={onUpdateComponent}
                onAddComponent={onAddComponent}
                onMoveElement={onMoveElement}
                onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
                onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center border-2 border-dashed border-[var(--surface-border)] rounded-2xl text-xs text-slate-400 font-semibold glass-sm flex flex-col items-center justify-center gap-1 hover:border-[var(--brand-gradient-start)] transition-colors select-none">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
              <Plus className="w-4 h-4 text-blue-500" />
              Seção Vazia
            </span>
            <span className="text-[10px] text-slate-400">
              Arraste elementos da barra lateral ou solte aqui para preencher
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
