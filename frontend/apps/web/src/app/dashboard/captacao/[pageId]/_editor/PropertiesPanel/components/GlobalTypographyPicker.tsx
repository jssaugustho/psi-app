'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Select } from '@psi/ui';
import {
  Type,
  X,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  GripHorizontal,
  Plus,
  RotateCcw,
  Bookmark,
  Check,
  Trash2,
  Globe,
} from 'lucide-react';
import { SliderNumberInput } from './SliderNumberInput';
import { loadGoogleFonts } from '../../utils/googleFonts';
import { getThemeColors, getThemeTypography } from '../../utils/colorHelpers';
import { CustomTypographyPreset } from '../../types';

export interface TypographyPatch {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: string;
  textAlign?: string;
}

import { ViewportMode } from '../../types';

interface GlobalTypographyPickerProps {
  label?: string;
  typoPreset?: string;
  onChangePreset?: (preset: string) => void;
  onClearOverrides?: () => void;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: string;
  textAlign?: string;
  color?: string;
  page?: any;
  onUpdateSiteConfig?: (patch: any) => void;
  defaultFontCategory?: 'heading' | 'body';
  viewportMode?: ViewportMode;
  onChangeTypography: (patch: TypographyPatch) => void;
  className?: string;
}

export function GlobalTypographyPicker({
  label,
  typoPreset,
  onChangePreset,
  onClearOverrides,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textTransform,
  textAlign,
  color,
  page,
  onUpdateSiteConfig,
  defaultFontCategory = 'body',
  viewportMode,
  onChangeTypography,
  className = '',
}: GlobalTypographyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const [maxHeight, setMaxHeight] = useState<number>(480);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [isEditingGlobalTheme, setIsEditingGlobalTheme] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);

  const themeHeadingFont = page?.siteConfig?.theme?.fontHeading || 'Playfair Display';
  const themeBodyFont = page?.siteConfig?.theme?.fontBody || 'Inter';
  const inheritedFontName = defaultFontCategory === 'heading' ? themeHeadingFont : themeBodyFont;

  useEffect(() => {
    loadGoogleFonts();
  }, []);

  const validLevels = ['h1', 'h2', 'h3', 'h4', 'paragraph', 'links', 'nav_links', 'buttons'];
  const targetLevelKey = (typoPreset && validLevels.includes(typoPreset))
    ? typoPreset
    : (defaultFontCategory === 'heading' ? 'h1' : 'paragraph');

  const levelLabels: Record<string, string> = {
    h1: 'H1 — Título Principal',
    h2: 'H2 — Título de Seção',
    h3: 'H3 — Subseção',
    h4: 'H4 — Etiqueta / Card',
    paragraph: 'Parágrafo / Corpo',
    links: 'Links de Conteúdo',
    nav_links: 'Link de Navegação (Navbar Menu)',
    buttons: 'Texto de Botões',
  };

  const themeColors = getThemeColors(page);
  const themeTypo = getThemeTypography(page);
  const currentGlobalLevel = themeTypo.levels[targetLevelKey as keyof typeof themeTypo.levels] || {};

  const handleFieldChange = (patch: TypographyPatch) => {
    if (isEditingGlobalTheme && onUpdateSiteConfig) {
      const currentTheme = page?.siteConfig?.theme || {};
      const isMobile = viewportMode === 'mobile';

      if (isMobile) {
        const currentMobile = currentTheme.mobile || {};
        const currentMobileLevels = currentMobile.levels || {};
        const existingTarget = { ...(currentMobileLevels[targetLevelKey] || {}) };
        Object.entries(patch).forEach(([key, value]) => {
          if (value === '' || value === undefined) {
            delete (existingTarget as any)[key];
          } else {
            (existingTarget as any)[key] = value;
          }
        });
        onUpdateSiteConfig({
          theme: {
            ...currentTheme,
            mobile: {
              ...currentMobile,
              levels: {
                ...currentMobileLevels,
                [targetLevelKey]: existingTarget,
              },
            },
          },
        });
      } else {
        const currentLevels = currentTheme.levels || currentTheme.typographyLevels || {};
        const existingTarget = { ...(currentLevels[targetLevelKey] || {}) };

        Object.entries(patch).forEach(([key, value]) => {
          if (value === '' || value === undefined) {
            delete (existingTarget as any)[key];
          } else {
            (existingTarget as any)[key] = value;
          }
        });

        onUpdateSiteConfig({
          theme: {
            ...currentTheme,
            levels: {
              ...currentLevels,
              [targetLevelKey]: existingTarget,
            },
          },
        });
      }
    } else {
      onChangeTypography(patch);
    }
  };

  const activeFontFamily = isEditingGlobalTheme
    ? (currentGlobalLevel.fontFamily || (defaultFontCategory === 'heading' ? themeHeadingFont : themeBodyFont))
    : (fontFamily || currentGlobalLevel.fontFamily || (defaultFontCategory === 'heading' ? themeHeadingFont : themeBodyFont));

  const activeFontSize = isEditingGlobalTheme
    ? (currentGlobalLevel.fontSize || (defaultFontCategory === 'heading' ? '28px' : '16px'))
    : (fontSize || currentGlobalLevel.fontSize || (defaultFontCategory === 'heading' ? '28px' : '16px'));

  const activeFontWeight = isEditingGlobalTheme
    ? (currentGlobalLevel.fontWeight || '400')
    : (fontWeight || currentGlobalLevel.fontWeight || '400');

  const activeLineHeight = isEditingGlobalTheme
    ? (currentGlobalLevel.lineHeight || '1.4')
    : (lineHeight || currentGlobalLevel.lineHeight || '1.4');

  const activeLetterSpacing = isEditingGlobalTheme
    ? (currentGlobalLevel.letterSpacing || '0px')
    : (letterSpacing || currentGlobalLevel.letterSpacing || '0px');

  const activeTextTransform = isEditingGlobalTheme
    ? (currentGlobalLevel.textTransform || 'none')
    : (textTransform || currentGlobalLevel.textTransform || 'none');

  const activeTextAlign = isEditingGlobalTheme
    ? (currentGlobalLevel.textAlign || '')
    : (textAlign || currentGlobalLevel.textAlign || '');

  // Cálculo Inteligente de Posição e Altura ao Abrir
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popoverWidth = 320;

      let left = rect.left;
      if (left + popoverWidth > viewportWidth - 16) {
        left = Math.max(16, viewportWidth - popoverWidth - 16);
      }

      const spaceBelow = viewportHeight - rect.bottom - 20;
      const spaceAbove = rect.top - 20;

      let top = rect.bottom + 8;
      let calculatedMaxHeight = 480;

      if (spaceBelow < 360 && spaceAbove > spaceBelow) {
        calculatedMaxHeight = Math.min(540, Math.max(260, spaceAbove));
        top = Math.max(16, rect.top - calculatedMaxHeight - 8);
      } else {
        calculatedMaxHeight = Math.min(540, Math.max(260, spaceBelow));
        top = Math.max(16, rect.bottom + 8);
      }

      setPosition({ top, left });
      setMaxHeight(calculatedMaxHeight);
      setPanelHeight(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const posRef = useRef<{ top: number; left: number }>({ top: 100, left: 100 });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (position) {
      posRef.current = position;
    }
  }, [position]);

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    isDraggingRef.current = true;

    const popupEl = popupRef.current;
    if (!popupEl) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialLeft = posRef.current.left;
    const initialTop = posRef.current.top;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newLeft = Math.max(10, Math.min(window.innerWidth - 330, initialLeft + deltaX));
      const newTop = Math.max(10, Math.min(window.innerHeight - 80, initialTop + deltaY));

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        if (popupEl) {
          popupEl.style.left = `${newLeft}px`;
          popupEl.style.top = `${newTop}px`;
          posRef.current = { top: newTop, left: newLeft };
        }
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const popupEl = popupRef.current;
    if (!popupEl) return;

    const startY = e.clientY;
    const initialHeight = popupEl.getBoundingClientRect().height;
    const currentTop = posRef.current.top;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(
        220,
        Math.min(window.innerHeight - currentTop - 16, initialHeight + deltaY)
      );

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        if (popupEl) {
          popupEl.style.height = `${newHeight}px`;
        }
      });
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const customPresets: CustomTypographyPreset[] = page?.siteConfig?.theme?.customPresets || [];

  const hasOverrides = Boolean(
    fontFamily ||
    fontSize ||
    fontWeight ||
    lineHeight ||
    letterSpacing ||
    textTransform ||
    textAlign ||
    color
  );

  const basePresetOptions = [
    { value: 'h1', label: '👑 H1 — Título Principal' },
    { value: 'h2', label: '🏷️ H2 — Título de Seção' },
    { value: 'h3', label: '📌 H3 — Subseção' },
    { value: 'h4', label: '🔖 H4 — Etiqueta' },
    { value: 'paragraph', label: '📄 Parágrafo / Corpo' },
    { value: 'buttons', label: '🔘 Texto de Botões' },
    { value: 'links', label: '🔗 Links & Âncoras' },
    { value: 'nav_links', label: '🧭 Menu de Navegação' },
  ];

  const customPresetOptions = customPresets.map((p) => ({
    value: p.id,
    label: `⭐ ${p.name}`,
  }));

  const selectOptions = customPresetOptions.length > 0
    ? [...basePresetOptions, ...customPresetOptions]
    : basePresetOptions;

  const handleSelectPresetChange = (presetVal: string) => {
    if (!onChangePreset) return;
    const matchedCustom = customPresets.find((p) => p.id === presetVal);
    if (matchedCustom) {
      onChangeTypography(matchedCustom.patch);
      onChangePreset(matchedCustom.id);
    } else {
      onChangePreset(presetVal);
    }
  };

  const handleSaveAsPreset = () => {
    if (!newPresetName.trim() || !onUpdateSiteConfig) return;
    const newId = `preset_${Date.now()}`;
    const patch: TypographyPatch & { color?: string } = {
      ...(fontFamily ? { fontFamily } : {}),
      ...(fontSize ? { fontSize } : {}),
      ...(fontWeight ? { fontWeight } : {}),
      ...(lineHeight ? { lineHeight } : {}),
      ...(letterSpacing ? { letterSpacing } : {}),
      ...(textTransform ? { textTransform } : {}),
      ...(textAlign ? { textAlign } : {}),
      ...(color ? { color } : {}),
    };

    const newPreset: CustomTypographyPreset = {
      id: newId,
      name: newPresetName.trim(),
      patch,
    };

    const currentTheme = page?.siteConfig?.theme || {};
    const updatedCustomPresets = [...(currentTheme.customPresets || []), newPreset];

    onUpdateSiteConfig({
      theme: {
        ...currentTheme,
        customPresets: updatedCustomPresets,
      },
    });

    if (onChangePreset) {
      onChangePreset(newId);
    }

    setNewPresetName('');
    setIsSavingPreset(false);
  };

  const handleDeleteCustomPreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateSiteConfig) return;
    const currentTheme = page?.siteConfig?.theme || {};
    const updatedCustomPresets = (currentTheme.customPresets || []).filter((p: any) => p.id !== presetId);

    onUpdateSiteConfig({
      theme: {
        ...currentTheme,
        customPresets: updatedCustomPresets,
      },
    });
  };

  return (
    <div className={`space-y-1.5 relative ${className}`}>
      {label && (
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
          {label}
        </label>
      )}

      {onChangePreset ? (
        <div className="space-y-1.5">
          {/* Row 1: Full Width Preset Selector */}
          <div className="w-full">
            <Select
              value={typoPreset || (defaultFontCategory === 'heading' ? 'h1' : 'paragraph')}
              onChange={(e) => handleSelectPresetChange(e.target.value)}
              options={selectOptions}
              variant="glass"
              className="w-full"
            />
          </div>

          {/* Row 2: Status Indicator & Action Toolbar */}
          <div className="px-0.5 flex items-center justify-between gap-1 text-[9px] flex-wrap">
            {/* Status Badge */}
            <div className="min-w-0">
              {hasOverrides ? (
                <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 truncate" title="Este elemento possui personalizações locais que se sobrepõem ao Tema Global">
                  ✏️ Customizado localmente
                </span>
              ) : typoPreset && typoPreset.startsWith('preset_') ? (
                <span className="font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1 truncate" title="Utilizando um preset personalizado criado previamente">
                  ⭐ Preset Salvo
                </span>
              ) : (
                <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate" title="Herdando 100% da tipografia definida no Tema Global">
                  ✨ Herdando Tema Global
                </span>
              )}
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              {onUpdateSiteConfig && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingGlobalTheme(true);
                    setIsOpen(true);
                  }}
                  className={`px-2 py-1 rounded-lg border flex items-center gap-1 cursor-pointer transition-all ${
                    isOpen && isEditingGlobalTheme
                      ? 'border-blue-500 bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
                  }`}
                  title="Editar o estilo padrão deste nível no Tema Global (Afeta todo o site)"
                >
                  <Globe className="w-3 h-3" />
                  <span className="text-[9px] font-bold">Global</span>
                </button>
              )}

              <button
                ref={triggerRef}
                type="button"
                onClick={() => {
                  setIsEditingGlobalTheme(false);
                  setIsOpen(!isOpen);
                }}
                className={`px-2 py-1 rounded-lg border flex items-center gap-1 cursor-pointer transition-all ${
                  isOpen && !isEditingGlobalTheme
                    ? 'border-purple-500 bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold'
                    : hasOverrides
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                    : 'border-[var(--surface-border)] glass-sm text-slate-600 dark:text-slate-300 hover:border-purple-500'
                }`}
                title={hasOverrides ? 'Editar personalizações deste elemento' : 'Adicionar personalização local (+)'}
              >
                <Sliders className="w-3 h-3" />
                <span className="text-[9px] font-bold">{hasOverrides ? 'Ajustes' : 'Editar'}</span>
              </button>

              {hasOverrides && onUpdateSiteConfig && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(true);
                    setIsSavingPreset(true);
                  }}
                  className="p-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 cursor-pointer transition-colors"
                  title="Salvar esta personalização local como um Preset Reutilizável"
                >
                  <Bookmark className="w-3 h-3" />
                </button>
              )}

              {hasOverrides && onClearOverrides && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsSavingPreset(false);
                    onClearOverrides();
                  }}
                  className="p-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer transition-colors"
                  title="Limpar personalizações manuais e restaurar 100% o Estilo Global"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
            isOpen
              ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-bold'
              : 'border-[var(--surface-border)] glass-sm text-slate-700 dark:text-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Type className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="text-left min-w-0">
              <span className="text-xs font-bold block truncate">
                {activeFontFamily || inheritedFontName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                {activeFontSize || (defaultFontCategory === 'heading' ? '28px' : '16px')} • {activeFontWeight ? `${activeFontWeight}` : 'Padrão'}
              </span>
            </div>
          </div>

          <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>
      )}

      {/* Janela Flutuante de Tipografia via React Portal */}
      {isOpen &&
        position &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: '320px',
              height: panelHeight ? `${panelHeight}px` : undefined,
              maxHeight: `${maxHeight}px`,
              zIndex: 9999,
            }}
            className="brand-popup rounded-2xl border border-[var(--surface-border)] shadow-2xl flex flex-col select-none backdrop-blur-xl animate-in fade-in duration-150 overflow-hidden"
          >
            {/* Header Arrastável da Janela */}
            <div
              onMouseDown={handleDragStart}
              className="p-3 border-b border-[var(--surface-border)] flex items-center justify-between cursor-grab active:cursor-grabbing bg-[var(--mix-base)]/80 shrink-0"
              title="Clique e arraste para mover esta janela na tela"
            >
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                <GripHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
                <Type className="w-4 h-4 text-blue-500 shrink-0" />
                <span>{label || (isEditingGlobalTheme ? `Tema Global — ${targetLevelKey.toUpperCase()}` : 'Estilo de Tipografia')}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-500/10 cursor-pointer transition-colors"
                title="Fechar Janela"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo com Scroll Interno Adaptável */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-3.5">
              {/* TOGGLE MODO DE EDIÇÃO: OVERRIDE LOCAL VS TEMA GLOBAL */}
              {onUpdateSiteConfig && (
                <div className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl space-y-1.5 border border-[var(--surface-border)]">
                  <div className="flex items-center justify-between p-0.5 bg-slate-200/80 dark:bg-slate-900/80 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setIsEditingGlobalTheme(false)}
                      className={`flex-1 py-1 px-2 rounded-md transition-all text-center cursor-pointer ${
                        !isEditingGlobalTheme
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      ✏️ Override Local
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingGlobalTheme(true)}
                      className={`flex-1 py-1 px-2 rounded-md transition-all text-center cursor-pointer ${
                        isEditingGlobalTheme
                          ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      🌐 Tema Global ({targetLevelKey.toUpperCase()})
                    </button>
                  </div>

                  {isEditingGlobalTheme && (
                    <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-700 dark:text-blue-300 flex items-center justify-between">
                      <span>Editando estilo de <strong>{levelLabels[targetLevelKey] || targetLevelKey.toUpperCase()}</strong> em todo o site.</span>
                      {hasOverrides && onClearOverrides && (
                        <button
                          type="button"
                          onClick={() => onClearOverrides()}
                          className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 shrink-0 ml-1 cursor-pointer"
                          title="Limpar override local deste elemento para herdar a alteração global"
                        >
                          Limpar Override
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* FORMULARIO DE SALVAR PRESET */}
              {isSavingPreset ? (
                <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-300">
                    <span className="flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" />
                      Salvar como Preset Personalizado
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSavingPreset(false)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Nome do Preset (ex: Título Destaque)"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveAsPreset();
                        if (e.key === 'Escape') setIsSavingPreset(false);
                      }}
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-purple-500/30 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveAsPreset}
                      disabled={!newPresetName.trim()}
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Salvar
                    </button>
                  </div>
                </div>
              ) : hasOverrides && onUpdateSiteConfig && !isEditingGlobalTheme ? (
                <button
                  type="button"
                  onClick={() => setIsSavingPreset(true)}
                  className="w-full py-1.5 px-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Salvar esta estilização como Preset</span>
                </button>
              ) : null}

              {/* LISTA DE PRESETS SALVOS (Com Exclusão) */}
              {customPresets.length > 0 && !isEditingGlobalTheme && (
                <div className="space-y-1 pt-1 pb-2 border-b border-[var(--surface-border)]">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                    ⭐ Presets Salvos da Página ({customPresets.length})
                  </label>
                  <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar pr-1">
                    {customPresets.map((preset) => (
                      <div
                        key={preset.id}
                        className={`p-1.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                          typoPreset === preset.id
                            ? 'border-purple-500 bg-purple-500/10 font-bold text-purple-700 dark:text-purple-300'
                            : 'border-[var(--surface-border)] hover:bg-slate-500/5 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectPresetChange(preset.id)}
                          className="flex-1 text-left truncate cursor-pointer font-medium"
                        >
                          ⭐ {preset.name}
                        </button>
                        {onUpdateSiteConfig && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                            title="Excluir este preset salvo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FAMÍLIA DA FONTE */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Família da Fonte</label>
                <Select
                  value={activeFontFamily || ''}
                  onChange={(e) => {
                    const fontVal = e.target.value;
                    if (fontVal) loadGoogleFonts([fontVal]);
                    handleFieldChange({ fontFamily: fontVal });
                  }}
                  options={[
                    { value: '', label: `✨ Herdar Tema (${inheritedFontName})`, fontFamily: inheritedFontName },
                    { value: 'Inter', label: 'Inter (Sans-serif)', fontFamily: 'Inter' },
                    { value: 'Poppins', label: 'Poppins (Geométrica)', fontFamily: 'Poppins' },
                    { value: 'Montserrat', label: 'Montserrat (Moderna)', fontFamily: 'Montserrat' },
                    { value: 'Playfair Display', label: 'Playfair Display (Serif Elegante)', fontFamily: 'Playfair Display' },
                    { value: 'Lora', label: 'Lora (Serif Editorial)', fontFamily: 'Lora' },
                    { value: 'Roboto', label: 'Roboto (Neogrotesca)', fontFamily: 'Roboto' },
                    { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', fontFamily: 'Plus Jakarta Sans' },
                    { value: 'Cinzel', label: 'Cinzel (Luxo)', fontFamily: 'Cinzel' },
                    { value: 'Outfit', label: 'Outfit (Moderna Clean)', fontFamily: 'Outfit' },
                    { value: 'Space Grotesk', label: 'Space Grotesk (Tech/Moderna)', fontFamily: 'Space Grotesk' },
                  ]}
                  variant="glass"
                />
              </div>

              {/* TAMANHO DA FONTE */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Tamanho da Fonte (fontSize)</label>
                <SliderNumberInput
                  value={activeFontSize || (defaultFontCategory === 'heading' ? '28px' : '16px')}
                  onChange={(val) => handleFieldChange({ fontSize: val })}
                  defaultUnit="px"
                />
              </div>

              {/* PESO DA FONTE */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Peso da Fonte (fontWeight)</label>
                <Select
                  value={activeFontWeight || ''}
                  onChange={(e) => handleFieldChange({ fontWeight: e.target.value })}
                  options={[
                    { value: '', label: 'Herdar Padrão' },
                    { value: '300', label: 'Leve (300)' },
                    { value: '400', label: 'Normal (400)' },
                    { value: '500', label: 'Médio (500)' },
                    { value: '600', label: 'Seminegrito (600)' },
                    { value: '700', label: 'Negrito (700)' },
                    { value: '800', label: 'Extranegrito (800)' },
                    { value: '900', label: 'Black (900)' },
                  ]}
                  variant="glass"
                />
              </div>

              {/* ALTURA DA LINHA */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Altura da Linha (lineHeight)</label>
                <SliderNumberInput
                  value={activeLineHeight || '1.4'}
                  onChange={(val) => handleFieldChange({ lineHeight: val })}
                  defaultUnit=""
                  unitOptions={['', 'px', 'rem', 'em']}
                />
              </div>

              {/* ESPAÇO ENTRE LETRAS */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Espaço entre Letras (letterSpacing)</label>
                <SliderNumberInput
                  value={activeLetterSpacing || '0px'}
                  onChange={(val) => handleFieldChange({ letterSpacing: val })}
                  defaultUnit="px"
                />
              </div>

              {/* CAIXA DE TEXTO */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Caixa do Texto</label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { value: 'none', label: 'Normal' },
                    { value: 'uppercase', label: 'MAIÚSCULA' },
                    { value: 'lowercase', label: 'minúscula' },
                    { value: 'capitalize', label: 'Capitalizar' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleFieldChange({ textTransform: item.value })}
                      className={`py-1.5 rounded-lg border text-[8px] font-bold transition-all cursor-pointer ${
                        (activeTextTransform || 'none') === item.value
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-extrabold'
                          : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ALINHAMENTO DE TEXTO */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Alinhamento do Texto</label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { value: 'left', icon: AlignLeft, label: 'Esquerda' },
                    { value: 'center', icon: AlignCenter, label: 'Centro' },
                    { value: 'right', icon: AlignRight, label: 'Direita' },
                    { value: 'justify', icon: AlignJustify, label: 'Justificado' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleFieldChange({ textAlign: item.value })}
                        className={`p-1.5 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                          activeTextAlign === item.value
                            ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-bold'
                            : 'border-[var(--surface-border)] text-slate-600 dark:text-slate-400'
                        }`}
                        title={item.label}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Handle Interativo de Redimensionamento Vertical da Altura */}
            <div
              onMouseDown={handleResizeStart}
              className="h-3.5 w-full cursor-ns-resize flex items-center justify-center bg-[var(--mix-base)]/40 hover:bg-blue-500/20 transition-colors shrink-0 group border-t border-[var(--surface-border)]/40"
              title="Arraste para ajustar a altura desta janela"
            >
              <div className="w-8 h-1 rounded-full bg-slate-400/50 group-hover:bg-blue-500 transition-colors" />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
