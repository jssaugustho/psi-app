'use client';

import React from 'react';
import { Sparkles, Unlink, Type, Image as ImageIcon, Link as LinkIcon, Palette, Edit } from 'lucide-react';
import { GlobalInstanceComponent, GlobalComponentMaster, getDeepPropertyByPath } from '@psi/canvas-renderer';
import { AccordionItem } from './components/AccordionSection';
import { GlobalColorPicker } from './components/GlobalColorPicker';

interface GlobalInstancePropertiesProps {
  instance: GlobalInstanceComponent;
  globalMaster: GlobalComponentMaster | null;
  onUpdateOverride: (path: string, value: any) => void;
  onUnlinkInstance: () => void;
  onEditMaster?: () => void;
}

export function GlobalInstanceProperties({
  instance,
  globalMaster,
  onUpdateOverride,
  onUnlinkInstance,
  onEditMaster,
}: GlobalInstancePropertiesProps) {
  if (!globalMaster) {
    return (
      <div className="p-4 text-center text-xs text-slate-400">
        <Sparkles className="w-5 h-5 mx-auto mb-2 animate-pulse text-purple-500" />
        <p>Carregando metadados do Elemento Global...</p>
      </div>
    );
  }

  const customizableProps = globalMaster.customizableProps || [];

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* Header Info Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-600/10 via-purple-500/5 to-indigo-600/10 border border-purple-500/30 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-600 text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-extrabold text-slate-900 dark:text-white truncate">
              {globalMaster.name}
            </h4>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
              Elemento Global Reutilizável
            </span>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Propriedades estruturais e de estilo base são herdadas do componente master. Abaixo você pode personalizar os campos expostos apenas para esta instância.
        </p>

        {/* Botão de Editar Master no Canvas Isolado */}
        {onEditMaster && (
          <button
            type="button"
            onClick={onEditMaster}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-[11px] flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Editar Componente Master (Canvas Isolado)</span>
          </button>
        )}

        {/* Botão de Desvincular */}
        <button
          type="button"
          onClick={onUnlinkInstance}
          className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-red-500/50 hover:bg-red-500/5 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-all font-bold text-[11px] flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <Unlink className="w-3.5 h-3.5" />
          <span>Desvincular (Tornar Componente Local)</span>
        </button>
      </div>

      {/* Accordion de Propriedades Personalizáveis */}
      <AccordionItem
        id="acc-global-overrides"
        title="PROPRIEDADES DA INSTÂNCIA"
        icon={Sparkles}
        defaultOpen={true}
      >
        {customizableProps.length === 0 ? (
          <div className="p-3 text-center text-slate-400 text-[11px]">
            Este elemento global não possui propriedades configuradas como personalizáveis.
          </div>
        ) : (
          <div className="space-y-3 p-1">
            {customizableProps.map((decl) => {
              const currentOverride = instance.overrides?.[decl.path];
              const masterDefault = getDeepPropertyByPath(globalMaster.masterNode, decl.path);
              const currentValue = currentOverride !== undefined ? currentOverride : masterDefault ?? decl.defaultValue ?? '';

              return (
                <div key={decl.path} className="space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {decl.type === 'text' && <Type className="w-3 h-3 text-purple-500" />}
                      {decl.type === 'image' && <ImageIcon className="w-3 h-3 text-blue-500" />}
                      {decl.type === 'link' && <LinkIcon className="w-3 h-3 text-emerald-500" />}
                      {decl.type === 'color' && <Palette className="w-3 h-3 text-pink-500" />}
                      <span>{decl.label}</span>
                    </label>
                    {currentOverride !== undefined && (
                      <button
                        type="button"
                        onClick={() => {
                          // Reseta override para voltar a herdar do master
                          onUpdateOverride(decl.path, undefined);
                        }}
                        className="text-[9px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                        title="Restaurar valor do master"
                      >
                        Resetar
                      </button>
                    )}
                  </div>

                  {/* Renderização do Controle conforme o Tipo */}
                  {decl.type === 'text' && (
                    <textarea
                      rows={2}
                      value={currentValue}
                      onChange={(e) => onUpdateOverride(decl.path, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 custom-scrollbar resize-y"
                    />
                  )}

                  {decl.type === 'image' && (
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) => onUpdateOverride(decl.path, e.target.value)}
                      placeholder="https://..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  )}

                  {decl.type === 'link' && (
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) => onUpdateOverride(decl.path, e.target.value)}
                      placeholder="https://wa.me/55..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  )}

                  {decl.type === 'color' && (
                    <GlobalColorPicker
                      value={currentValue || '#000000'}
                      onChange={(newColor) => onUpdateOverride(decl.path, newColor)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AccordionItem>
    </div>
  );
}
