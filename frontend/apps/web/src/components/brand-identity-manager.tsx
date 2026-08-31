'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api, Workspace } from '@/lib/api';
import { Card, Button } from '@psi/ui';
import { getWorkspaceVisualIdentity } from '@/lib/visual-identity';
import { BrandIdentityForm } from '@/components/BrandIdentityForm';
import { COLOR_PALETTES } from '@/components/ColorPaletteSelector';

interface BrandIdentityManagerProps {
  workspace: Workspace;
  onSaved?: () => void;
  saveButtonLabel?: string;
  showSkip?: boolean;
  onSkip?: () => void;
}

export function BrandIdentityManager({
  workspace,
  onSaved,
  saveButtonLabel = 'Salvar Identidade Visual',
  showSkip = false,
  onSkip,
}: BrandIdentityManagerProps) {
  const visualIdentity = getWorkspaceVisualIdentity(workspace);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [primaryColor, setPrimaryColor] = useState(visualIdentity.primaryColor || '#458270');
  const [secondaryColor, setSecondaryColor] = useState(visualIdentity.secondaryColor || '#A64E2B');
  const [contrastColor, setContrastColor] = useState(visualIdentity.contrastColor || '#FFFFFF');
  const [bgColor, setBgColor] = useState(visualIdentity.bgColor || '#09090B');
  const [logoUrl, setLogoUrl] = useState(visualIdentity.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(visualIdentity.faviconUrl || '');
  const [fontHeading, setFontHeading] = useState(visualIdentity.fontHeading || 'Playfair Display');
  const [fontBody, setFontBody] = useState(visualIdentity.fontBody || 'Plus Jakarta Sans');

  const [selectedPalette, setSelectedPalette] = useState(COLOR_PALETTES[0]);
  const [isCustomColor, setIsCustomColor] = useState(false);

  // Carrega identidade visual existente
  useEffect(() => {
    if (workspace.id) {
      api.getVisualIdentity(workspace.id)
        .then((vi) => {
          if (vi) {
            setPrimaryColor(vi.primaryColor || '#458270');
            setSecondaryColor(vi.secondaryColor || '#A64E2B');
            setContrastColor(vi.contrastColor || '#FFFFFF');
            setBgColor(vi.bgColor || '#09090B');
            setLogoUrl(vi.logoUrl || '');
            setFaviconUrl(vi.faviconUrl || '');
            setFontHeading(vi.fontHeading || 'Playfair Display');
            setFontBody(vi.fontBody || 'Plus Jakarta Sans');
            const matchingPalette = COLOR_PALETTES.find(
              p => p.primaryStart.toLowerCase() === (vi.primaryColor || '').toLowerCase()
            );
            if (matchingPalette) {
              setSelectedPalette(matchingPalette);
              setIsCustomColor(false);
            } else {
              setIsCustomColor(true);
            }
          }
        })
        .catch(() => {});
    }
  }, [workspace.id]);
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.saveVisualIdentity(workspace.id, {
        primaryColor,
        secondaryColor,
        contrastColor,
        bgColor,
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        fontHeading,
        fontBody,
      });
      setMessage({ type: 'success', text: 'Identidade visual salva com sucesso!' });
      onSaved?.();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Falha ao salvar identidade visual.' });
    } finally {
      setSaving(false);
    }
  };



  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card className="p-6 space-y-6 bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800/80">
        <BrandIdentityForm
          previewTitle={workspace.name}
          tenantId={workspace.id}
          logoUrl={logoUrl}
          setLogoUrl={setLogoUrl}
          faviconUrl={faviconUrl}
          setFaviconUrl={setFaviconUrl}
          primaryColor={primaryColor}
          setPrimaryColor={setPrimaryColor}
          secondaryColor={secondaryColor}
          setSecondaryColor={setSecondaryColor}
          contrastColor={contrastColor}
          setContrastColor={setContrastColor}
          bgColor={bgColor}
          setBgColor={setBgColor}
          fontHeading={fontHeading}
          setFontHeading={setFontHeading}
          fontBody={fontBody}
          setFontBody={setFontBody}
          isCustomColor={isCustomColor}
          setIsCustomColor={setIsCustomColor}
          selectedPalette={selectedPalette}
          setSelectedPalette={setSelectedPalette}
        />

        {/* Mensagem e Botoes */}
        {message && (
          <div className={`text-sm p-3 rounded-lg text-center font-medium ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="pt-4 flex items-center justify-between gap-3">
          {showSkip && onSkip && (
            <button type="button" onClick={onSkip} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer">
              Pular etapa
            </button>
          )}
          <Button type="submit" disabled={saving} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold ml-auto">
            {saving ? 'Salvando...' : saveButtonLabel}
          </Button>
        </div>
      </Card>
    </form>
  );
}
