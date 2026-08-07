'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, PipelineColumn } from '@/lib/api';
import { Card, Button, Input, Select } from '@psi/ui';
import { useBrand } from '@/context/BrandContext';
import { deriveEmailDomain } from '@/lib/email-domain';
import {
  Edit,
  Trash2,
  Plus,
  X,
  Settings
} from 'lucide-react';

interface TrafficSourceObj {
  id: string;
  name: string;
  color: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}

const PRESETS = [
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Fuchsia', hex: '#D946EF' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Lime', hex: '#84CC16' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Sky', hex: '#0EA5E9' },
  { name: 'Blue', hex: '#3B82F6' },
];

const normalizeTrafficSources = (sources: any[] | undefined | null): TrafficSourceObj[] => {
  if (!sources || !Array.isArray(sources)) {
    sources = ['Manual', 'Instagram', 'Google Ads', 'Facebook Ads', 'Webhook'];
  }
  return sources.map((src, idx) => {
    if (typeof src === 'string') {
      const id = src.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-');
      const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#14B8A6'];
      return {
        id,
        name: src,
        color: colors[idx % colors.length] || '#6366F1',
        utm_source: id,
        utm_medium: '',
        utm_campaign: '',
      };
    }
    return {
      id: src.id || src.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `source-${idx}`,
      name: src.name || 'Sem nome',
      color: src.color || '#6366F1',
      utm_source: src.utm_source || '',
      utm_medium: src.utm_medium || '',
      utm_campaign: src.utm_campaign || '',
    };
  });
};

const ColorPicker = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex items-center gap-3 py-2">
    <div className="relative flex-shrink-0">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0 overflow-hidden"
        style={{ appearance: 'none' }}
      />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold opacity-70 uppercase tracking-wide truncate">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full bg-transparent border-b border-slate-700 text-xs font-mono focus:outline-none focus:border-indigo-500 py-0.5 text-slate-200"
      />
    </div>
  </div>
);

