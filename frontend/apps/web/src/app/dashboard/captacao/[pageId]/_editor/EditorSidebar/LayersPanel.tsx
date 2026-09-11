'use client';

import React from 'react';
import { CanvasData, Section, Component, DivComponent } from '../types';
import { Layout, Square, Box, Eye, EyeOff, Trash2, ChevronRight } from 'lucide-react';

interface LayersPanelProps {
  canvasData: CanvasData | null;
  selectedId: string | null;
  onSelectElement: (id: string | null, type?: any) => void;
  onRemoveSection: (id: string) => void;
  onRemoveComponent: (id: string) => void;
  onUpdateSection: (id: string, patch: Partial<Section>) => void;
  onUpdateComponent: (id: string, patch: Partial<Component>) => void;
}

export function LayersPanel({
  canvasData,
  selectedId,
  onSelectElement,
  onRemoveSection,
  onRemoveComponent,
  onUpdateSection,
  onUpdateComponent,
}: LayersPanelProps) {
  if (!canvasData || canvasData.sections.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Nenhuma seção no canvas. Adicione uma seção na aba "Seções".
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
        Estrutura de Camadas (Layers)
      </h4>

      <div className="space-y-1.5">
        {canvasData.sections.map((sec, secIdx) => {
          const isSecSelected = selectedId === sec.id;

          return (
            <div key={sec.id} className="space-y-1">
              {/* Item da Seção (Nível 1) */}
              <div
                onClick={() => onSelectElement(sec.id, 'section')}
                className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-xs ${
                  isSecSelected
                    ? 'border-[var(--brand-gradient-start)] ring-1 ring-[var(--brand-gradient-start)]/30 glass-md font-bold'
                    : 'border-[var(--surface-border)] glass-sm hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Layout className="w-3.5 h-3.5 text-[var(--brand-gradient-start)] shrink-0" />
                  <span className="truncate text-slate-800 dark:text-slate-200">
                    {sec.label || `Seção ${secIdx + 1}`}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateSection(sec.id, { hidden: !sec.hidden });
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                    title={sec.hidden ? 'Mostrar Seção' : 'Ocultar Seção'}
                  >
                    {sec.hidden ? <EyeOff className="w-3 h-3 text-amber-500" /> : <Eye className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSection(sec.id);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500"
                    title="Excluir Seção"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Filhos da Seção (Divs e Componentes Atômicos) */}
              {sec.components.length > 0 && (
                <div className="pl-4 space-y-1 border-l-2 border-[var(--surface-border)] ml-3">
                  {sec.components.map((comp) => {
                    const isCompSelected = selectedId === comp.id;

                    if (comp.type === 'div') {
                      const divComp = comp as DivComponent;
                      return (
                        <div key={comp.id} className="space-y-1">
                          {/* Item Div */}
                          <div
                            onClick={() => onSelectElement(comp.id, 'div')}
                            className={`p-1.5 rounded-lg border flex items-center justify-between text-[11px] transition-all cursor-pointer ${
                              isCompSelected
                                ? 'border-purple-500 bg-purple-500/10 font-bold'
                                : 'border-[var(--surface-border)] glass-sm hover:border-purple-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Square className="w-3 h-3 text-purple-500 shrink-0" />
                              <span className="truncate">{comp.label || 'Container (Div)'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveComponent(comp.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Filhos do Div */}
                          {divComp.components.length > 0 && (
                            <div className="pl-3 space-y-1 border-l-2 border-purple-500/20 ml-2">
                              {divComp.components.map((child) => (
                                <div
                                  key={child.id}
                                  onClick={() => onSelectElement(child.id, child.type)}
                                  className={`p-1 rounded-md border flex items-center justify-between text-[10px] transition-all cursor-pointer ${
                                    selectedId === child.id
                                      ? 'border-blue-500 bg-blue-500/10 font-bold'
                                      : 'border-[var(--surface-border)] glass-sm'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Box className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                    <span className="truncate">{child.label || child.type}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemoveComponent(child.id);
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-red-500"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Componente Atômico direto na Seção
                    return (
                      <div
                        key={comp.id}
                        onClick={() => onSelectElement(comp.id, comp.type)}
                        className={`p-1.5 rounded-lg border flex items-center justify-between text-[11px] transition-all cursor-pointer ${
                          isCompSelected
                            ? 'border-blue-500 bg-blue-500/10 font-bold'
                            : 'border-[var(--surface-border)] glass-sm'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Box className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="truncate">{comp.label || comp.type}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveComponent(comp.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
