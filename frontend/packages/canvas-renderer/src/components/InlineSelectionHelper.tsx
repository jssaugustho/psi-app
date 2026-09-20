'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Paintbrush, Check, X, Bold, Italic, Underline } from 'lucide-react';
import { GlobalColorPicker } from './GlobalColorPicker';

interface InlineSelectionHelperProps {
  page?: any;
}

export function InlineSelectionHelper({ page }: InlineSelectionHelperProps) {
  const [selectionRect, setSelectionRect] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [colorMode, setColorMode] = useState<'solid' | 'gradient' | 'highlight'>('solid');

  // Tipografia da Seleção
  const [fontSize, setFontSize] = useState<string>('');
  const [fontWeight, setFontWeight] = useState<string>('');
  const [solidColor, setSolidColor] = useState<string>('');

  // Gradiente
  const [gradientStart, setGradientStart] = useState<string>('#3b82f6');
  const [gradientEnd, setGradientEnd] = useState<string>('#8b5cf6');

  // Fundo / Highlight
  const [highlightBg, setHighlightBg] = useState<string>('');

  // Estilos rápidos
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        if (!isOpen) {
          setSelectionRect(null);
          setSelectedText('');
        }
        return;
      }

      const text = selection.toString().trim();
      if (text.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSelectionRect({
            top: rect.top - 44,
            left: rect.left + rect.width / 2,
          });
          setSelectedText(text);
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [isOpen]);

  const handleApply = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setIsOpen(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');

    // Cor / Gradiente
    if (colorMode === 'gradient') {
      span.style.background = `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`;
      span.style.webkitBackgroundClip = 'text';
      span.style.webkitTextFillColor = 'transparent';
      span.style.display = 'inline-block';
    } else if (colorMode === 'solid' && solidColor) {
      span.style.color = solidColor;
    } else if (colorMode === 'highlight' && highlightBg) {
      span.style.backgroundColor = highlightBg;
      span.style.padding = '2px 6px';
      span.style.borderRadius = '6px';
    }

    if (fontSize) span.style.fontSize = fontSize;
    if (fontWeight) span.style.fontWeight = fontWeight;
    if (isBold) span.style.fontWeight = '700';
    if (isItalic) span.style.fontStyle = 'italic';
    if (isUnderline) span.style.textDecoration = 'underline';

    try {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);

      // Dispara evento input no elemento pai contentEditable para salvar innerHTML
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && activeEl.isContentEditable) {
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        activeEl.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    } catch (err) {
      console.error('Erro ao aplicar estilo à seleção:', err);
    }

    setIsOpen(false);
    setSelectionRect(null);
  };

  const handleClearStyle = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    try {
      const range = selection.getRangeAt(0);
      const text = range.toString();
      const textNode = document.createTextNode(text);
      range.deleteContents();
      range.insertNode(textNode);

      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && activeEl.isContentEditable) {
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        activeEl.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    } catch (err) {
      console.error('Erro ao limpar estilo:', err);
    }

    setIsOpen(false);
    setSelectionRect(null);
  };

  if (!selectionRect) return null;

  return (
    <>
      {/* Botão Flutuante de Disparo (Acima do texto selecionado) */}
      {!isOpen && (
        <div
          style={{
            position: 'fixed',
            top: `${Math.max(10, selectionRect.top)}px`,
            left: `${selectionRect.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          className="animate-in fade-in zoom-in duration-150 select-none"
        >
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-bold shadow-xl border border-blue-500/40 hover:scale-105 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Estilizar Seleção ({selectedText.slice(0, 12)}{selectedText.length > 12 ? '...' : ''})</span>
          </button>
        </div>
      )}

      {/* Popover Helper de Tipografia & Cores */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${Math.max(20, selectionRect.top - 220)}px`,
            left: `${selectionRect.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          className="w-72 p-3.5 rounded-2xl glass-card border border-[var(--surface-border)] shadow-2xl space-y-3 select-none animate-in fade-in zoom-in duration-150"
        >
          {/* Header Popover */}
          <div className="flex items-center justify-between border-b border-[var(--surface-border)]/60 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
              <Paintbrush className="w-3.5 h-3.5 text-blue-500" />
              <span>Estilizar Trecho Selecionado</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Modo de Cor: Sólida | Gradiente | Fundo */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Cor</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'solid', label: 'Cor Sólida' },
                { id: 'gradient', label: 'Gradiente' },
                { id: 'highlight', label: 'Destaque' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setColorMode(m.id as any)}
                  className={`py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                    colorMode === m.id
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                      : 'border-[var(--surface-border)] text-slate-500'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Opções de Cor Sólida */}
          {colorMode === 'solid' && (
            <GlobalColorPicker
              label="Cor do Trecho"
              value={solidColor}
              onChange={(v) => setSolidColor(v)}
              page={page}
            />
          )}

          {/* Opções de Gradiente */}
          {colorMode === 'gradient' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <GlobalColorPicker
                  label="Cor Inicial"
                  value={gradientStart}
                  onChange={(v) => setGradientStart(v)}
                  page={page}
                />
                <GlobalColorPicker
                  label="Cor Final"
                  value={gradientEnd}
                  onChange={(v) => setGradientEnd(v)}
                  page={page}
                />
              </div>

              {/* Presets de Gradiente Rápido */}
              <div className="space-y-1 pt-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Presets de Gradiente</label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { start: 'var(--brand-gradient-start)', end: 'var(--brand-gradient-end)', name: 'Marca' },
                    { start: '#f59e0b', end: '#ef4444', name: 'Sunset' },
                    { start: '#06b6d4', end: '#3b82f6', name: 'Ocean' },
                    { start: '#8b5cf6', end: '#ec4899', name: 'Purple' },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setGradientStart(p.start);
                        setGradientEnd(p.end);
                      }}
                      className="py-1 rounded-md text-[8px] font-bold text-white shadow-sm cursor-pointer hover:scale-105 transition-transform"
                      style={{ background: `linear-gradient(135deg, ${p.start}, ${p.end})` }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Opções de Highlight Fundo */}
          {colorMode === 'highlight' && (
            <GlobalColorPicker
              label="Cor do Fundo (Badge)"
              value={highlightBg}
              onChange={(v) => setHighlightBg(v)}
              page={page}
            />
          )}

          {/* Tamanho & Peso */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Tamanho</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full p-1.5 text-xs rounded-lg border border-[var(--surface-border)] bg-transparent text-slate-800 dark:text-white outline-none"
              >
                <option value="">Manter</option>
                <option value="0.75rem">Pequeno (12px)</option>
                <option value="0.875rem">Normal (14px)</option>
                <option value="1rem">Médio (16px)</option>
                <option value="1.25rem">Grande (20px)</option>
                <option value="1.5rem">Título P (24px)</option>
                <option value="2rem">Título M (32px)</option>
                <option value="2.5rem">Título G (40px)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Peso</label>
              <select
                value={fontWeight}
                onChange={(e) => setFontWeight(e.target.value)}
                className="w-full p-1.5 text-xs rounded-lg border border-[var(--surface-border)] bg-transparent text-slate-800 dark:text-white outline-none"
              >
                <option value="">Manter</option>
                <option value="400">Normal (400)</option>
                <option value="600">Semibold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="800">Extrabold (800)</option>
                <option value="900">Black (900)</option>
              </select>
            </div>
          </div>

          {/* Estilos Rápidos (Negrito, Itálico, Sublinhado) */}
          <div className="flex items-center gap-1 pt-1">
            <button
              type="button"
              onClick={() => setIsBold(!isBold)}
              className={`p-1.5 rounded-lg border flex-1 flex justify-center cursor-pointer transition-all ${
                isBold ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-bold' : 'border-[var(--surface-border)] text-slate-500'
              }`}
              title="Negrito"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsItalic(!isItalic)}
              className={`p-1.5 rounded-lg border flex-1 flex justify-center cursor-pointer transition-all ${
                isItalic ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-bold' : 'border-[var(--surface-border)] text-slate-500'
              }`}
              title="Itálico"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsUnderline(!isUnderline)}
              className={`p-1.5 rounded-lg border flex-1 flex justify-center cursor-pointer transition-all ${
                isUnderline ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-bold' : 'border-[var(--surface-border)] text-slate-500'
              }`}
              title="Sublinhado"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Ações: Aplicar & Limpar */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--surface-border)]/60">
            <button
              type="button"
              onClick={handleClearStyle}
              className="py-1.5 px-3 rounded-xl border border-[var(--surface-border)] text-slate-500 hover:text-red-500 text-[10px] font-bold cursor-pointer transition-all"
            >
              Limpar Estilo
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Aplicar ao Texto
            </button>
          </div>
        </div>
      )}
    </>
  );
}
