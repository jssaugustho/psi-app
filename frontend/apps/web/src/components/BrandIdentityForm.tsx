'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Palette, Image as ImageIcon, Upload, Sparkles, Type, Check, ShieldCheck } from 'lucide-react';
import { ColorPaletteSelector, getContrastColor } from './ColorPaletteSelector';
import { MediaLibraryModal } from './media-library-modal';
import { FontPicker } from './FontPicker';

interface BrandIdentityFormProps {
  previewTitle: string;
  tenantId: string;

  // States
  logoUrl: string;
  setLogoUrl: (url: string) => void;
  faviconUrl: string;
  setFaviconUrl: (url: string) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  secondaryColor: string;
  setSecondaryColor: (color: string) => void;
  contrastColor: string;
  setContrastColor: (color: string) => void;
  bgColor: string;
  setBgColor: (color: string) => void;
  fontHeading: string;
  setFontHeading: (font: string) => void;
  fontBody: string;
  setFontBody: (font: string) => void;

  isCustomColor: boolean;
  setIsCustomColor: (custom: boolean) => void;
  selectedPalette: any;
  setSelectedPalette: (palette: any) => void;

  themeColorClass?: string;
}

export function BrandIdentityForm({
  previewTitle,
  tenantId,
  logoUrl,
  setLogoUrl,
  faviconUrl,
  setFaviconUrl,
  primaryColor,
  setPrimaryColor,
  secondaryColor,
  setSecondaryColor,
  contrastColor,
  setContrastColor,
  bgColor,
  setBgColor,
  fontHeading,
  setFontHeading,
  fontBody,
  setFontBody,
  isCustomColor,
  setIsCustomColor,
  selectedPalette,
  setSelectedPalette,
  themeColorClass = 'text-violet-500',
}: BrandIdentityFormProps) {
  // Modals & Upload state
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'logo' | 'favicon' | null>(null);

  // Extracted brand colors state (internal to form)
  const [extractedBrandColors, setExtractedBrandColors] = useState<string[]>([]);
  const [isExtractingColors, setIsExtractingColors] = useState(false);

  // Load custom fonts stylesheets for real-time previewing
  useEffect(() => {
    const headingFontFamily = fontHeading.replace(/\s+/g, '+');
    const bodyFontFamily = fontBody.replace(/\s+/g, '+');
    const href = `https://fonts.googleapis.com/css2?family=${headingFontFamily}:wght@400;700&family=${bodyFontFamily}:wght@400;500;700&display=swap`;

    let exists = false;
    const links = document.getElementsByTagName('link');
    for (let i = 0; i < links.length; i++) {
      if (links[i].href === href) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }, [fontHeading, fontBody]);

  // Color Extraction Logic from Logo or Favicon
  useEffect(() => {
    if (!logoUrl && !faviconUrl) {
      setExtractedBrandColors([]);
      setIsExtractingColors(false);
      return;
    }

    let isMounted = true;
    setIsExtractingColors(true);

    const rgbToHsl = (r: number, g: number, b: number) => {
      const rN = r / 255, gN = g / 255, bN = b / 255;
      const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
          case gN: h = (bN - rN) / d + 2; break;
          case bN: h = (rN - gN) / d + 4; break;
        }
        h /= 6;
      }
      return { h, s, l };
    };

    const hexToRgb = (hex: string) => {
      const c = hex.replace('#', '');
      return {
        r: parseInt(c.substring(0, 2), 16),
        g: parseInt(c.substring(2, 4), 16),
        b: parseInt(c.substring(4, 6), 16)
      };
    };

    const rgbToHex = (r: number, g: number, b: number) => {
      return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('').toUpperCase();
    };

    const colorDistance = (c1: string, c2: string) => {
      const rgb1 = hexToRgb(c1);
      const rgb2 = hexToRgb(c2);
      return Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
      );
    };

    const extractPalette = async (imgUrl: string) => {
      return new Promise<string[]>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imgUrl;

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve([]);

            canvas.width = 120;
            canvas.height = 120;
            ctx.drawImage(img, 0, 0, 120, 120);

            const imgData = ctx.getImageData(0, 0, 120, 120).data;
            const colorCounts: Record<string, number> = {};

            for (let i = 0; i < imgData.length; i += 16) {
              const r = imgData[i];
              const g = imgData[i + 1];
              const b = imgData[i + 2];
              const a = imgData[i + 3];

              if (a < 180) continue; // Skip semi-transparent pixels

              // Filter out pure white, pure black or neutral greys
              const luma = 0.299 * r + 0.587 * g + 0.114 * b;
              const isGrey = Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
              if (luma > 240 || luma < 15 || isGrey) continue;

              const hex = rgbToHex(r, g, b);
              colorCounts[hex] = (colorCounts[hex] || 0) + 1;
            }

            const sorted = Object.entries(colorCounts)
              .sort((a, b) => b[1] - a[1])
              .map(x => x[0]);

            const uniqueColors: string[] = [];
            for (const color of sorted) {
              let tooClose = false;
              for (const existing of uniqueColors) {
                if (colorDistance(color, existing) < 45) {
                  tooClose = true;
                  break;
                }
              }
              if (!tooClose) {
                uniqueColors.push(color);
                if (uniqueColors.length >= 5) break;
              }
            }

            resolve(uniqueColors);
          } catch (e) {
            reject(e);
          }
        };

        img.onerror = (e) => reject(e);
      });
    };

    const activeImageSrc = logoUrl || faviconUrl || '';
    if (activeImageSrc) {
      extractPalette(activeImageSrc)
        .then((colors) => {
          if (!isMounted) return;
          const combined = [...colors];
          const deduplicated: string[] = [];
          for (const hex of combined) {
            if (!deduplicated.includes(hex)) deduplicated.push(hex);
          }
          if (!deduplicated.includes('#FFFFFF')) deduplicated.push('#FFFFFF');
          if (!deduplicated.includes('#000000')) deduplicated.push('#000000');
          setExtractedBrandColors(deduplicated.slice(0, 10));
          setIsExtractingColors(false);
        })
        .catch(() => {
          if (isMounted) setIsExtractingColors(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [logoUrl, faviconUrl]);

  return (
    <div className="space-y-6">
      {/* 1. Logotipo e Ícone */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <ImageIcon className={`w-3.5 h-3.5 ${themeColorClass}`} />
            1. Logotipo e Ícone do Site (Favicon)
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Envie as imagens de marca da sua clínica (opcional).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Logotipo em Imagem</span>
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">Opcional</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Se não enviado, o sistema utilizará o Nome da Psicóloga em formato tipográfico.</p>
            {logoUrl ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/40">
                <div className="flex items-center gap-2 max-w-[80%]">
                  <img src={logoUrl} alt="Logo" className="h-7 object-contain rounded" />
                  <span className="text-[11px] text-slate-650 dark:text-slate-400 truncate font-semibold">Logotipo ativo</span>
                </div>
                <button type="button" onClick={() => setLogoUrl('')} className="text-xs text-red-500 dark:text-red-400 hover:underline font-semibold cursor-pointer bg-transparent border-none">Remover</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setMediaTarget('logo'); setMediaModalOpen(true); }}
                className="w-full py-3.5 px-3 rounded-xl border border-dashed border-slate-350 dark:border-zinc-800 hover:border-violet-500 dark:hover:border-violet-400 text-xs text-slate-700 dark:text-slate-350 flex items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50/50 dark:bg-black/10"
              >
                <Upload className={`h-4 w-4 ${themeColorClass}`} />
                <span>Selecionar Logotipo</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Ícone do Site (Favicon)</span>
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">Opcional</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Ícone exibido na aba do navegador e no símbolo decorativo da marca.</p>
            {faviconUrl ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/40">
                <div className="flex items-center gap-2">
                  <img src={faviconUrl} alt="Favicon" className="h-7 w-7 object-contain rounded-md" />
                  <span className="text-[11px] text-slate-650 dark:text-slate-405 truncate font-semibold">Ícone ativo</span>
                </div>
                <button type="button" onClick={() => setFaviconUrl('')} className="text-xs text-red-500 dark:text-red-400 hover:underline font-semibold cursor-pointer bg-transparent border-none">Remover</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setMediaTarget('favicon'); setMediaModalOpen(true); }}
                className="w-full py-3.5 px-3 rounded-xl border border-dashed border-slate-350 dark:border-zinc-800 hover:border-violet-500 dark:hover:border-violet-400 text-xs text-slate-700 dark:text-slate-350 flex items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50/50 dark:bg-black/10"
              >
                <Upload className={`h-4 w-4 ${themeColorClass}`} />
                <span>Selecionar Favicon</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Paleta de Cores */}
      <div className="pt-6 border-t border-slate-200 dark:border-zinc-800/80 space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Palette className={`w-3.5 h-3.5 ${themeColorClass}`} />
            2. Paleta de Cores
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Escolha uma paleta de cores pronta ou defina suas cores personalizadas.
          </p>
        </div>

        <ColorPaletteSelector
          primaryColor={primaryColor}
          setPrimaryColor={setPrimaryColor}
          secondaryColor={secondaryColor}
          setSecondaryColor={setSecondaryColor}
          contrastColor={contrastColor}
          setContrastColor={setContrastColor}
          bgColor={bgColor}
          setBgColor={setBgColor}
          logoUrl={logoUrl}
          faviconUrl={faviconUrl}
          extractedBrandColors={extractedBrandColors}
          isExtractingColors={isExtractingColors}
          isCustomColor={isCustomColor}
          setIsCustomColor={setIsCustomColor}
          selectedPalette={selectedPalette}
          setSelectedPalette={setSelectedPalette}
          themeColorClass={themeColorClass}
        />
      </div>

      {/* 3. Tipografia & Fontes */}
      <div className="pt-6 border-t border-slate-200 dark:border-zinc-800/80 space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Type className={`w-3.5 h-3.5 ${themeColorClass}`} />
            3. Tipografia &amp; Fontes
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Escolha as fontes que definem a personalidade dos títulos e textos do seu site.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FontPicker
            label="Fonte dos Títulos (Cabeçalhos)"
            type="heading"
            value={fontHeading}
            onChange={setFontHeading}
          />
          <FontPicker
            label="Fonte do Texto Principal (Parágrafos)"
            type="body"
            value={fontBody}
            onChange={setFontBody}
          />
        </div>
      </div>

      {/* 4. Prévia em Tempo Real */}
      <div className="pt-6 border-t border-slate-200 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sparkles className={`w-3.5 h-3.5 ${themeColorClass}`} />
            4. Prévia em Tempo Real da Marca
          </h3>
          <span className="text-[10px] text-slate-500 font-medium">
            {logoUrl ? 'Modo: Imagem Enviada' : 'Modo: Logotipo HTML Tipográfico'}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-black/10 space-y-4 shadow-sm">
          <div className="space-y-1.5">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
              Visualização no Cabeçalho do Site:
            </span>
            <div
              className="p-3 rounded-lg flex items-center justify-between border border-slate-200 dark:border-zinc-800 shadow-sm"
              style={{ backgroundColor: bgColor }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo Preview" className="h-8 max-w-[180px] object-contain" />
              ) : (
                <div className="flex items-center gap-2.5">
                  {faviconUrl ? (
                    <img src={faviconUrl} alt="Ícone Preview" className="h-8 w-8 object-contain rounded-lg" />
                  ) : (
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                        color: contrastColor
                      }}
                    >
                      Ψ
                    </div>
                  )}
                  <span
                    className="text-base font-bold tracking-tight"
                    style={{ fontFamily: `'${fontHeading}', serif`, color: getContrastColor(bgColor) }}
                  >
                    {previewTitle || 'Nome do Consultório'}
                  </span>
                </div>
              )}
              <div
                className="h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center shadow-xs"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  color: contrastColor
                }}
              >
                Agendar
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
              Visualização na Aba do Navegador (Favicon):
            </span>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-t-lg bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-zinc-200 max-w-xs truncate">
              {faviconUrl ? (
                <img src={faviconUrl} alt="Favicon" className="h-3.5 w-3.5 object-contain rounded-sm" />
              ) : (
                <div
                  className="h-3.5 w-3.5 rounded-sm flex items-center justify-center text-[9px] font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    color: contrastColor
                  }}
                >
                  Ψ
                </div>
              )}
              <span className="truncate text-[11px] font-medium" style={{ fontFamily: `'${fontBody}', sans-serif` }}>
                {previewTitle || 'Nome do Consultório'} | Psicologia Clínica
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Media Library Modal */}
      {tenantId && (
        <MediaLibraryModal
          isOpen={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          tenantId={tenantId}
          resolution={mediaTarget === 'favicon' ? { width: 128, height: 128 } : { width: 400, height: 120 }}
          type="logotipo"
          onSelectImage={(asset: any) => {
            const url = typeof asset === 'string' ? asset : (asset?.url || asset);
            if (mediaTarget === 'favicon') setFaviconUrl(url);
            else setLogoUrl(url);
            setMediaModalOpen(false);
          }}
          uploadType={mediaTarget === 'favicon' ? 'icon' : 'logo'}
        />
      )}
    </div>
  );
}
