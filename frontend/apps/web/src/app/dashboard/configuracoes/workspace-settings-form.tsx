'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api, Workspace, User } from '@/lib/api';
import { Card, Button, Input, Textarea } from '@psi/ui';
import { useBrand } from '@/context/BrandContext';
import { MediaLibraryModal } from '@/components/media-library-modal';
import { LogoOptionModal } from '@/components/logo-option-modal';
import { LogoBuilderModal } from '@/components/logo-builder-modal';
import { DomainManager } from '@/components/domain-manager';
import { getWorkspaceVisualIdentity } from '@/lib/visual-identity';
import {
  User as UserIcon,
  Palette,
  Globe,
  Image as ImageIcon,
  Check,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Sparkles,
  Upload,
  AlertCircle,
  Camera,
  RefreshCw
} from 'lucide-react';

interface WorkspaceSettingsFormProps {
  tenant: Workspace;
  workspace?: Workspace;
  initialUser: User;
}

const COLOR_PRESETS = [
  { name: 'Terracota Nude', primary: '#CC8667', secondary: '#E6A88A', bg: '#FAFAFA', contrast: '#FFFFFF' },
  { name: 'Azul Sereno', primary: '#4F46E5', secondary: '#06B6D4', bg: '#F8FAFC', contrast: '#FFFFFF' },
  { name: 'Verde Botânico', primary: '#059669', secondary: '#34D399', bg: '#F0FDF4', contrast: '#FFFFFF' },
  { name: 'Rosa Fúcsia', primary: '#E11D48', secondary: '#FB7185', bg: '#FFF1F2', contrast: '#FFFFFF' },
  { name: 'Violeta Calmo', primary: '#7C3AED', secondary: '#A78BFA', bg: '#F5F3FF', contrast: '#FFFFFF' },
  { name: 'Âmbar Quente', primary: '#D97706', secondary: '#FBBF24', bg: '#FFFBEB', contrast: '#FFFFFF' },
  { name: 'Escuro Elegante', primary: '#CC8667', secondary: '#E6A88A', bg: '#09090B', contrast: '#FFFFFF' },
];

const DEFAULT_SPECIALTIES_PRESETS = [
  'Terapia Cognitivo-Comportamental (TCC)',
  'Psicanálise',
  'Ansiedade e Síndrome do Pânico',
  'Depressão e Transtornos do Humor',
  'Autoconhecimento e Autoestima',
  'Terapia de Casal e Relacionamentos',
  'Gestalt-Terapia',
  'Psicologia Positiva',
];

