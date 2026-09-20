'use client';

import React, { useState } from 'react';
import { CanvasData, Section, Component, DivComponent, CarouselComponent } from '../types';
import { getComponentTypeLabel } from '../utils/canvasHelpers';
import {
  Layout,
  Square,
  Box,
  Eye,
  EyeOff,
  Trash2,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Type,
  Image as ImageIcon,
  Video as VideoIcon,
  MousePointerClick,
  Layers,
  HelpCircle,
  Sparkles,
  CreditCard,
  Minus,
  Share2
} from 'lucide-react';

interface LayersPanelProps {
  canvasData: CanvasData | null;
  selectedId: string | null;
  openLayerIds?: Set<string>;
  onSetOpenLayerIds?: (ids: Set<string>) => void;
  onSelectElement: (id: string | null, type?: any) => void;
  onRemoveSection: (id: string) => void;
  onRemoveComponent: (id: string) => void;
  onUpdateSection: (id: string, patch: Partial<Section>) => void;
  onUpdateComponent: (id: string, patch: Partial<Component>) => void;
  onMoveSection?: (fromIndex: number, toIndex: number) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
}

interface DraggedItem {
  id: string;
  type: 'section' | 'component';
  sectionIndex?: number;
}

interface DropTargetState {
  id: string;
  position: 'before' | 'inside' | 'after';
}

export function getAllContainerIds(canvas: CanvasData): string[] {
  const ids: string[] = [];
  const collectFromComp = (c: Component) => {
    if (c.type === 'div' || c.type === 'carousel') {
      ids.push(c.id);
      const children = (c as DivComponent | CarouselComponent).components || [];
      children.forEach(collectFromComp);
    }
  };
  canvas.sections.forEach((sec) => {
    ids.push(sec.id);
    sec.components.forEach(collectFromComp);
  });
  return ids;
}

export function findParentChainIds(canvas: CanvasData, targetId: string): string[] {
  const parents: string[] = [];

  function searchInComponents(components: Component[], currentParents: string[]): boolean {
    for (const comp of components) {
      if (comp.id === targetId) {
        parents.push(...currentParents);
        return true;
      }
      if (comp.type === 'div' || comp.type === 'carousel') {
        const children = (comp as DivComponent | CarouselComponent).components || [];
        if (searchInComponents(children, [...currentParents, comp.id])) {
          return true;
        }
      }
    }
    return false;
  }

  for (const sec of canvas.sections) {
    if (sec.id === targetId) {
      return [];
    }
    if (searchInComponents(sec.components, [sec.id])) {
      return parents;
    }
  }

  return [];
}

function getComponentIcon(type: string) {
  switch (type) {
    case 'section':
      return <Layout className="w-3.5 h-3.5 text-[var(--brand-gradient-start)] shrink-0" />;
    case 'div':
      return <Square className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
    case 'carousel':
      return <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
    case 'heading':
    case 'paragraph':
    case 'label':
      return <Type className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    case 'image':
      return <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    case 'video':
      return <VideoIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />;
    case 'button':
      return <MousePointerClick className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case 'faq_item':
      return <HelpCircle className="w-3.5 h-3.5 text-cyan-500 shrink-0" />;
    case 'testimonial':
    case 'stat_counter':
    case 'badge':
      return <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case 'social_links':
      return <Share2 className="w-3.5 h-3.5 text-pink-500 shrink-0" />;
    case 'card':
      return <CreditCard className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    case 'divider':
    case 'spacer':
      return <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    default:
      return <Box className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  }
}