const UploadBox = ({
  label,
  url,
  onUpload,
  onClear,
  uploading,
  previewBg,
}: {
  label: string;
  url: string;
  onUpload: (file: File) => void;
  onClear: () => void;
  uploading: boolean;
  previewBg: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">{label}</p>
      <div
        onClick={handleClick}
        className="relative flex items-center justify-center rounded-xl border-2 border-dashed border-slate-700/60 overflow-hidden cursor-pointer hover:border-slate-500/80 transition-all group"
        style={{ minHeight: 90, backgroundColor: previewBg }}
      >
        {url ? (
          <>
            <img src={url} alt={label} className="max-h-16 max-w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600 transition-colors shadow z-10 border-none cursor-pointer"
              title="Remover"
            >
              ✕
            </button>
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              Mudar
            </div>
          </>
        ) : (
          <div className="text-xs opacity-50 hover:opacity-100 transition-opacity py-4 px-6 flex flex-col items-center gap-1 text-slate-400">
            <span>{uploading ? '⏳ Enviando…' : '+ Adicionar'}</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </div>
  );
};

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  isPrimary: boolean;
  ownerId?: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  iconLightUrl: string | null;
  iconDarkUrl: string | null;
  gradientColorStart: string;
  gradientColorEnd: string;
  contrastColor: string;
  bgLightColor?: string;
  bgDarkColor?: string;
  cardLightColor?: string;
  cardDarkColor?: string;
  textLightColor?: string;
  textDarkColor?: string;
  emailDomain?: string | null;
  resendApiKey?: string | null;
  trafficSources?: string[];
  defaultTrafficSource?: string;
}

interface TenantSettingsFormProps {
  tenant: Tenant;
}

export default function TenantSettingsForm({ tenant }: TenantSettingsFormProps) {
  const { reloadBrand } = useBrand();
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<'geral' | 'visual' | 'email' | 'crm'>('geral');
  
  // Form State
  const [name, setName] = useState(tenant.name || '');
  const [slug, setSlug] = useState(tenant.slug || '');
  const [domain, setDomain] = useState(tenant.domain || '');
  
  // Cores
  const [gradientColorStart, setGradientColorStart] = useState(tenant.gradientColorStart || '#4F46E5');
  const [gradientColorEnd, setGradientColorEnd] = useState(tenant.gradientColorEnd || '#06B6D4');
  const [contrastColor, setContrastColor] = useState(tenant.contrastColor || '#FFFFFF');


  // Logos & Icons
  const [logoLightUrl, setLogoLightUrl] = useState(tenant.logoLightUrl || '');
  const [logoDarkUrl, setLogoDarkUrl] = useState(tenant.logoDarkUrl || '');
  const [iconLightUrl, setIconLightUrl] = useState(tenant.iconLightUrl || '');
  const [iconDarkUrl, setIconDarkUrl] = useState(tenant.iconDarkUrl || '');

  // Email Config
  const [emailDomain, setEmailDomain] = useState(tenant.emailDomain || '');

  // Domínio de envio efetivo:
  //   - usa emailDomain explícito se preenchido
  //   - senão deriva no-reply.<rootDomain> do domínio principal
  //   - o no-reply sempre fica no nível raiz, mesmo se o domínio já for um subdomínio
  const derivedEmailDomain = React.useMemo(() => {
    if (emailDomain.trim()) return emailDomain.trim();
    return deriveEmailDomain(domain) ?? '';
  }, [emailDomain, domain]);

  // CRM Config
  const [localTrafficSources, setLocalTrafficSources] = useState<TrafficSourceObj[]>(() => {
    return normalizeTrafficSources(tenant.trafficSources);
  });
  const [localDefaultSource, setLocalDefaultSource] = useState(tenant.defaultTrafficSource || 'Manual');
  const [activeCrmSubTab, setActiveCrmSubTab] = useState<'pipeline' | 'sources'>('pipeline');
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);

  // Estados de Edição do CRM
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnSlug, setNewColumnSlug] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#6366F1');
  const [newColumnCategory, setNewColumnCategory] = useState<'pendente' | 'acolhimento' | 'paciente' | 'alta' | 'negativa'>('acolhimento');

  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceColor, setNewSourceColor] = useState('#6366F1');
  const [newSourceUtmSource, setNewSourceUtmSource] = useState('');
  const [newSourceUtmMedium, setNewSourceUtmMedium] = useState('');
  const [newSourceUtmCampaign, setNewSourceUtmCampaign] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');



  // Carregar colunas do CRM
  const fetchColumns = useCallback(async () => {
    setColumnsLoading(true);
    try {
      const res = await api.getPipelineColumns(tenant.id);
      setColumns(res);
    } catch (err) {
      console.error('Erro ao buscar colunas do CRM:', err);
    } finally {
      setColumnsLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  // Adicionar coluna
  const handleAddColumn = async (name: string, slug: string, color: string, category: 'pendente' | 'acolhimento' | 'paciente' | 'alta' | 'negativa') => {
    const order = columns.length > 0 ? Math.max(...columns.map((c) => c.order)) + 1 : 1;
    try {
      await api.createPipelineColumn({
        tenant_id: tenant.id,
        name,
        slug,
        color,
        category,
        order,
      });
      await fetchColumns();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar estágio.');
    }
  };

  // Editar coluna
  const handleUpdateColumn = async (id: string, updates: Partial<PipelineColumn>) => {
    try {
      await api.updatePipelineColumn(id, updates);
      await fetchColumns();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar estágio.');
    }
  };

  // Deletar coluna
  const handleDeleteColumn = async (id: string) => {
    try {
      await api.deletePipelineColumn(id);
      await fetchColumns();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir estágio.');
    }
  };

  // Handle Logo/Icon Upload
  const handleUpload = async (field: 'logoLightUrl' | 'logoDarkUrl' | 'iconLightUrl' | 'iconDarkUrl', file: File) => {
    setUploadingField(field);
    setError('');
    setSuccess('');
    try {
      const uploadType = field.toLowerCase().includes('icon') ? 'icon' : 'logo';
      const res = await api.uploadImage(file, uploadType);
      if (res && res.url) {
        if (field === 'logoLightUrl') setLogoLightUrl(res.url);
        if (field === 'logoDarkUrl') setLogoDarkUrl(res.url);
        if (field === 'iconLightUrl') setIconLightUrl(res.url);
        if (field === 'iconDarkUrl') setIconDarkUrl(res.url);
        setSuccess('Upload realizado com sucesso! Salve o formulário para persistir.');
      } else {
        throw new Error('Retorno inválido do servidor de upload.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar upload do arquivo.');
    } finally {
      setUploadingField(null);
    }
  };

  // Submit Changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const payload = {
      name,
      slug: slug.trim().toLowerCase(),
      domain: domain.trim() || null,
      gradientColorStart,
      gradientColorEnd,
      contrastColor,
      logoLightUrl: logoLightUrl || null,
      logoDarkUrl: logoDarkUrl || null,
      iconLightUrl: iconLightUrl || null,
      iconDarkUrl: iconDarkUrl || null,
      emailDomain: emailDomain.trim() || null,
      traffic_sources: localTrafficSources as any,
      default_traffic_source: localDefaultSource
    };

    try {
      await api.updateTenantBranding(tenant.id, payload);
      setSuccess('Configurações atualizadas com sucesso!');
      await reloadBrand();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar as configurações.');
    } finally {
      setLoading(false);
    }
  };

  // Helper arrays for tabs
  const tabItems = [
    { id: 'geral', label: 'Geral & Identidade' },
    { id: 'visual', label: 'Identidade Visual' },
    { id: 'email', label: 'E-mail' },
    { id: 'crm', label: 'CRM & Tráfego' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Mensagens de status */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-xl text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-4 rounded-xl text-center">
          {success}
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-800/60 overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 text-sm font-semibold border-b-2 transition-all relative cursor-pointer"
            style={{
              borderColor: activeTab === tab.id ? 'var(--brand-gradient-start)' : 'transparent',
              color: activeTab === tab.id ? 'var(--brand-text-color)' : 'var(--brand-text-color)',
              opacity: activeTab === tab.id ? 1 : 0.55
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          {/* TAB 1: GERAL */}
          {activeTab === 'geral' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-100 mb-2">Informações Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome da Organização *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ex: Clínica Alpha"
                />
                <Input
                  label="Slug do Subdomínio *"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  placeholder="ex: clinica-alpha"
                  pattern="^[a-z0-9\-]+$"
                  title="Apenas letras minúsculas, números e hífens."
                />
                <div className="md:col-span-2">
                  <Input
                    label="Domínio Principal"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="Ex: clinicaalpha.com.br"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Domínio onde os usuários acessarão o sistema. Aponte um registro <strong>CNAME</strong> no seu DNS
                    para este servidor — o SSL é provisionado automaticamente via <strong>Cloudflare Custom Hostnames</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IDENTIDADE VISUAL */}
          {activeTab === 'visual' && (
            <div className="space-y-8">
              {/* 🖼️ Logotipos & Ícones */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">🖼️ Logotipos & Ícones (via Cloudflare R2)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <UploadBox
                    label="Logo (Tema Claro)"
                    url={logoLightUrl}
                    onUpload={(f) => handleUpload('logoLightUrl', f)}
                    onClear={() => setLogoLightUrl('')}
                    uploading={uploadingField === 'logoLightUrl'}
                    previewBg="#F8FAFC"
                  />
                  <UploadBox
                    label="Logo (Tema Escuro)"
                    url={logoDarkUrl}
                    onUpload={(f) => handleUpload('logoDarkUrl', f)}
                    onClear={() => setLogoDarkUrl('')}
                    uploading={uploadingField === 'logoDarkUrl'}
                    previewBg="#09090B"
                  />
                  <UploadBox
                    label="Ícone (Tema Claro)"
                    url={iconLightUrl}
                    onUpload={(f) => handleUpload('iconLightUrl', f)}
                    onClear={() => setIconLightUrl('')}
                    uploading={uploadingField === 'iconLightUrl'}
                    previewBg="#F8FAFC"
                  />
                  <UploadBox
                    label="Ícone (Tema Escuro)"
                    url={iconDarkUrl}
                    onUpload={(f) => handleUpload('iconDarkUrl', f)}
                    onClear={() => setIconDarkUrl('')}
                    uploading={uploadingField === 'iconDarkUrl'}
                    previewBg="#09090B"
                  />
                </div>
              </div>

              {/* Paleta de Cores */}
              <div className="space-y-4 pt-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1 pb-1 border-b border-slate-800">Botões & Gradiente</p>
                  <ColorPicker label="Cor Inicial" value={gradientColorStart} onChange={setGradientColorStart} />
                  <ColorPicker label="Cor Final" value={gradientColorEnd} onChange={setGradientColorEnd} />
                  <ColorPicker label="Contraste (texto em botões)" value={contrastColor} onChange={setContrastColor} />
                </div>
              </div>

              {/* Preview ao Vivo */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-50">Preview ao Vivo</h3>
                </div>

                {/* Mini AppShell Preview */}
                <div
                  className="rounded-2xl overflow-hidden border border-slate-700/40 flex shadow-2xl transition-all duration-300"
                  style={{
                    height: 220,
                    background: '#09090B',
                    color: '#F4F4F5',
                  }}
                >
                  {/* Mini Sidebar */}
                  <div
                    className="w-36 flex-shrink-0 p-3 flex flex-col justify-between border-r"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                      borderColor: 'rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        {logoDarkUrl ? (
                          <img src={logoDarkUrl} alt="Logo" className="max-h-6 max-w-[90px] object-contain" />
                        ) : iconDarkUrl ? (
                          <>
                            <img src={iconDarkUrl} alt="Icon" className="w-5 h-5 object-contain" />
                            <span className="text-xs font-bold truncate">{name || 'Organização'}</span>
                          </>
                        ) : (
                          <>
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                              style={{
                                background: `linear-gradient(135deg, ${gradientColorStart}, ${gradientColorEnd})`,
                                color: contrastColor,
                              }}
                            >
                              Ψ
                            </div>
                            <span className="text-xs font-bold truncate">{name || 'Organização'}</span>
                          </>
                        )}
                      </div>
                      <div className="space-y-1">
                        {['Dashboard', 'Agenda', 'CRM'].map((item, i) => (
                          <div
                            key={item}
                            className="px-2 py-1 rounded text-[10px] transition-all"
                            style={{
                              background: i === 2 ? `color-mix(in srgb, ${gradientColorStart} 15%, transparent)` : 'transparent',
                              color: i === 2 ? gradientColorStart : '#F4F4F5',
                              border: i === 2 ? `1px solid color-mix(in srgb, ${gradientColorStart} 30%, transparent)` : '1px solid transparent',
                              opacity: i === 2 ? 1 : 0.6,
                            }}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-[9px] opacity-40 truncate">usuario@exemplo.com</div>
                  </div>

                  {/* Right side */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* Mini Header */}
                    <div
                      className="h-8 shrink-0 flex items-center justify-end px-3 border-b"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderColor: 'rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <div
                        className="w-4.5 h-4.5 rounded flex items-center justify-center text-[8px] opacity-75 border"
                        style={{
                          borderColor: 'rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        ☀️
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 p-3 space-y-2 overflow-hidden">
                      <p className="text-xs font-bold">Configurações</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['Clínica', 'Agenda'].map((label) => (
                          <div
                            key={label}
                            className="rounded-lg p-2 text-[9px] border"
                            style={{
                              backgroundColor: '#0F172A',
                              borderColor: 'rgba(255, 255, 255, 0.06)',
                            }}
                          >
                            <span className="opacity-60">{label}</span>
                            <div className="font-bold text-[10px] mt-0.5" style={{ color: gradientColorStart }}>Ativo</div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="mt-1 px-3 py-1.5 rounded-lg text-[10px] font-bold border-none shadow cursor-default"
                        style={{
                          background: `linear-gradient(135deg, ${gradientColorStart}, ${gradientColorEnd})`,
                          color: contrastColor,
                        }}
                      >
                        Salvar Espaço
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EMAIL */}
          {activeTab === 'email' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-slate-100 mb-1">Configurações de Envio de E-mail</h3>
                <p className="text-xs text-slate-400">
                  Os e-mails desta organização serão enviados a partir de um subdomínio dedicado do seu domínio principal.
                </p>
              </div>

              {/* Domínio de envio derivado — preview ao vivo */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Endereço remetente padrão</p>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">no-reply@</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: derivedEmailDomain ? 'var(--brand-gradient-start)' : '#64748b' }}
                  >
                    {derivedEmailDomain || <span className="text-slate-600 font-normal italic">configure o domínio principal primeiro</span>}
                  </span>
                </div>
                {derivedEmailDomain && (
                  <p className="text-[10px] text-slate-500">
                    Os e-mails serão enviados como <strong className="text-slate-400">no-reply@{derivedEmailDomain}</strong>.
                    Este subdomínio é configurado automaticamente com base no domínio principal da organização.
                  </p>
                )}
              </div>

              {/* Override opcional */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Domínio de envio personalizado <span className="font-normal normal-case text-slate-600">(opcional)</span></p>
                <Input
                  label=""
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value)}
                  placeholder={derivedEmailDomain || 'no-reply.suaclínica.com.br'}
                />
                <p className="text-[10px] text-slate-600">
                  Deixe em branco para usar o padrão derivado do domínio principal. Preencha apenas se quiser um endereço de envio diferente.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: CRM */}
          {activeTab === 'crm' && (
            <div className="space-y-6">
              {/* Alternador de Abas Interno */}
              <div className="pt-2">
                <div className="flex gap-1 p-1 rounded-2xl w-fit glass-sm mb-4">
                  <button
                    type="button"
                    onClick={() => setActiveCrmSubTab('pipeline')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer"
                    style={
                      activeCrmSubTab === 'pipeline'
                        ? {
                            background: `linear-gradient(135deg, ${gradientColorStart}, ${gradientColorEnd})`,
                            color: contrastColor,
                            boxShadow: `0 2px 12px color-mix(in srgb, ${gradientColorStart} 25%, transparent)`,
                          }
                        : {
                            background: 'transparent',
                            color: 'var(--brand-text-color)',
                            opacity: 0.65,
                          }
                    }
                  >
                    Estágios do Funil
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCrmSubTab('sources')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer"
                    style={
                      activeCrmSubTab === 'sources'
                        ? {
                            background: `linear-gradient(135deg, ${gradientColorStart}, ${gradientColorEnd})`,
                            color: contrastColor,
                            boxShadow: `0 2px 12px color-mix(in srgb, ${gradientColorStart} 25%, transparent)`,
                          }
                        : {
                            background: 'transparent',
                            color: 'var(--brand-text-color)',
                            opacity: 0.65,
                          }
                    }
                  >
                    Fontes de Tráfego (UTMs)
                  </button>
                </div>
              </div>

              {/* Sub-Aba 1: Estágios do Funil */}
              {activeCrmSubTab === 'pipeline' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Gerenciar Estágios</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure os estágios clínicos da pipeline do CRM com slugs para integração externa, categorias (5 grupos) e cores.
                    </p>
                  </div>

                  {/* Listagem das colunas atuais */}
                  {columnsLoading ? (
                    <div className="text-xs text-slate-500 py-4 text-center">Carregando estágios...</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {columns.map((column, idx) => (
                        <div key={column.id} className="glass-sm flex items-center justify-between p-3 rounded-xl" style={{ borderLeft: `4px solid ${column.color || '#6366F1'}` }}>
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold text-slate-500 font-mono">
                              {(idx + 1).toString().padStart(2, '0')}
                            </span>
                            <div>
                              <span className="text-sm font-semibold text-slate-200">{column.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                slug: {column.slug || '-'} | grupo: {
                                  column.category === 'pendente' ? 'Pendente' :
                                  column.category === 'acolhimento' ? 'Em Acolhimento' :
                                  column.category === 'paciente' ? 'Paciente' :
                                  column.category === 'alta' ? 'Alta' :
                                  column.category === 'negativa' ? 'Negativa' : column.category || 'Em Acolhimento'
                                }
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingColumnId(column.id);
                                setNewColumnName(column.name);
                                setNewColumnSlug(column.slug || '');
                                setNewColumnColor(column.color || '#6366F1');
                                setNewColumnCategory(column.category || 'acolhimento');
                              }}
                              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-white/5 transition-colors border-none bg-transparent cursor-pointer"
                              title="Editar Estágio"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {columns.length > 3 && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Deseja mesmo remover a coluna "${column.name}"? Contatos voltarão para o estágio inicial.`)) {
                                    try {
                                      await handleDeleteColumn(column.id);
                                    } catch (err) {
                                      alert('Falha ao remover estágio.');
                                    }
                                  }
                                }}
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors border-none bg-transparent cursor-pointer"
                                title="Excluir Estágio"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form de adicionar/editar coluna */}
                  <div className="pt-4 border-t border-slate-800/60 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {editingColumnId ? `Editar Estágio: ${newColumnName}` : 'Criar Novo Estágio'}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">Nome do Estágio</label>
                        <input
                          type="text"
                          placeholder="Ex: Primeira Consulta"
                          value={newColumnName}
                          onChange={(e) => {
                            setNewColumnName(e.target.value);
                            if (!editingColumnId) {
                              setNewColumnSlug(e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                            }
                          }}
                          className="brand-input w-full px-3.5 py-2 text-sm rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">Integration Slug (Chave única)</label>
                        <input
                          type="text"
                          placeholder="Ex: primeira-consulta"
                          value={newColumnSlug}
                          onChange={(e) => setNewColumnSlug(e.target.value)}
                          className="brand-input w-full px-3.5 py-2 text-sm rounded-xl font-mono"
                        />
                      </div>
                      
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-semibold text-slate-500">Grupo / Categoria do Estágio</label>
                        <Select
                          value={newColumnCategory}
                          onChange={(e) => setNewColumnCategory(e.target.value as any)}
                          options={[
                            { value: 'pendente', label: 'Pendente' },
                            { value: 'acolhimento', label: 'Em Acolhimento' },
                            { value: 'paciente', label: 'Paciente (Tratamento Ativo)' },
                            { value: 'alta', label: 'Alta' },
                            { value: 'negativa', label: 'Negativa' },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Paleta de cores para Estágio */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 block">Cor do Estágio</label>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl glass-sm">
                        {PRESETS.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            onClick={() => setNewColumnColor(p.hex)}
                            className="w-5 h-5 rounded-full transition-all border-none cursor-pointer flex items-center justify-center shrink-0 hover:scale-110 active:scale-95"
                            style={{
                              backgroundColor: p.hex,
                              boxShadow: newColumnColor === p.hex ? `0 0 0 2px #ffffff, 0 0 6px ${p.hex}` : 'none'
                            }}
                            title={p.name}
                          >
                            {newColumnColor === p.hex && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </button>
                        ))}
                        <input
                          type="text"
                          placeholder="#hex"
                          value={newColumnColor}
                          onChange={(e) => setNewColumnColor(e.target.value)}
                          className="brand-input px-2 py-0.5 text-[10px] w-14 rounded-lg focus:outline-none font-mono ml-auto"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      {editingColumnId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingColumnId(null);
                            setNewColumnName('');
                            setNewColumnSlug('');
                            setNewColumnColor('#6366F1');
                            setNewColumnCategory('acolhimento');
                          }}
                          className="px-4 py-2 text-xs rounded-xl hover:bg-white/5 active:scale-95 transition-all bg-transparent border cursor-pointer"
                          style={{
                            borderColor: 'var(--surface-border)',
                            color: 'var(--brand-text-color)',
                          }}
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newColumnName.trim()) return;
                          const finalSlug = newColumnSlug.trim() || newColumnName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                          if (editingColumnId) {
                            await handleUpdateColumn(editingColumnId, {
                              name: newColumnName.trim(),
                              slug: finalSlug,
                              color: newColumnColor,
                              category: newColumnCategory
                            });
                            setEditingColumnId(null);
                          } else {
                            await handleAddColumn(newColumnName.trim(), finalSlug, newColumnColor, newColumnCategory);
                          }
                          setNewColumnName('');
                          setNewColumnSlug('');
                          setNewColumnColor('#6366F1');
                          setNewColumnCategory('acolhimento');
                        }}
                        className="px-5 py-2 text-xs font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all border-none cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${gradientColorStart}, ${gradientColorEnd})`,
                          color: contrastColor,
                        }}
                      >
                        {editingColumnId ? 'Salvar Alterações' : 'Criar Estágio'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Aba 2: Fontes de Tráfego */}
              {activeCrmSubTab === 'sources' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Fontes de Tráfego (UTMs)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure os canais pelos quais os leads chegam, atribuindo regras de UTM e badges de cores.
                    </p>
                  </div>

                  {/* Configuração de Fonte Padrão */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Fonte de Tráfego Padrão</label>
                    <Select
                      value={localDefaultSource}
                      onChange={(e) => setLocalDefaultSource(e.target.value)}
                      options={localTrafficSources.map((src) => ({ value: src.name, label: src.name }))}
                    />
                  </div>

                  {/* Listagem das fontes */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Canais Cadastrados</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {localTrafficSources.map((src) => (
                        <div key={src.id} className="glass-sm flex flex-col p-3 rounded-xl space-y-1.5" style={{ borderLeft: `4px solid ${src.color}` }}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-200">{src.name}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSourceId(src.id);
                                  setNewSourceName(src.name);
                                  setNewSourceColor(src.color || '#6366F1');
                                  setNewSourceUtmSource(src.utm_source || '');
                                  setNewSourceUtmMedium(src.utm_medium || '');
                                  setNewSourceUtmCampaign(src.utm_campaign || '');
                                }}
                                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-white/5 transition-colors border-none bg-transparent cursor-pointer"
                                title="Editar Canal"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              {localTrafficSources.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = localTrafficSources.filter(s => s.id !== src.id);
                                    setLocalTrafficSources(updated);
                                    if (localDefaultSource === src.name) {
                                      setLocalDefaultSource(updated[0]?.name || 'Manual');
                                    }
                                  }}
                                  className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors border-none bg-transparent cursor-pointer"
                                  title="Excluir Canal"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-mono">
                            <div><span className="text-slate-600">utm_source:</span> {src.utm_source || '-'}</div>
                            <div><span className="text-slate-600">utm_medium:</span> {src.utm_medium || '-'}</div>
                            <div><span className="text-slate-600">utm_campaign:</span> {src.utm_campaign || '-'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Form de adicionar fonte */}
                  <div className="pt-4 border-t border-slate-800/60 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {editingSourceId ? `Editar Canal: ${newSourceName}` : 'Criar Novo Canal'}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-semibold text-slate-500">Nome do Canal / Origem</label>
                        <input
                          type="text"
                          placeholder="Ex: Google Ads"
                          value={newSourceName}
                          onChange={(e) => {
                            setNewSourceName(e.target.value);
                            if (!editingSourceId) {
                              setNewSourceUtmSource(e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-'));
                            }
                          }}
                          className="brand-input w-full px-3.5 py-2 text-sm rounded-xl"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">UTM Source</label>
                        <input
                          type="text"
                          placeholder="Ex: google"
                          value={newSourceUtmSource}
                          onChange={(e) => setNewSourceUtmSource(e.target.value)}
                          className="brand-input w-full px-3.5 py-2 text-sm rounded-xl font-mono"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">UTM Medium</label>
                        <input
                          type="text"
                          placeholder="Ex: cpc"
                          value={newSourceUtmMedium}
                          onChange={(e) => setNewSourceUtmMedium(e.target.value)}
                          className="brand-input w-full px-3.5 py-2 text-sm rounded-xl font-mono"
                        />
                      </div>

                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-semibold text-slate-500">UTM Campaign (Opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: campanha-leads-agosto"
                          value={newSourceUtmCampaign}
                          onChange={(e) => setNewSourceUtmCampaign(e.target.value)}
                          className="brand-input w-full px-3.5 py-2 text-sm rounded-xl font-mono"
                        />
                      </div>
                    </div>

                    {/* Paleta de cores para Fonte de Tráfego */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-500 block">Cor de Identificação</label>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl glass-sm">
                        {PRESETS.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            onClick={() => setNewSourceColor(p.hex)}
                            className="w-5 h-5 rounded-full transition-all border-none cursor-pointer flex items-center justify-center shrink-0 hover:scale-110 active:scale-95"
                            style={{
                              backgroundColor: p.hex,
                              boxShadow: newSourceColor === p.hex ? `0 0 0 2px #ffffff, 0 0 6px ${p.hex}` : 'none'
                            }}
                            title={p.name}
                          >
                            {newSourceColor === p.hex && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </button>
                        ))}
                        <input
                          type="text"
                          placeholder="#hex"
                          value={newSourceColor}
                          onChange={(e) => setNewSourceColor(e.target.value)}
                          className="brand-input px-2 py-0.5 text-[10px] w-14 rounded-lg focus:outline-none font-mono ml-auto"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      {editingSourceId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSourceId(null);
                            setNewSourceName('');
                            setNewSourceColor('#6366F1');
                            setNewSourceUtmSource('');
                            setNewSourceUtmMedium('');
                            setNewSourceUtmCampaign('');
                          }}
                          className="px-4 py-2 text-xs rounded-xl hover:bg-white/5 active:scale-95 transition-all bg-transparent border cursor-pointer"
                          style={{
                            borderColor: 'var(--surface-border)',
                            color: 'var(--brand-text-color)',
                          }}
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const nameVal = newSourceName.trim();
                          if (!nameVal) return;
                          const idVal = editingSourceId || nameVal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-');
                          
                          const newSource: TrafficSourceObj = {
                            id: idVal,
                            name: nameVal,
                            color: newSourceColor,
                            utm_source: newSourceUtmSource.trim() || idVal,
                            utm_medium: newSourceUtmMedium.trim(),
                            utm_campaign: newSourceUtmCampaign.trim()
                          };

                          if (editingSourceId) {
                            const updated = localTrafficSources.map(s => s.id === editingSourceId ? newSource : s);
                            setLocalTrafficSources(updated);
                            if (localDefaultSource === localTrafficSources.find(s => s.id === editingSourceId)?.name) {
                              setLocalDefaultSource(nameVal);
                            }
                            setEditingSourceId(null);
                          } else {
                            if (localTrafficSources.some(s => s.id === idVal)) {
                              alert('Este canal já está cadastrado.');
                              return;
                            }
                            setLocalTrafficSources([...localTrafficSources, newSource]);
                          }
                          
                          // Reset form
                          setNewSourceName('');
                          setNewSourceColor('#6366F1');
                          setNewSourceUtmSource('');
                          setNewSourceUtmMedium('');
                          setNewSourceUtmCampaign('');
                        }}
                        className="px-5 py-2 text-xs font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all border-none cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${gradientColorStart}, ${gradientColorEnd})`,
                          color: contrastColor,
                        }}
                      >
                        {editingSourceId ? 'Salvar Alterações' : 'Adicionar Canal'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <Button type="submit" submitting={loading} className="w-full md:w-60">
            Salvar Configurações
          </Button>
        </div>
      </form>
    </div>
  );
}
