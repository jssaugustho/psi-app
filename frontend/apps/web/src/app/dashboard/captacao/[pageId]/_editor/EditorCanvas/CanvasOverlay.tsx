'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CanvasData,
  Section,
  Component,
  ContextMenu,
  ContextMenuState,
  getComponentTypeLabel,
  createSectionFromPreset,
  createDefaultDiv,
  createDefaultCarousel,
  createDefaultComponent,
  isDescendantOf,
} from '@psi/canvas-renderer';
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Layers,
  Trash2,
  Paintbrush,
  Sparkles,
  Plus,
  GripVertical,
  MoreVertical,
} from 'lucide-react';
import { findElementInCanvas } from '../utils/canvasHelpers';

export interface TargetBox {
  nodeId: string;
  type: string;
  label: string;
  isContainer: boolean;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface CanvasOverlayProps {
  canvasData: CanvasData | null;
  selectedId: string | null;
  selectedType: string | null;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onSelectElement: (id: string | null, type?: any) => void;
  onRemoveSection: (id: string) => void;
  onRemoveComponent: (id: string) => void;
  onUpdateSection?: (id: string, patch: Partial<Section>) => void;
  onUpdateComponent?: (id: string, patch: any) => void;
  onAddComponent?: (parentId: string, comp: any) => void;
  onAddCustomSection?: (section: Section) => void;
  onMoveSection?: (fromIndex: number, toIndex: number) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onDuplicateElement?: (id: string) => void;
  onCopyElement?: (id: string) => void;
  onPasteElement?: (id: string) => void;
  onPasteStyleElement?: (id: string) => void;
  onSaveAsGlobal?: (id: string) => void;
  copiedElement?: any;
  canPaste?: boolean;
  isDragging?: boolean;
}

export function CanvasOverlay({
  canvasData,
  selectedId,
  selectedType,
  iframeRef,
  onSelectElement,
  onRemoveSection,
  onRemoveComponent,
  onUpdateSection,
  onUpdateComponent,
  onAddComponent,
  onAddCustomSection,
  onMoveSection,
  onMoveElement,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onDuplicateElement,
  onCopyElement,
  onPasteElement,
  onPasteStyleElement,
  onSaveAsGlobal,
  copiedElement,
  canPaste = false,
  isDragging = false,
}: CanvasOverlayProps) {
  const [scrollPos, setScrollPos] = useState({ scrollTop: 0, scrollLeft: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [targetsCache, setTargetsCache] = useState<TargetBox[]>([]);
  const [dropIndicator, setDropIndicator] = useState<{
    targetId: string;
    position: 'before' | 'after' | 'inside';
    top: number;
    left: number;
    width: number;
    height?: number;
  } | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    targetId: null,
    targetType: null,
  });

  // Varredura de caixas delimitadoras em memória (Scanned on-demand via requestAnimationFrame)
  const scanTargetsCache = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    const win = iframe.contentWindow;
    if (!doc || !win) return;

    window.requestAnimationFrame(() => {
      const sTop = win.scrollY || doc.documentElement.scrollTop || 0;
      const sLeft = win.scrollX || doc.documentElement.scrollLeft || 0;

      const elements = doc.querySelectorAll('[data-node-id]');
      const cache: TargetBox[] = [];

      elements.forEach((el) => {
        const nodeId = el.getAttribute('data-node-id');
        const isContainer = el.getAttribute('data-is-container') === 'true';
        if (!nodeId) return;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        let label = 'Elemento';
        if (canvasData) {
          const found = findElementInCanvas(canvasData, nodeId);
          if (found) {
            label = (found.element as any).label || getComponentTypeLabel(found.element.type);
          }
        }

        cache.push({
          nodeId,
          type: el.tagName.toLowerCase(),
          label,
          isContainer,
          top: rect.top + sTop,
          left: rect.left + sLeft,
          width: rect.width,
          height: rect.height,
        });
      });

      setTargetsCache(cache);
    });
  }, [iframeRef, canvasData]);

  const isHoveringBadgeRef = useRef<boolean>(false);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastValidDropTargetRef = useRef<any>(null);

  // Escuta telemetria do iframe (postMessage)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;

      if (e.data.type === 'CANVAS_SCROLLED' && e.data.payload) {
        setScrollPos({
          scrollTop: e.data.payload.scrollTop || 0,
          scrollLeft: e.data.payload.scrollLeft || 0,
        });
        setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      }

      if (e.data.type === 'CANVAS_ELEMENT_HOVERED' && e.data.payload) {
        const newHoveredId = e.data.payload.nodeId || null;

        if (isHoveringBadgeRef.current && !newHoveredId) {
          return;
        }

        if (hoveredNodeId && newHoveredId && canvasData) {
          const currentHBox = targetsCache.find((b) => b.nodeId === hoveredNodeId);
          if (currentHBox && isDescendantOf(canvasData, hoveredNodeId, newHoveredId)) {
            const { x: cursorX, y: cursorY } = mousePosRef.current;
            const isNearChildBadge =
              cursorY >= currentHBox.top - 36 &&
              cursorY <= currentHBox.top + currentHBox.height + 8 &&
              cursorX >= currentHBox.left - 16 &&
              cursorX <= currentHBox.left + currentHBox.width + 16;

            if (isNearChildBadge) {
              return;
            }
          }
        }

        setHoveredNodeId(newHoveredId);
      }

      if (e.data.type === 'CANVAS_ELEMENT_CLICKED' && e.data.payload) {
        onSelectElement(e.data.payload.nodeId || null, e.data.payload.type);
        setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      }

      if (e.data.type === 'CANVAS_CONTEXT_MENU' && e.data.payload) {
        if (e.data.payload.nodeId) {
          onSelectElement(e.data.payload.nodeId, e.data.payload.type);
          setContextMenu({
            isOpen: true,
            x: e.data.payload.x,
            y: e.data.payload.y,
            targetId: e.data.payload.nodeId,
            targetType: e.data.payload.type,
          });
        }
      }

      if (e.data.type === 'CANVAS_DRAG_OVER' && e.data.payload) {
        setDropIndicator(e.data.payload);
        lastValidDropTargetRef.current = e.data.payload;
      }

      if (e.data.type === 'CANVAS_DRAG_LEAVE') {
        setDropIndicator(null);
      }

      if (e.data.type === 'CANVAS_DROP' && e.data.payload?.raw) {
        try {
          const data = JSON.parse(e.data.payload.raw);
          const dropTarget = dropIndicator || lastValidDropTargetRef.current;
          setDropIndicator(null);
          lastValidDropTargetRef.current = null;

          // CASO A: MOVER ELEMENTO EXISTENTE
          if (data.isExistingElement && data.elementId) {
            if (dropTarget?.targetId) {
              if (dropTarget.position === 'before' || dropTarget.position === 'after') {
                if (onMoveElementBeforeOrAfter) {
                  onMoveElementBeforeOrAfter(data.elementId, dropTarget.targetId, dropTarget.position);
                }
              } else if (onMoveElement) {
                onMoveElement(data.elementId, dropTarget.targetId);
              }
            }
            return;
          }

          // CASO B: INSERIR NOVO ELEMENTO DA SIDEBAR
          if (data.itemType) {
            if (data.itemType === 'section') {
              const newSec = createSectionFromPreset(data.preset);
              if (onAddCustomSection) {
                onAddCustomSection(newSec);
                onSelectElement(newSec.id, 'section');
              }
              return;
            }

            let newComp: any = null;
            if (data.itemType === 'div') {
              newComp = createDefaultDiv('Container (Div)');
            } else if (data.itemType === 'carousel') {
              newComp = createDefaultCarousel();
            } else {
              newComp = createDefaultComponent(data.itemType, data.preset);
            }

            if (newComp) {
              if (dropTarget?.targetId && (dropTarget.position === 'before' || dropTarget.position === 'after')) {
                if (onAddComponentBeforeOrAfter) {
                  onAddComponentBeforeOrAfter(dropTarget.targetId, newComp, dropTarget.position);
                }
              } else if (dropTarget?.targetId && onAddComponent) {
                onAddComponent(dropTarget.targetId, newComp);
              } else if (canvasData && canvasData.sections.length > 0 && onAddComponent) {
                onAddComponent(canvasData.sections[0].id, newComp);
              }
              if (newComp) {
                onSelectElement(newComp.id, newComp.type);
              }
            }
          }
        } catch (err) {
          console.error('Erro ao processar drop no overlay:', err);
        }
      }

      if (e.data.type === 'TEXT_EDIT_COMMITTED' && e.data.payload) {
        const { nodeId, text, html } = e.data.payload;
        if (nodeId && onUpdateComponent) {
          const found = canvasData ? findElementInCanvas(canvasData, nodeId) : null;
          const currentProps = (found?.element as any)?.props || {};

          const updatedProps = { ...currentProps };
          if ('text' in currentProps || 'content' in currentProps || Object.keys(currentProps).length === 0) {
            updatedProps.text = text;
            updatedProps.content = text;
          } else if ('title' in currentProps) {
            updatedProps.title = text;
          } else if ('label' in currentProps) {
            updatedProps.label = text;
          } else if ('quote' in currentProps) {
            updatedProps.quote = text;
          } else if ('question' in currentProps) {
            updatedProps.question = text;
          } else {
            updatedProps.text = text;
          }

          if (html) {
            updatedProps.html = html;
          }

          onUpdateComponent(nodeId, { props: updatedProps });
        }
      }

      if (e.data.type === 'CANVAS_LAYOUT_MUTATED') {
        scanTargetsCache();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [
    scanTargetsCache,
    onSelectElement,
    onAddComponent,
    onAddCustomSection,
    onMoveElement,
    onMoveElementBeforeOrAfter,
    onAddComponentBeforeOrAfter,
    dropIndicator,
    canvasData,
  ]);

  // Varre caixas quando o canvasData ou o elemento selecionado mudar com polling de redundância
  useEffect(() => {
    scanTargetsCache();
    const interval = setInterval(() => {
      scanTargetsCache();
    }, 500);
    return () => clearInterval(interval);
  }, [canvasData, selectedId, scanTargetsCache]);

  // Encontra a caixa do elemento selecionado e hover no cache
  const selectedBox = targetsCache.find((b) => b.nodeId === selectedId);
  const hoveredBox = targetsCache.find((b) => b.nodeId === hoveredNodeId && b.nodeId !== selectedId);

  // Manipulador de clique no Overlay do Pai para selecionar elementos
  const handleOverlayPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (contextMenu.isOpen) {
      setContextMenu((prev: ContextMenuState) => ({ ...prev, isOpen: false }));
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeRect = iframe.getBoundingClientRect();
    const cursorX = e.clientX - iframeRect.left + scrollPos.scrollLeft;
    const cursorY = e.clientY - iframeRect.top + scrollPos.scrollTop;

    // Encontra o elemento mais profundo sob o cursor
    const hit = [...targetsCache]
      .reverse()
      .find((box) => cursorX >= box.left && cursorX <= box.left + box.width && cursorY >= box.top && cursorY <= box.top + box.height);

    if (hit) {
      onSelectElement(hit.nodeId);
    } else {
      onSelectElement(null);
    }
  };

  // Manipulador de hover sob o cursor no Overlay
  const handleOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging || isHoveringBadgeRef.current) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeRect = iframe.getBoundingClientRect();
    const cursorX = e.clientX - iframeRect.left + scrollPos.scrollLeft;
    const cursorY = e.clientY - iframeRect.top + scrollPos.scrollTop;

    mousePosRef.current = { x: cursorX, y: cursorY };

    if (hoveredNodeId && canvasData) {
      const currentHBox = targetsCache.find((b) => b.nodeId === hoveredNodeId);
      if (currentHBox) {
        const isNearChildBadge =
          cursorY >= currentHBox.top - 36 &&
          cursorY <= currentHBox.top + currentHBox.height + 8 &&
          cursorX >= currentHBox.left - 16 &&
          cursorX <= currentHBox.left + currentHBox.width + 16;

        if (isNearChildBadge) {
          return;
        }
      }
    }

    const hit = [...targetsCache]
      .reverse()
      .find((box) => cursorX >= box.left && cursorX <= box.left + box.width && cursorY >= box.top && cursorY <= box.top + box.height);

    if (hit) {
      setHoveredNodeId(hit.nodeId);
    } else {
      setHoveredNodeId(null);
    }
  };

  // Manipulador de Botão Direito (Context Menu)
  const handleOverlayContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeRect = iframe.getBoundingClientRect();
    const cursorX = e.clientX - iframeRect.left + scrollPos.scrollLeft;
    const cursorY = e.clientY - iframeRect.top + scrollPos.scrollTop;

    const hit = [...targetsCache]
      .reverse()
      .find((box) => cursorX >= box.left && cursorX <= box.left + box.width && cursorY >= box.top && cursorY <= box.top + box.height);

    if (hit) {
      onSelectElement(hit.nodeId);
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        targetId: hit.nodeId,
        targetType: hit.type,
      });
    }
  };

  return (
    <div
      id="canvas-overlay"
      onPointerDown={handleOverlayPointerDown}
      onPointerMove={handleOverlayPointerMove}
      onContextMenu={handleOverlayContextMenu}
      className="absolute inset-0 z-10 select-none overflow-hidden"
      style={{
        pointerEvents: isDragging ? 'auto' : 'none',
      }}
    >
      {/* Contêiner de Translação Hardware translate3d espelhando o scroll do iframe sem lag */}
      <div
        className="w-full h-full relative"
        style={{
          transform: `translate3d(${-scrollPos.scrollLeft}px, ${-scrollPos.scrollTop}px, 0)`,
        }}
      >
        {/* 1. MOLDURA DE HOVER (LINHA AZUL + BADGE GLUED COM GRIP HANDLE) */}
        {hoveredBox && (() => {
          const isHoverTopSpaceAvailable = (hoveredBox.top - scrollPos.scrollTop) >= 28;
          return (
            <div
              className="absolute border-2 border-blue-500 pointer-events-none rounded-none transition-all duration-75 z-20"
              style={{
                top: `${hoveredBox.top}px`,
                left: `${hoveredBox.left}px`,
                width: `${hoveredBox.width}px`,
                height: `${hoveredBox.height}px`,
              }}
            >
              <div
                draggable
                onMouseEnter={() => {
                  isHoveringBadgeRef.current = true;
                }}
                onMouseLeave={() => {
                  isHoveringBadgeRef.current = false;
                }}
                onPointerMove={(e) => e.stopPropagation()}
                onDragStart={(e) => {
                  isHoveringBadgeRef.current = false;
                  e.stopPropagation();
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({ isExistingElement: true, elementId: hoveredBox.nodeId })
                  );
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(hoveredBox.nodeId, hoveredBox.type);
                }}
                className={`absolute ${
                  isHoverTopSpaceAvailable ? 'top-0 -translate-y-full rounded-t-md' : 'bottom-0 translate-y-full rounded-b-md'
                } left-[-2px] pointer-events-auto flex items-center p-1 bg-blue-600 text-white shadow-md select-none z-30 cursor-grab active:cursor-grabbing`}
                title={`Mover (${hoveredBox.label})`}
              >
                <GripVertical className="w-3.5 h-3.5 text-blue-100" />
              </div>
            </div>
          );
        })()}

        {/* 2. MOLDURA DE SELEÇÃO + TOOLBAR COLADA DE AÇÕES */}
        {selectedBox && (() => {
          const isSelectTopSpaceAvailable = (selectedBox.top - scrollPos.scrollTop) >= 32;
          return (
            <div
              className="absolute border-2 border-purple-600 pointer-events-none rounded-b-sm z-30 shadow-xs"
              style={{
                top: `${selectedBox.top}px`,
                left: `${selectedBox.left}px`,
                width: `${selectedBox.width}px`,
                height: `${selectedBox.height}px`,
              }}
            >
              {/* Toolbar Colada na Borda (Fundo Roxo com Ícones Brancos) */}
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className={`absolute ${
                  isSelectTopSpaceAvailable ? 'top-0 -translate-y-full rounded-t-lg' : 'bottom-0 translate-y-full rounded-b-lg'
                } left-[-2px] pointer-events-auto flex items-center gap-1 p-1 bg-purple-600 text-white shadow-2xl z-40 animate-fade-in select-none`}
              >
                {/* Alça de Arraste Drag & Drop */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({ isExistingElement: true, elementId: selectedBox.nodeId })
                    );
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  className="flex items-center p-1 hover:bg-purple-700/80 rounded-md cursor-grab active:cursor-grabbing"
                  title={`Mover (${selectedBox.label})`}
                >
                  <GripVertical className="w-3.5 h-3.5 text-purple-200" />
                </div>

                <div className="w-[1px] h-3.5 bg-purple-400/60 mx-0.5" />

                {/* Botão Duplicar */}
                {onDuplicateElement && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateElement(selectedBox.nodeId);
                    }}
                    className="p-1 rounded-md hover:bg-purple-700/80 text-purple-100 hover:text-white transition-colors cursor-pointer"
                    title="Duplicar Elemento (Ctrl+D)"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Botão Copiar */}
                {onCopyElement && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyElement(selectedBox.nodeId);
                    }}
                    className="p-1 rounded-md hover:bg-purple-700/80 text-purple-100 hover:text-white transition-colors cursor-pointer"
                    title="Copiar Elemento (Ctrl+C)"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Botão Colar Estilo */}
                {onPasteStyleElement && copiedElement && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPasteStyleElement(selectedBox.nodeId);
                    }}
                    className="p-1 rounded-md hover:bg-purple-700/80 text-purple-200 hover:text-white transition-colors cursor-pointer"
                    title="Colar Apenas Estilo CSS (Ctrl+Shift+V)"
                  >
                    <Paintbrush className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Botão Salvar como Global */}
                {onSaveAsGlobal && selectedBox.type !== 'section' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSaveAsGlobal(selectedBox.nodeId);
                    }}
                    className="p-1 rounded-md hover:bg-purple-700/80 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                    title="Salvar como Elemento Global Reutilizável"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="w-[1px] h-3.5 bg-purple-400/60 mx-0.5" />

                {/* Botão Excluir */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedBox.type === 'section') {
                      onRemoveSection(selectedBox.nodeId);
                    } else {
                      onRemoveComponent(selectedBox.nodeId);
                    }
                    onSelectElement(null);
                  }}
                  className="p-1 rounded-md hover:bg-red-500/30 text-red-200 hover:text-red-100 transition-colors cursor-pointer"
                  title="Excluir Elemento (Delete)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* 3. LINHA / CAIXA AZUL DE INDICADOR DE DRAG & DROP */}
        {dropIndicator && dropIndicator.position === 'inside' ? (
          <div
            className="absolute border-2 border-dashed border-blue-600 bg-blue-500/20 rounded-md z-50 pointer-events-none transition-all duration-75 animate-pulse flex items-center justify-center"
            style={{
              top: `${dropIndicator.top}px`,
              left: `${dropIndicator.left}px`,
              width: `${dropIndicator.width}px`,
              height: `${dropIndicator.height}px`,
            }}
          >
            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold font-mono rounded shadow-md uppercase tracking-wider">
              Soltar dentro do Container
            </span>
          </div>
        ) : dropIndicator ? (
          <div
            className="absolute bg-blue-600 rounded-full shadow-lg z-50 pointer-events-none transition-all duration-75 animate-pulse"
            style={{
              top: `${dropIndicator.top}px`,
              left: `${dropIndicator.left}px`,
              width: `${dropIndicator.width}px`,
              height: `${dropIndicator.height || 4}px`,
            }}
          />
        ) : null}
      </div>

      {/* 4. MENU DE CONTEXTO FLUTUANTE (BOTÃO DIREITO NO PARENT) */}
      <ContextMenu
        menuState={contextMenu}
        onClose={() => setContextMenu((prev: ContextMenuState) => ({ ...prev, isOpen: false }))}
        onEdit={(id: string) => onSelectElement(id)}
        onDuplicate={(id: string) => onDuplicateElement && onDuplicateElement(id)}
        onCopy={(id: string) => onCopyElement && onCopyElement(id)}
        onPaste={(id: string) => onPasteElement && onPasteElement(id)}
        onPasteStyle={(id: string) => onPasteStyleElement && onPasteStyleElement(id)}
        onSaveAsGlobal={onSaveAsGlobal}
        onDelete={(id: string, type: any) => {
          if (type === 'section') {
            onRemoveSection(id);
          } else {
            onRemoveComponent(id);
          }
        }}
        canPaste={canPaste}
        canPasteStyle={!!copiedElement}
      />
    </div>
  );
}
