'use client';

import React from 'react';
import { CanvasData, NavbarConfig, NavbarLink } from '../types';
import { Input, Button } from '@psi/ui';
import { Compass, Plus, Trash2, Link as LinkIcon, Check, Sparkles } from 'lucide-react';

interface NavbarPanelProps {
  canvasData: CanvasData | null;
  onUpdateNavbar: (patch: Partial<NavbarConfig>) => void;
}

export function NavbarPanel({ canvasData, onUpdateNavbar }: NavbarPanelProps) {
  const navbar: NavbarConfig = canvasData?.navbar || {
    enabled: true,
    logoMode: 'workspace',
    sticky: true,
    links: [],
    showCtaButton: true,
    ctaButtonText: 'Agendar Consulta',
    ctaButtonAction: 'cta_primary',
  };

  const sections = canvasData?.sections || [];

  // Mapeia todas as seções ativas da página para o menu
  const handleMapAllSections = () => {
    const links: NavbarLink[] = sections.map((sec, idx) => ({
      id: crypto.randomUUID(),
      label: sec.label || `Seção ${idx + 1}`,
      targetType: 'section',
      sectionId: sec.id,
    }));

    onUpdateNavbar({ links });
  };

  const handleToggleSectionLink = (secId: string, secLabel: string) => {
    const existingIndex = navbar.links.findIndex((l) => l.sectionId === secId);
    let updatedLinks = [...navbar.links];

    if (existingIndex !== -1) {
      updatedLinks.splice(existingIndex, 1);
    } else {
      updatedLinks.push({
        id: crypto.randomUUID(),
        label: secLabel,
        targetType: 'section',
        sectionId: secId,
      });
    }

    onUpdateNavbar({ links: updatedLinks });
  };

  const handleAddCustomLink = () => {
    const newLink: NavbarLink = {
      id: crypto.randomUUID(),
      label: 'Novo Link',
      targetType: 'external_url',
      externalUrl: 'https://',
    };
    onUpdateNavbar({ links: [...navbar.links, newLink] });
  };

  const handleUpdateLink = (linkId: string, patch: Partial<NavbarLink>) => {
    const links = navbar.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l));
    onUpdateNavbar({ links });
  };

  const handleRemoveLink = (linkId: string) => {
    const links = navbar.links.filter((l) => l.id !== linkId);
    onUpdateNavbar({ links });
  };

  return (
    <div className="p-4 space-y-6 text-xs">
      {/* Header do Painel da Navbar */}
      <div className="flex items-center gap-2 border-b border-[var(--surface-border)] pb-3">
        <div className="p-2 rounded-xl brand-accent text-white shadow-sm">
          <Compass className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-xs">Menu de Navegação (Navbar)</h3>
          <p className="text-[10px] text-slate-500">Cabeçalho com logo, links de seções e botão CTA.</p>
        </div>
      </div>

      {/* 1. ATIVAR / DESATIVAR NAVBAR */}
      <div className="glass-card p-3.5 rounded-2xl border border-[var(--surface-border)] space-y-3">
        <label className="flex items-center justify-between cursor-pointer font-bold text-slate-800 dark:text-slate-200">
          <span>Exibir Cabeçalho no Site</span>
          <input
            type="checkbox"
            checked={navbar.enabled}
            onChange={(e) => onUpdateNavbar({ enabled: e.target.checked })}
            className="w-4 h-4 rounded text-[var(--brand-gradient-start)] cursor-pointer"
          />
        </label>

        {navbar.enabled && (
          <label className="flex items-center justify-between cursor-pointer text-slate-600 dark:text-slate-400 font-semibold pt-2 border-t border-[var(--surface-border)]">
            <span>Fixar no Topo ao Rolar (Sticky)</span>
            <input
              type="checkbox"
              checked={navbar.sticky}
              onChange={(e) => onUpdateNavbar({ sticky: e.target.checked })}
              className="w-3.5 h-3.5 rounded text-[var(--brand-gradient-start)] cursor-pointer"
            />
          </label>
        )}
      </div>

      {navbar.enabled && (
        <>
          {/* 2. MAPEAMENTO DE SEÇÕES DA PÁGINA */}
          <div className="glass-card p-3.5 rounded-2xl border border-[var(--surface-border)] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Seções Vinculadas no Menu
              </h4>
              <button
                type="button"
                onClick={handleMapAllSections}
                className="text-[9px] font-bold text-[var(--brand-gradient-start)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Mapear Todas
              </button>
            </div>

            {sections.length > 0 ? (
              <div className="space-y-1.5">
                {sections.map((sec) => {
                  const isMapped = navbar.links.some((l) => l.sectionId === sec.id);
                  return (
                    <label
                      key={sec.id}
                      className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isMapped
                          ? 'border-[var(--brand-gradient-start)] bg-[var(--brand-gradient-start)]/5 font-bold'
                          : 'border-[var(--surface-border)] glass-sm'
                      }`}
                    >
                      <span className="truncate max-w-[180px]">{sec.label || 'Seção sem título'}</span>
                      <input
                        type="checkbox"
                        checked={isMapped}
                        onChange={() => handleToggleSectionLink(sec.id, sec.label || 'Seção')}
                        className="w-3.5 h-3.5 rounded text-[var(--brand-gradient-start)]"
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400">Nenhuma seção encontrada no canvas.</p>
            )}
          </div>

          {/* 3. GERENCIADOR DE LINKS DO MENU */}
          <div className="glass-card p-3.5 rounded-2xl border border-[var(--surface-border)] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Itens do Menu ({navbar.links.length})
              </h4>
              <button
                type="button"
                onClick={handleAddCustomLink}
                className="text-[9px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Link Externo
              </button>
            </div>

            {navbar.links.length > 0 ? (
              <div className="space-y-2">
                {navbar.links.map((link) => (
                  <div
                    key={link.id}
                    className="p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        type="text"
                        value={link.label}
                        onChange={(e) => handleUpdateLink(link.id, { label: e.target.value })}
                        placeholder="Rótulo no Menu"
                        className="text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(link.id)}
                        className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {link.targetType === 'external_url' && (
                      <Input
                        type="text"
                        value={link.externalUrl || ''}
                        onChange={(e) => handleUpdateLink(link.id, { externalUrl: e.target.value })}
                        placeholder="https://..."
                        className="text-[10px] font-mono"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400">Nenhum item adicionado ao menu.</p>
            )}
          </div>

          {/* 4. BOTÃO CTA NO CABEÇALHO */}
          <div className="glass-card p-3.5 rounded-2xl border border-[var(--surface-border)] space-y-3">
            <label className="flex items-center justify-between cursor-pointer font-bold text-slate-800 dark:text-slate-200">
              <span>Exibir Botão de Ação no Topo</span>
              <input
                type="checkbox"
                checked={navbar.showCtaButton}
                onChange={(e) => onUpdateNavbar({ showCtaButton: e.target.checked })}
                className="w-4 h-4 rounded text-[var(--brand-gradient-start)] cursor-pointer"
              />
            </label>

            {navbar.showCtaButton && (
              <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Texto do Botão Topo</span>
                  <Input
                    type="text"
                    value={navbar.ctaButtonText || 'Agendar Consulta'}
                    onChange={(e) => onUpdateNavbar({ ctaButtonText: e.target.value })}
                    className="text-xs font-bold"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