export function LayersPanel({
  canvasData,
  selectedId,
  openLayerIds: propOpenIds,
  onSetOpenLayerIds: propSetOpenIds,
  onSelectElement,
  onRemoveSection,
  onRemoveComponent,
  onUpdateSection,
  onUpdateComponent,
  onMoveSection,
  onMoveElement,
  onMoveElementBeforeOrAfter,
}: LayersPanelProps) {
  // Estado local como fallback se não for passado via prop
  const [localOpenIds, setLocalOpenIds] = useState<Set<string>>(new Set());

  const openIds = propOpenIds ?? localOpenIds;
  const setOpenIds = propSetOpenIds ?? setLocalOpenIds;

  // Estado de Arrastar e Soltar (Drag and Drop)
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetState | null>(null);

  const toggleOpen = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(openIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setOpenIds(next);
  };

  const handleToggleExpandAll = () => {
    if (!canvasData) return;
    const allIds = getAllContainerIds(canvasData);
    const isAllOpen = allIds.length > 0 && allIds.every((id) => openIds.has(id));
    if (isAllOpen) {
      setOpenIds(new Set());
    } else {
      setOpenIds(new Set(allIds));
    }
  };

  if (!canvasData || canvasData.sections.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Nenhuma seção no canvas. Adicione uma seção na aba "+ Adicionar".
      </div>
    );
  }

  // Handlers de Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string, type: 'section' | 'component', sectionIndex?: number) => {
    e.stopPropagation();
    setDraggedItem({ id, type, sectionIndex });
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string, isContainer: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || draggedItem.id === targetId) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const height = rect.height;

    let position: 'before' | 'inside' | 'after';

    if (isContainer) {
      if (relativeY < height * 0.25) {
        position = 'before';
      } else if (relativeY > height * 0.75) {
        position = 'after';
      } else {
        position = 'inside';
      }
    } else {
      if (relativeY < height * 0.5) {
        position = 'before';
      } else {
        position = 'after';
      }
    }

    setDropTarget({ id: targetId, position });
  };

  const handleDragLeave = (e: React.DragEvent, targetId: string) => {
    e.stopPropagation();
    if (dropTarget?.id === targetId) {
      setDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string, targetType: 'section' | 'component', isContainer: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || !dropTarget || draggedItem.id === targetId) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    const { position } = dropTarget;

    // Caso 1: Arrastando uma Seção
    if (draggedItem.type === 'section') {
      if (targetType === 'section') {
        const fromIdx = canvasData.sections.findIndex((s) => s.id === draggedItem.id);
        const targetIdx = canvasData.sections.findIndex((s) => s.id === targetId);

        if (fromIdx !== -1 && targetIdx !== -1) {
          let toIdx = position === 'before' ? targetIdx : targetIdx + 1;
          if (fromIdx < toIdx) toIdx -= 1;
          onMoveSection?.(fromIdx, Math.max(0, Math.min(toIdx, canvasData.sections.length - 1)));
        }
      }
    } else {
      // Caso 2: Arrastando um Componente/Elemento
      if (position === 'inside' && isContainer) {
        onMoveElement?.(draggedItem.id, targetId);
      } else {
        onMoveElementBeforeOrAfter?.(draggedItem.id, targetId, position === 'before' ? 'before' : 'after');
      }
    }

    setDraggedItem(null);
    setDropTarget(null);
  };

  // Renderizador Recursivo de Componentes
  const renderComponentItem = (comp: Component, depth: number = 1) => {
    const isSelected = selectedId === comp.id;
    const isContainer = comp.type === 'div' || comp.type === 'carousel';
    const children: Component[] = isContainer
      ? ((comp as DivComponent | CarouselComponent).components || [])
      : [];
    const hasChildren = children.length > 0;
    const isOpen = openIds.has(comp.id);

    const isTargetingThis = dropTarget?.id === comp.id;
    const dropPosition = isTargetingThis ? dropTarget.position : null;

    return (
      <div key={comp.id} className="space-y-1">
        {/* Item do Componente */}
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, comp.id, 'component')}
          onDragOver={(e) => handleDragOver(e, comp.id, isContainer)}
          onDragLeave={(e) => handleDragLeave(e, comp.id)}
          onDrop={(e) => handleDrop(e, comp.id, 'component', isContainer)}
          onClick={() => onSelectElement(comp.id, comp.type)}
          className={`relative p-1.5 rounded-lg border flex items-center justify-between text-xs transition-all cursor-pointer ${
            isSelected
              ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10 font-semibold'
              : 'border-[var(--surface-border)] glass-sm hover:border-slate-400'
          } ${draggedItem?.id === comp.id ? 'opacity-40 border-dashed' : ''} ${
            dropPosition === 'inside' ? 'ring-2 ring-purple-500 bg-purple-500/10' : ''
          }`}
        >
          {/* Indicador de Drop (Acima) */}
          {dropPosition === 'before' && (
            <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[var(--brand-gradient-start)] z-10 rounded-full" />
          )}

          <div className="flex items-center gap-1 min-w-0 flex-1">
            <GripVertical className="w-3 h-3 text-slate-400 cursor-grab active:cursor-grabbing shrink-0 opacity-40 hover:opacity-100" />

            {/* Accordion Toggle para Containers */}
            {isContainer ? (
              <button
                type="button"
                onClick={(e) => toggleOpen(comp.id, e)}
                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                title={isOpen ? 'Recolher' : 'Expandir'}
              >
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </button>
            ) : (
              <div className="w-4 shrink-0" />
            )}

            {getComponentIcon(comp.type)}

            <span className="truncate text-slate-800 dark:text-slate-200 font-medium text-[11px]">
              {comp.label || getComponentTypeLabel(comp.type)}
            </span>
          </div>

          {/* Ações do Componente */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateComponent(comp.id, { hidden: !comp.hidden });
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title={comp.hidden ? 'Mostrar Elemento' : 'Ocultar Elemento'}
            >
              {comp.hidden ? <EyeOff className="w-3 h-3 text-amber-500" /> : <Eye className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveComponent(comp.id);
              }}
              className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
              title="Excluir Elemento"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {/* Indicador de Drop (Abaixo) */}
          {dropPosition === 'after' && (
            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--brand-gradient-start)] z-10 rounded-full" />
          )}
        </div>

        {/* Filhos do Container (quando expandido) */}
        {hasChildren && isOpen && (
          <div className="pl-3 space-y-1 border-l-2 border-[var(--surface-border)] ml-3">
            {children.map((child) => renderComponentItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const allContainerIds = canvasData ? getAllContainerIds(canvasData) : [];
  const isAllOpen = allContainerIds.length > 0 && allContainerIds.every((id) => openIds.has(id));

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between px-2 pb-1">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Estrutura de Camadas (Layers)
        </h4>
        <button
          type="button"
          onClick={handleToggleExpandAll}
          className="text-[10px] font-bold text-[var(--brand-gradient-start)] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          title={isAllOpen ? 'Recolher todas as camadas' : 'Expandir todas as camadas'}
        >
          {isAllOpen ? (
            <>
              <ChevronDown className="w-3 h-3 text-[var(--brand-gradient-start)]" />
              <span>Recolher Tudo</span>
            </>
          ) : (
            <>
              <ChevronRight className="w-3 h-3 text-[var(--brand-gradient-start)]" />
              <span>Expandir Tudo</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-1.5">
        {canvasData.sections.map((sec, secIdx) => {
          const isSecSelected = selectedId === sec.id;
          const isSecOpen = openIds.has(sec.id);
          const hasSecComponents = sec.components.length > 0;

          const isTargetingThisSec = dropTarget?.id === sec.id;
          const dropPositionSec = isTargetingThisSec ? dropTarget.position : null;

          return (
            <div key={sec.id} className="space-y-1">
              {/* Item da Seção (Nível 1) */}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, sec.id, 'section', secIdx)}
                onDragOver={(e) => handleDragOver(e, sec.id, true)}
                onDragLeave={(e) => handleDragLeave(e, sec.id)}
                onDrop={(e) => handleDrop(e, sec.id, 'section', true)}
                onClick={() => onSelectElement(sec.id, 'section')}
                className={`relative p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-xs ${
                  isSecSelected
                    ? 'border-[var(--brand-gradient-start)] ring-1 ring-[var(--brand-gradient-start)]/30 glass-md font-bold'
                    : 'border-[var(--surface-border)] glass-sm hover:border-slate-400'
                } ${draggedItem?.id === sec.id ? 'opacity-40 border-dashed' : ''} ${
                  dropPositionSec === 'inside' ? 'ring-2 ring-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/10' : ''
                }`}
              >
                {/* Indicador de Drop (Acima) */}
                {dropPositionSec === 'before' && (
                  <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[var(--brand-gradient-start)] z-10 rounded-full" />
                )}

                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab active:cursor-grabbing shrink-0" />

                  {/* Accordion Toggle da Seção */}
                  <button
                    type="button"
                    onClick={(e) => toggleOpen(sec.id, e)}
                    className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                    title={isSecOpen ? 'Recolher Seção' : 'Expandir Seção'}
                  >
                    {isSecOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </button>

                  <Layout className="w-3.5 h-3.5 text-[var(--brand-gradient-start)] shrink-0" />
                  <span className="truncate text-slate-800 dark:text-slate-200 font-semibold">
                    {sec.label || `Seção ${secIdx + 1}`}
                  </span>
                </div>

                {/* Ações da Seção */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateSection(sec.id, { hidden: !sec.hidden });
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={sec.hidden ? 'Mostrar Seção' : 'Ocultar Seção'}
                  >
                    {sec.hidden ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSection(sec.id);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                    title="Excluir Seção"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Indicador de Drop (Abaixo) */}
                {dropPositionSec === 'after' && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--brand-gradient-start)] z-10 rounded-full" />
                )}
              </div>

              {/* Filhos da Seção (Divs e Componentes Atômicos) */}
              {hasSecComponents && isSecOpen && (
                <div className="pl-4 space-y-1 border-l-2 border-[var(--surface-border)] ml-3">
                  {sec.components.map((comp) => renderComponentItem(comp, 1))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
