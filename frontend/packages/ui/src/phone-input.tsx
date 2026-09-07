'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import {
  COUNTRY_LIST,
  CountryConfig,
  getCountryByCodeOrDial,
  formatNationalPhone,
  toE164,
  parseE164,
  isValidPhoneNumber,
} from './phone-utils';

export interface PhoneInputDetails {
  countryCode: string;
  dialCode: string;
  nationalNumber: string;
  formatted: string;
  e164: string;
  isValid: boolean;
}

export interface PhoneInputProps {
  value?: string;
  onChange?: (e164Value: string, details: PhoneInputDetails) => void;
  defaultCountry?: string;
  disabled?: boolean;
  error?: boolean | string;
  className?: string;
  placeholder?: string;
  id?: string;
}

/**
 * Renderizador de Bandeira em Vetor SVG (FlagCDN) com fallback gracioso para Emoji/ISO.
 */
export function CountryFlag({
  code,
  flag,
  className = 'w-5 h-3.5',
}: {
  code: string;
  flag?: string;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const lowerCode = code.toLowerCase();

  if (imgError) {
    return <span className="text-xs select-none">{flag || code}</span>;
  }

  return (
    <img
      src={`https://flagcdn.com/${lowerCode}.svg`}
      alt={code}
      loading="lazy"
      onError={() => setImgError(true)}
      className={`inline-block object-cover rounded-[2px] shadow-2xs shrink-0 border border-black/10 dark:border-white/10 ${className}`}
    />
  );
}

export function PhoneInput({
  value = '',
  onChange,
  defaultCountry = 'BR',
  disabled = false,
  error = false,
  className = '',
  placeholder,
  id,
}: PhoneInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);

  // Parser do valor inicial para extrair o país e o número local
  const initialParsed = parseE164(value, defaultCountry);
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(initialParsed.country);
  const [nationalValue, setNationalValue] = useState<string>(initialParsed.formatted);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sincroniza estado interno quando a prop `value` mudar externamente
  useEffect(() => {
    if (!value) {
      setNationalValue('');
      return;
    }
    const parsed = parseE164(value, selectedCountry.code);
    setSelectedCountry(parsed.country);
    setNationalValue(parsed.formatted);
  }, [value]);

  // Fecha o overlay de países ao clicar fora ou pressionar ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectCountry = (newCountry: CountryConfig) => {
    setSelectedCountry(newCountry);
    setIsOpen(false);
    setSearchQuery('');

    // Formata o número nacional existente com a nova máscara
    const cleanDigits = nationalValue.replace(/\D/g, '');
    const newFormatted = formatNationalPhone(cleanDigits, newCountry);
    setNationalValue(newFormatted);

    const e164 = toE164(cleanDigits, newCountry.code);
    const valid = isValidPhoneNumber(e164, newCountry.code);

    if (onChange) {
      onChange(e164, {
        countryCode: newCountry.code,
        dialCode: newCountry.dialCode,
        nationalNumber: cleanDigits,
        formatted: newFormatted,
        e164,
        isValid: valid,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const cleanDigits = rawInput.replace(/\D/g, '');

    // Limita ao número máximo de dígitos do país
    const limitedDigits = cleanDigits.substring(0, selectedCountry.maxDigits);
    const formatted = formatNationalPhone(limitedDigits, selectedCountry);

    setNationalValue(formatted);

    const e164 = toE164(limitedDigits, selectedCountry.code);
    const valid = isValidPhoneNumber(e164, selectedCountry.code);

    if (onChange) {
      onChange(e164, {
        countryCode: selectedCountry.code,
        dialCode: selectedCountry.dialCode,
        nationalNumber: limitedDigits,
        formatted,
        e164,
        isValid: valid,
      });
    }
  };

  const filteredCountries = COUNTRY_LIST.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dialCode.includes(q)
    );
  });

  const hasError = Boolean(error);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center rounded-xl border border-[var(--surface-border)] bg-slate-50/50 dark:bg-black/20 text-slate-900 dark:text-slate-100 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 ${
        hasError ? '!border-rose-500/80 focus-within:!border-rose-500' : ''
      } ${className}`}
    >
      {/* Botão Gatilho do Seletor de País (com Bandeira Vetorial SVG) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center shrink-0 border-r border-[var(--surface-border)] bg-slate-100/60 dark:bg-zinc-800/60 hover:bg-slate-200/80 dark:hover:bg-zinc-700/80 rounded-l-xl px-2.5 h-9 transition-colors cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none gap-1.5"
        title="Selecionar país"
      >
        <CountryFlag code={selectedCountry.code} flag={selectedCountry.flag} />
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {selectedCountry.dialCode}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Overlay Dropdown de Países com Bandeiras Vetoriais */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-64 z-[999] glass-lg rounded-xl border border-[var(--surface-border)] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl py-1.5 max-h-64 overflow-y-auto animate-in fade-in duration-150">
          <div className="px-2 pb-1.5 mb-1 border-b border-[var(--surface-border)] sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl z-10 pt-1">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar país ou DDI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-[var(--surface-border)] bg-slate-100/80 dark:bg-zinc-800/80 text-slate-900 dark:text-white outline-none focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>

          {filteredCountries.length > 0 ? (
            filteredCountries.map((c) => {
              const isSelected = c.code === selectedCountry.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCountry(c)}
                  className={`flex items-center justify-between w-full px-3 py-2 text-xs transition-all cursor-pointer border-none ${
                    isSelected
                      ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <CountryFlag code={c.code} flag={c.flag} />
                    <span className="font-semibold truncate">{c.name}</span>
                  </div>
                  <span
                    className={`text-[11px] font-mono shrink-0 ml-2 ${
                      isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {c.dialCode}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-xs text-center text-slate-400 dark:text-zinc-500">
              Nenhum país encontrado
            </div>
          )}
        </div>
      )}

      {/* Input de Número Local com Máscara Dinâmica */}
      <input
        id={inputId}
        type="tel"
        value={nationalValue}
        onChange={handleInputChange}
        disabled={disabled}
        placeholder={placeholder || selectedCountry.placeholder}
        className="w-full h-9 px-3 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none disabled:opacity-50"
      />
    </div>
  );
}
