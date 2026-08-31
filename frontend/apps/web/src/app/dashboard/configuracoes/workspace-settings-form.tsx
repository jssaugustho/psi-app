'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api, Workspace, User, WorkspaceDomain } from '@/lib/api';
import { Card, Button, Input, Textarea } from '@psi/ui';
import { useBrand } from '@/context/BrandContext';
import { DomainManager } from '@/components/domain-manager';
import { getWorkspaceVisualIdentity } from '@/lib/visual-identity';
import { BrandIdentityForm } from '@/components/BrandIdentityForm';
import { COLOR_PALETTES } from '@/components/ColorPaletteSelector';
import { MediaLibraryModal } from '@/components/media-library-modal';
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
  RefreshCw,
  Type,
  Smartphone
} from 'lucide-react';

interface WorkspaceSettingsFormProps {
  tenant: Workspace;
  workspace?: Workspace;
  initialUser: User;
}

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


  // Modais
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'logo' | 'favicon' | 'avatar' | null>(null);

  // Carrega Identidade Visual da tabela
  useEffect(() => {
    if (currentWorkspace.id) {
      api.getVisualIdentity(currentWorkspace.id)
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

            // Determina se a paleta é customizada ou bate com algum preset
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
  }, [currentWorkspace.id]);

  // Domínio do workspace
  const [workspaceDomain, setWorkspaceDomain] = useState<WorkspaceDomain | null>(null);
  const [subdomainInput, setSubdomainInput] = useState('');
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);

  useEffect(() => {
    if (currentWorkspace.id) {
      api.getWorkspaceDomain(currentWorkspace.id)
        .then((d) => {
          setWorkspaceDomain(d);
          if (d) {
            setSubdomainInput(d.subdomain || '');
            setCustomDomainInput(d.customDomain || '');
          }
        })
        .catch(() => {});
    }
  }, [currentWorkspace.id]);



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
        bio,
        specialties,
        cityState,
        instagram,
        isOnlineService,
        defaultSiteAvatarUrl: logoUrl || null,
      });

      await api.saveVisualIdentity(currentWorkspace.id, {
        primaryColor,
        secondaryColor,
        contrastColor,
        bgColor,
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        fontHeading,
        fontBody,
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

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const cleanSub = subdomainInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (!cleanSub || cleanSub.length < 3) {
        throw new Error('O subdomínio deve ter ao menos 3 caracteres.');
      }

      if (cleanSub !== workspaceDomain?.subdomain) {
        if (subdomainAvailable === false) {
          throw new Error('Por favor, escolha um subdomínio disponível.');
        }
        if (!workspaceDomain?.subdomain) {
          await api.createWorkspaceDomain(currentWorkspace.id, cleanSub);
        } else {
          await api.updateWorkspaceDomain(currentWorkspace.id, cleanSub);
        }
      }

      const updatedDomain = await api.getWorkspaceDomain(currentWorkspace.id);
      setWorkspaceDomain(updatedDomain);
      if (updatedDomain) {
        setSubdomainInput(updatedDomain.subdomain || '');
        setCustomDomainInput(updatedDomain.customDomain || '');
      }

      await reloadBrand();
      setMessage({ type: 'success', text: 'Configurações de domínio salvas com sucesso!' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Falha ao salvar domínio.' });
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
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none ${
            activeTab === 'perfil'
              ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-md'
              : 'text-zinc-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
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
              : 'text-zinc-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
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
              : 'text-zinc-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
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
              : 'text-zinc-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Biblioteca de Mídias</span>
        </button>
      </div>

      {/* Conteúdo Aba Perfil */}
      {activeTab === 'perfil' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-6 bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800/80">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-violet-400" />
              Informações Gerais do Atendimento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Nome de Exibição / Clínica</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Dra. Juliana Silva" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Cidade / Estado</label>
                <Input value={cityState} onChange={(e) => setCityState(e.target.value)} placeholder="Ex: São Paulo / SP" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Instagram Profissional</label>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seu.perfil" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Biografia Resumida</label>
              <Textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte sobre sua trajetória, abordagem clínica e compromisso com os pacientes..."
              />
            </div>

            {/* Especialidades */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Especialidades & Áreas de Atuação</label>
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
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-all border border-slate-200 dark:border-zinc-700/50 cursor-pointer"
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
          <Card className="p-6 space-y-6 bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800/80">
            <BrandIdentityForm
              previewTitle={name}
              tenantId={currentWorkspace.id}
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
        <form onSubmit={handleSaveDomain} className="space-y-6">
          <Card className="p-6 bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800/80 space-y-4">
            <DomainManager
              tenantId={currentWorkspace.id}
              subdomain={subdomainInput}
              onSubdomainChange={(val) => {
                setSubdomainInput(val);
                setSubdomainAvailable(null);
              }}
              customDomain={customDomainInput}
              onCustomDomainChange={(val) => setCustomDomainInput(val)}
              readOnlySubdomain={Boolean(workspaceDomain?.subdomain)}
              readOnlyCustomDomain={Boolean(workspaceDomain?.customDomain)}
              subdomainAvailable={subdomainAvailable}
              checkingSubdomain={checkingSubdomain}
              onCheckSubdomain={async (sub) => {
                setCheckingSubdomain(true);
                try {
                  const res = await api.checkSubdomainAvailability(sub, currentWorkspace.id);
                  setSubdomainAvailable(res.available);
                } catch {
                  setSubdomainAvailable(null);
                } finally {
                  setCheckingSubdomain(false);
                }
              }}
            />
            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                disabled={saving || (subdomainInput !== workspaceDomain?.subdomain && subdomainAvailable === false)}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold"
              >
                {saving ? 'Salvando...' : 'Salvar Domínio'}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Conteúdo Aba Mídias */}
      {activeTab === 'midias' && (
        <Card className="p-6 bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
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
          resolution={mediaTarget === 'favicon' ? { width: 128, height: 128 } : { width: 400, height: 120 }}
          type={mediaTarget === 'logo' || mediaTarget === 'favicon' ? 'logotipo' : 'imagem'}
          onSelectImage={(asset: any) => {
            const url = typeof asset === 'string' ? asset : (asset?.url || asset || '');
            if (mediaTarget === 'logo') {
              setLogoUrl(url);
            }
            if (mediaTarget === 'favicon') {
              setFaviconUrl(url);
            }
            setMediaModalOpen(false);
          }}
          uploadType={mediaTarget === 'favicon' ? 'icon' : mediaTarget === 'logo' ? 'logo' : 'asset'}
        />
      )}
    </div>
  );
}

// Alias de Compatibilidade
export const TenantSettingsForm = WorkspaceSettingsForm;
