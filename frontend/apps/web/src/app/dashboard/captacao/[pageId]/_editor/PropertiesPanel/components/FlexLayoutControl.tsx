'use client';

import React from 'react';
import {
  MoveHorizontal,
  MoveVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  StretchHorizontal,
  LayoutGrid,
  Code,
} from 'lucide-react';
import { SliderNumberInput } from './SliderNumberInput';
import { HelpTooltip } from './HelpTooltip';
import { FlexDirection, FlexWrap, FlexAlign, FlexJustify } from '@psi/canvas-renderer';

interface FlexLayoutControlProps {
  flexDirection?: FlexDirection;
  flexWrap?: FlexWrap;
  justifyContent?: FlexJustify;
  alignItems?: FlexAlign;
  gap?: string;
  htmlTag?: string;
  onChangeFlexDirection: (dir: FlexDirection) => void;
  onChangeFlexWrap: (wrap: FlexWrap) => void;
  onChangeJustifyContent: (justify: FlexJustify) => void;
  onChangeAlignItems: (align: FlexAlign) => void;
  onChangeGap: (gap: string) => void;
  onChangeHtmlTag?: (tag: string) => void;
}

export function FlexLayoutControl({
  flexDirection = 'column',
  flexWrap = 'nowrap',
  justifyContent = 'flex-start',
  alignItems = 'flex-start',
  gap = '16px',
  htmlTag = 'div',
  onChangeFlexDirection,
  onChangeFlexWrap,
  onChangeJustifyContent,
  onChangeAlignItems,
  onChangeGap,
  onChangeHtmlTag,
}: FlexLayoutControlProps) {
  const isColumn = flexDirection === 'column';

  return (
    <div className="space-y-4 p-3.5 rounded-2xl border border-[var(--surface-border)] glass-sm">
      {/* CABEÇALHO AMIGÁVEL */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)]">
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-wider flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-blue-500" /> Organização Interna
        </span>
        <HelpTooltip
          title="Organização do Conteúdo"
          text="Configure como os elementos (títulos, botões, imagens) dentro deste bloco são organizados, alinhados e espaçados."
        />
      </div>

      {/* 1. DIREÇÃO */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
            Como organizar os elementos?
          </label>
          <HelpTooltip
            title="Direção da Organização"
            text="Escolha se os elementos dentro deste bloco ficam empilhados verticalmente ou dispostos lado a lado."
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: 'column', label: 'Empilhado (Vertical)', icon: MoveVertical },
            { value: 'row', label: 'Lado a Lado (Horizontal)', icon: MoveHorizontal },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = flexDirection === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onChangeFlexDirection(item.value as FlexDirection)}
                className={`py-2 px-2.5 rounded-xl border text-[9px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold shadow-sm'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                <span className="leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ALINHAMENTO PRINCIPAL */}
      {isColumn ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
              Alinhamento Horizontal
            </label>
            <HelpTooltip
              title="Alinhamento Horizontal"
              text="Posiciona os elementos na esquerda, centro, direita ou esticados para ocupar a largura total do bloco."
            />
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[
              { value: 'flex-start', label: 'Esquerda', icon: AlignLeft },
              { value: 'center', label: 'Centro', icon: AlignCenter },
              { value: 'flex-end', label: 'Direita', icon: AlignRight },
              { value: 'stretch', label: 'Esticar', icon: StretchHorizontal },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = alignItems === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onChangeAlignItems(item.value as FlexAlign)}
                  className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold shadow-sm'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[8px] font-bold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
              Alinhamento Horizontal
            </label>
            <HelpTooltip
              title="Alinhamento Horizontal"
              text="Alinha os elementos horizontalmente da esquerda para a direita ou distribui espaços entre eles."
            />
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[
              { value: 'flex-start', label: 'Esquerda', icon: AlignLeft },
              { value: 'center', label: 'Centro', icon: AlignCenter },
              { value: 'flex-end', label: 'Direita', icon: AlignRight },
              { value: 'space-between', label: 'Espaçado', icon: AlignJustify },
              { value: 'space-around', label: 'Uniforme', icon: StretchHorizontal },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = justifyContent === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onChangeJustifyContent(item.value as FlexJustify)}
                  className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold shadow-sm'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[8px] font-bold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ALINHAMENTO SECUNDÁRIO */}
      {isColumn ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
              Distribuição Vertical
            </label>
            <HelpTooltip
              title="Distribuição Vertical"
              text="Organiza a posição vertical dos conteúdos (topo, centro, base ou com espaçamentos entre eles)."
            />
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[
              { value: 'flex-start', label: 'Topo' },
              { value: 'center', label: 'Centro' },
              { value: 'flex-end', label: 'Base' },
              { value: 'space-between', label: 'Espaçado' },
              { value: 'space-around', label: 'Uniforme' },
            ].map((item) => {
              const isSelected = justifyContent === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onChangeJustifyContent(item.value as FlexJustify)}
                  className={`py-1.5 rounded-lg border text-[8px] font-bold text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold shadow-sm'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
              Alinhamento Vertical
            </label>
            <HelpTooltip
              title="Alinhamento Vertical"
              text="Define a posição vertical de cada elemento na linha (topo, centro, base ou esticar para ocupar a altura)."
            />
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[
              { value: 'flex-start', label: 'Topo' },
              { value: 'center', label: 'Centro' },
              { value: 'flex-end', label: 'Base' },
              { value: 'stretch', label: 'Esticar' },
            ].map((item) => {
              const isSelected = alignItems === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onChangeAlignItems(item.value as FlexAlign)}
                  className={`py-1.5 rounded-lg border text-[8px] font-bold text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold shadow-sm'
                      : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. QUEBRA DE LINHA */}
      <div className="space-y-1.5 pt-1 border-t border-[var(--surface-border)]">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-bold text-slate-500 uppercase">Quando o espaço terminar:</label>
          <HelpTooltip
            title="Quebra de Linha"
            text="Define se os elementos continuam na mesma linha ou passam para a linha de baixo quando não houver mais espaço."
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: 'nowrap', label: 'Manter na mesma linha' },
            { value: 'wrap', label: 'Quebrar para a linha de baixo' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onChangeFlexWrap(item.value as FlexWrap)}
              className={`py-1.5 px-2 rounded-xl border text-[9px] font-bold text-center leading-tight transition-all cursor-pointer ${
                flexWrap === item.value
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold shadow-sm'
                  : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. ESPAÇO ENTRE ELEMENTOS */}
      <div className="space-y-1 pt-1 border-t border-[var(--surface-border)]">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-bold text-slate-500 uppercase">Espaço entre Elementos</label>
          <HelpTooltip
            title="Espaço entre Elementos"
            text="Define o espaçamento uniforme entre cada elemento dentro deste bloco."
          />
        </div>
        <SliderNumberInput
          value={gap}
          onChange={onChangeGap}
          min={0}
          max={120}
          defaultUnit="px"
          unitOptions={['px', 'rem', 'em', 'vh', 'vw']}
        />
      </div>

      {/* 6. TAG HTML SEMÂNTICA */}
      {onChangeHtmlTag && (
        <div className="space-y-1 pt-2 border-t border-[var(--surface-border)]">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Code className="w-3 h-3 text-slate-400" /> Função Semântica (SEO)
            </label>
            <HelpTooltip
              title="Função Semântica (SEO)"
              text="Identifica a finalidade deste bloco para mecanismos de busca como o Google (ex: <section>, <header>, <footer>)."
            />
          </div>
          <div className="grid grid-cols-6 gap-1">
            {['div', 'section', 'header', 'footer', 'main', 'article'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onChangeHtmlTag(tag)}
                className={`py-1 rounded-lg border text-[8px] font-mono font-bold transition-all cursor-pointer ${
                  htmlTag === tag
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold shadow-sm'
                    : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:border-slate-400'
                }`}
              >
                &lt;{tag}&gt;
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