export function WorkspaceSettingsForm({ tenant, workspace, initialUser }: WorkspaceSettingsFormProps) {
  const currentWorkspace = workspace || tenant;
  const { reloadBrand } = useBrand();
  const visualIdentity = getWorkspaceVisualIdentity(currentWorkspace);

  const [activeTab, setActiveTab] = useState<'perfil' | 'marca' | 'dominio' | 'midias'>('perfil');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados dos Campos
  const [name, setName] = useState(currentWorkspace.name || '');
  const [crp, setCrp] = useState(currentWorkspace.crp || '');
  const [bio, setBio] = useState(currentWorkspace.bio || '');
  const [cityState, setCityState] = useState(currentWorkspace.cityState || '');
  const [instagram, setInstagram] = useState(currentWorkspace.instagram || '');
  const [isOnlineService, setIsOnlineService] = useState(currentWorkspace.isOnlineService ?? true);
  const [specialties, setSpecialties] = useState<string[]>(currentWorkspace.specialties || []);
  const [newSpecialty, setNewSpecialty] = useState('');

  // Identidade Visual
  const [primaryColor, setPrimaryColor] = useState(visualIdentity.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(visualIdentity.secondaryColor);
  const [contrastColor, setContrastColor] = useState(visualIdentity.contrastColor);
  const [logoUrl, setLogoUrl] = useState(visualIdentity.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(visualIdentity.faviconUrl || '');
  const [logoConfig, setLogoConfig] = useState(visualIdentity.logoConfig);

  // Modais
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'logo' | 'favicon' | 'avatar' | null>(null);
  const [logoOptionModalOpen, setLogoOptionModalOpen] = useState(false);
  const [logoBuilderModalOpen, setLogoBuilderModalOpen] = useState(false);

  const handleAddSpecialty = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !specialties.includes(trimmed)) {
      setSpecialties([...specialties, trimmed]);
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await api.updateTenantBranding(currentWorkspace.id, {
        name,
        crp,
        bio,
        specialties,
        cityState,
        instagram,
        isOnlineService,
        gradientColorStart: primaryColor,
        gradientColorEnd: secondaryColor,
        contrastColor,
        defaultSiteAvatarUrl: logoUrl || null,
        defaultSiteLogoUrl: logoUrl || null,
        defaultSiteFaviconUrl: faviconUrl || null,
        defaultSiteLogoConfig: logoConfig,
      });

      await reloadBrand();
      setMessage({ type: 'success', text: 'Configurações do workspace salvas com sucesso!' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Falha ao salvar configurações do workspace.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Mensagem Feedback */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-lg transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer bg-transparent border-none"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'perfil'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Perfil do Profissional</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('marca')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'marca'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Identidade Visual</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dominio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'dominio'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Domínios & Subdomínio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('midias')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'midias'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Biblioteca de Mídias</span>
        </button>
      </div>

      {/* Conteúdo Aba Perfil */}
      {activeTab === 'perfil' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-6 bg-zinc-900/60 border-zinc-800/80">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-violet-400" />
              Informações Gerais do Atendimento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome de Exibição / Clínica</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Dra. Juliana Silva" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">CRP (Registro Profissional)</label>
                <Input value={crp} onChange={(e) => setCrp(e.target.value)} placeholder="Ex: CRP 06/123456" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Cidade / Estado</label>
                <Input value={cityState} onChange={(e) => setCityState(e.target.value)} placeholder="Ex: São Paulo / SP" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Instagram Profissional</label>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seu.perfil" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Biografia Resumida</label>
              <Textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte sobre sua trajetória, abordagem clínica e compromisso com os pacientes..."
              />
            </div>

            {/* Especialidades */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300">Especialidades & Áreas de Atuação</label>
              <div className="flex gap-2">
                <Input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  placeholder="Adicionar especialidade..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSpecialty(newSpecialty);
                    }
                  }}
                />
                <Button type="button" onClick={() => handleAddSpecialty(newSpecialty)} className="shrink-0 bg-violet-600 hover:bg-violet-500">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Tags Sugeridas */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DEFAULT_SPECIALTIES_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddSpecialty(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all border border-zinc-700/50 cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              {/* Tags Ativas */}
              <div className="flex flex-wrap gap-2 pt-2">
                {specialties.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-semibold">
                    {item}
                    <button type="button" onClick={() => handleRemoveSpecialty(idx)} className="hover:text-rose-400 cursor-pointer bg-transparent border-none">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold">
                {saving ? 'Salvando...' : 'Salvar Perfil'}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Conteúdo Aba Marca */}
      {activeTab === 'marca' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-6 bg-zinc-900/60 border-zinc-800/80">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-violet-400" />
              Paleta de Cores do Consultório
            </h3>

            {/* Presets de Cores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setPrimaryColor(preset.primary);
                    setSecondaryColor(preset.secondary);
                    setContrastColor(preset.contrast);
                  }}
                  className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/60 hover:border-violet-500 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-4 h-4 rounded-full shadow-sm" style={{ background: preset.primary }} />
                    <span className="w-4 h-4 rounded-full shadow-sm" style={{ background: preset.secondary }} />
                  </div>
                  <span className="block text-xs font-bold text-zinc-200 group-hover:text-white">{preset.name}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Cor Primária</label>
                <div className="flex gap-2">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none" />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Cor Secundária</label>
                <div className="flex gap-2">
                  <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none" />
                  <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Cor de Contraste / Texto</label>
                <div className="flex gap-2">
                  <input type="color" value={contrastColor} onChange={(e) => setContrastColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none" />
                  <Input value={contrastColor} onChange={(e) => setContrastColor(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold">
                {saving ? 'Salvando...' : 'Salvar Identidade Visual'}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Conteúdo Aba Domínio */}
      {activeTab === 'dominio' && (
        <Card className="p-6 bg-zinc-900/60 border-zinc-800/80">
          <DomainManager
            tenantId={currentWorkspace.id}
            subdomain={currentWorkspace.slug || ''}
            onSubdomainChange={(val) => setName(val)}
            customDomain={currentWorkspace.domain || ''}
            onCustomDomainChange={(val) => {}}
          />
        </Card>
      )}

      {/* Conteúdo Aba Mídias */}
      {activeTab === 'midias' && (
        <Card className="p-6 bg-zinc-900/60 border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-violet-400" />
              Biblioteca de Fotos & Logotipos
            </h3>
            <Button
              type="button"
              onClick={() => {
                setMediaTarget(null);
                setMediaModalOpen(true);
              }}
              className="bg-violet-600 hover:bg-violet-500 text-xs"
            >
              Abrir Gerenciador de Arquivos
            </Button>
          </div>
        </Card>
      )}

      {/* Modais Compartilhados */}
      {mediaModalOpen && (
        <MediaLibraryModal
          tenantId={currentWorkspace.id}
          isOpen={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          onSelectImage={(asset: any) => {
            if (mediaTarget === 'logo') setLogoUrl(asset.url);
            if (mediaTarget === 'favicon') setFaviconUrl(asset.url);
            setMediaModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Alias de Compatibilidade
export const TenantSettingsForm = WorkspaceSettingsForm;
