"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Type, Check, ChevronDown, Plus, Search } from 'lucide-react'

interface FontOption {
  name: string;
  category: 'serif' | 'sans-serif' | 'display' | 'custom';
  isCustom?: boolean;
}

const GOOGLE_FONTS_HEADING: FontOption[] = [
  { name: 'Italiana', category: 'display' },
  { name: 'Playfair Display', category: 'serif' },
  { name: 'Cormorant Garamond', category: 'serif' },
  { name: 'Lora', category: 'serif' },
  { name: 'Bodoni Moda', category: 'serif' },
  { name: 'Prata', category: 'serif' },
  { name: 'Cinzel', category: 'serif' },
  { name: 'Outfit', category: 'sans-serif' },
  { name: 'Plus Jakarta Sans', category: 'sans-serif' },
  { name: 'Montserrat', category: 'sans-serif' },
  { name: 'Syne', category: 'display' },
];

const GOOGLE_FONTS_BODY: FontOption[] = [
  { name: 'Inter', category: 'sans-serif' },
  { name: 'Plus Jakarta Sans', category: 'sans-serif' },
  { name: 'Montserrat', category: 'sans-serif' },
  { name: 'Roboto', category: 'sans-serif' },
  { name: 'Open Sans', category: 'sans-serif' },
  { name: 'Lato', category: 'sans-serif' },
  { name: 'Poppins', category: 'sans-serif' },
  { name: 'Lora', category: 'serif' },
  { name: 'Source Sans 3', category: 'sans-serif' },
];

interface FontPickerProps {
  label: string;
  value: string;
  onChange: (fontName: string) => void;
  type: 'heading' | 'body';
  customFontName?: string;
  onOpenCustomFontModal: () => void;
}

export function FontPicker({
  label,
  value,
  onChange,
  type,
  customFontName,
  onOpenCustomFontModal,
}: FontPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const defaultFonts = type === 'heading' ? GOOGLE_FONTS_HEADING : GOOGLE_FONTS_BODY;

  // Build full list including custom font if present
  const allFonts: FontOption[] = [
    ...(customFontName ? [{ name: customFontName, category: 'custom' as const, isCustom: true }] : []),
    ...defaultFonts,
  ];

  // Lazy load fonts on popover open
  useEffect(() => {
    if (isOpen && !fontsLoaded) {
      const fontFamilies = defaultFonts.map(f => f.name.replace(/\s+/g, '+')).join('&family=');
      const href = `https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@400;600;700&display=swap`;
      
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
      setFontsLoaded(true);
    }
  }, [isOpen, fontsLoaded, defaultFonts]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const filteredFonts = allFonts.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-[#CC8667] flex items-center justify-between text-xs text-white transition-all cursor-pointer shadow-sm group"
      >
        <div className="flex items-center gap-2 truncate">
          <Type className="h-3.5 w-3.5 text-[#CC8667] shrink-0" />
          <span 
            className="truncate font-medium text-sm"
            style={{ fontFamily: `'${value}', sans-serif` }}
          >
            {value}
          </span>
          {customFontName && value === customFontName && (
            <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono shrink-0">
              Personalizada
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 group-hover:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Overlay Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl z-50 p-2 space-y-2 animate-in fade-in duration-150">
          {/* Search bar */}
          <div className="relative flex items-center">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5" />
            <input
              type="text"
              placeholder="Buscar fonte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#CC8667]"
            />
          </div>

          {/* Font options scroll list */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredFonts.map((font) => {
              const isSelected = value === font.name;
              return (
                <div
                  key={font.name}
                  onClick={() => {
                    onChange(font.name);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-[#CC8667]/15 border border-[#CC8667]/30 text-white' 
                      : 'hover:bg-zinc-900 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col">
                    <span 
                      className="text-base leading-tight"
                      style={{ fontFamily: `'${font.name}', sans-serif` }}
                    >
                      {font.name}
                    </span>
                    <span className="text-[9px] text-slate-500 capitalize">
                      {font.isCustom ? '★ Fonte Enviada' : font.category}
                    </span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-[#CC8667] shrink-0" />}
                </div>
              );
            })}

            {filteredFonts.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-500 italic">
                Nenhuma fonte encontrada com "{searchQuery}"
              </div>
            )}
          </div>

          {/* Plus Button: Upload Custom Font Trigger */}
          <div className="pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenCustomFontModal();
              }}
              className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-[#CC8667] text-[#CC8667] hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Subir Fonte Personalizada (.ttf / .otf)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
