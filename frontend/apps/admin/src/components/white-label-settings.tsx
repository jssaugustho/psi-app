'use client';

import React, { useState, useRef, useEffect } from 'react';
import { api, Tenant } from '@/lib/api';
import { Input } from '@psi/ui';
import { validateImageSafety } from '@psi/image-utils';

interface WhiteLabelSettingsProps {
  tenant: Tenant;
  onSaved: (updatedTenant: Tenant) => void;
}

type LogoField = 'logo_light_url' | 'logo_dark_url' | 'icon_light_url' | 'icon_dark_url';

interface FormState {
  name: string;
  slug: string;
  domain: string;
  logo_light_url: string;
  logo_dark_url: string;
  icon_light_url: string;
  icon_dark_url: string;
  gradient_color_start: string;
  gradient_color_end: string;
  contrast_color: string;
}

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
        className="mt-0.5 w-full bg-transparent border-b border-slate-700 text-xs font-mono focus:outline-none focus:border-indigo-500 py-0.5"
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
  const [dragOver, setDragOver] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!uploading) setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">{label}</p>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex items-center justify-center rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-all group ${
          dragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700/60 hover:border-slate-500/80'
        }`}
        style={{ minHeight: 90, backgroundColor: previewBg }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-4 px-6 text-xs text-indigo-400">
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium animate-pulse">Otimizando e Enviando…</span>
          </div>
        ) : url ? (
          <>
            <img src={url} alt={label} className="max-h-16 max-w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" />
            
            {/* Botão de Fechar/Limpar (com stopPropagation para não acionar o input click) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600 transition-colors shadow z-10"
              title="Remover"
            >
              ✕
            </button>

            {/* Indicador "Mudar" sobreposto no cantinho inferior direito */}
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
              Mudar
            </div>
          </>
        ) : (
          <div className="text-xs opacity-50 hover:opacity-100 transition-opacity py-4 px-6 flex flex-col items-center gap-1">
            <span>+ Adicionar</span>
            <span className="text-[10px] opacity-60">Arraste ou clique para selecionar</span>
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
          if (file) {
            onUpload(file);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
};

export function WhiteLabelSettings({ tenant, onSaved }: WhiteLabelSettingsProps) {
  const [form, setForm] = useState<FormState>({
    name: tenant.name ?? '',
    slug: tenant.slug ?? '',
    domain: tenant.domain ?? '',
    logo_light_url: tenant.logoLightUrl ?? '',
    logo_dark_url: tenant.logoDarkUrl ?? '',
    icon_light_url: tenant.iconLightUrl ?? '',
    icon_dark_url: tenant.iconDarkUrl ?? '',
    gradient_color_start: tenant.gradientColorStart ?? '#4F46E5',
    gradient_color_end: tenant.gradientColorEnd ?? '#06B6D4',
    contrast_color: tenant.contrastColor ?? '#FFFFFF',
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name ?? '',
        slug: tenant.slug ?? '',
        domain: tenant.domain ?? '',
        logo_light_url: tenant.logoLightUrl ?? '',
        logo_dark_url: tenant.logoDarkUrl ?? '',
        icon_light_url: tenant.iconLightUrl ?? '',
        icon_dark_url: tenant.iconDarkUrl ?? '',
        gradient_color_start: tenant.gradientColorStart ?? '#4F46E5',
        gradient_color_end: tenant.gradientColorEnd ?? '#06B6D4',
        contrast_color: tenant.contrastColor ?? '#FFFFFF',
      });
    }
  }, [tenant]);


  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState<Partial<Record<LogoField, boolean>>>({});

  const set = (key: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleUpload = async (field: LogoField, file: File) => {
    setUploading((u) => ({ ...u, [field]: true }));
    try {
      const uploadType = field.includes('icon') ? 'icon' : 'logo';
      const isIcon = uploadType === 'icon';
      const targetRes = isIcon ? { width: 128, height: 128 } : { width: 800, height: 400 };

      const validation = await validateImageSafety(file, { resolution: targetRes, type: 'logotipo' });
      if (!validation.valid && validation.error) {
        setError(`Erro ao enviar ${field.replace(/_/g, ' ')}: ${validation.error}`);
        return;
      }

      const { url } = await api.uploadImage(file, uploadType);
      setForm((f) => ({ ...f, [field]: url }));
    } catch (err: any) {
      setError(`Erro ao enviar ${field.replace(/_/g, ' ')}: ${err.message}`);
    } finally {
      setUploading((u) => ({ ...u, [field]: false }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { tenant: updated } = await api.updatePrimaryTenant({
        name: form.name,
        slug: form.slug,
        domain: form.domain || null,
        logo_light_url: form.logo_light_url || null,
        logo_dark_url: form.logo_dark_url || null,
        icon_light_url: form.icon_light_url || null,
        icon_dark_url: form.icon_dark_url || null,
        gradient_color_start: form.gradient_color_start,
        gradient_color_end: form.gradient_color_end,
        contrast_color: form.contrast_color,
      });
      setSuccess('Configurações salvas com sucesso!');
      onSaved(updated);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  // Derived preview values (always dark mode)
  const previewGradient = `linear-gradient(135deg, ${form.gradient_color_start}, ${form.gradient_color_end})`;
  const previewLogo = form.logo_dark_url;
  const previewIcon = form.icon_dark_url;

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* ─────────────────────────────── Identidade */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-50">Identidade da Plataforma</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Nome da Plataforma"
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            placeholder="Minha Plataforma"
          />
          <Input
            label="Slug (URL amigável)"
            value={form.slug}
            onChange={(e) => set('slug')(e.target.value)}
            placeholder="minha-plataforma"
          />
          <Input
            label="Domínio personalizado (opcional)"
            value={form.domain}
            onChange={(e) => set('domain')(e.target.value)}
            placeholder="app.meudominio.com.br"
          />
        </div>
      </section>

      {/* ─────────────────────────────── Logotipos */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">🖼️ Logotipos & Ícones (via Cloudflare R2)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <UploadBox
            label="Logo (Tema Claro)"
            url={form.logo_light_url}
            onUpload={(f) => handleUpload('logo_light_url', f)}
            onClear={() => set('logo_light_url')('')}
            uploading={!!uploading.logo_light_url}
            previewBg="#F8FAFC"
          />
          <UploadBox
            label="Logo (Tema Escuro)"
            url={form.logo_dark_url}
            onUpload={(f) => handleUpload('logo_dark_url', f)}
            onClear={() => set('logo_dark_url')('')}
            uploading={!!uploading.logo_dark_url}
            previewBg="#09090B"
          />
          <UploadBox
            label="Ícone (Tema Claro)"
            url={form.icon_light_url}
            onUpload={(f) => handleUpload('icon_light_url', f)}
            onClear={() => set('icon_light_url')('')}
            uploading={!!uploading.icon_light_url}
            previewBg="#F8FAFC"
          />
          <UploadBox
            label="Ícone (Tema Escuro)"
            url={form.icon_dark_url}
            onUpload={(f) => handleUpload('icon_dark_url', f)}
            onClear={() => set('icon_dark_url')('')}
            uploading={!!uploading.icon_dark_url}
            previewBg="#09090B"
          />
        </div>
      </section>

      {/* ─────────────────────────────── Cores */}
      <section className="space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1 pb-1 border-b border-slate-800">Botões & Gradiente</p>
          <ColorPicker label="Cor Inicial" value={form.gradient_color_start} onChange={set('gradient_color_start')} />
          <ColorPicker label="Cor Final" value={form.gradient_color_end} onChange={set('gradient_color_end')} />
          <ColorPicker label="Contraste (texto em botões)" value={form.contrast_color} onChange={set('contrast_color')} />
        </div>
      </section>

      {/* ─────────────────────────────── Preview */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-50">Preview ao Vivo</h3>
        </div>

        {/* Miniatura do AppShell (Reflete o estilo real com Sidebar, Header e Glassmorphism) */}
        <div
          className="rounded-2xl overflow-hidden border border-slate-700/40 flex shadow-2xl"
          style={{
            height: 220,
            background: '#09090B',
            color: '#F4F4F5',
            transition: 'all 0.3s',
          }}
        >
          {/* Mini Sidebar Glassmorphism */}
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
                {previewLogo ? (
                  <img src={previewLogo} alt="Logo" className="max-h-6 max-w-[90px] object-contain" />
                ) : previewIcon ? (
                  <>
                    <img src={previewIcon} alt="Icon" className="w-5 h-5 object-contain" />
                    <span className="text-xs font-bold truncate" style={{ color: '#F4F4F5' }}>{form.name || 'Plataforma'}</span>
                  </>
                ) : (
                  <>
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                      style={{ background: previewGradient, color: form.contrast_color }}
                    >
                      Ψ
                    </div>
                    <span className="text-xs font-bold truncate" style={{ color: '#F4F4F5' }}>{form.name || 'Plataforma'}</span>
                  </>
                )}
              </div>
              <div className="space-y-1">
                {['Dashboard', 'Configurações', 'Usuários'].map((item, i) => (
                  <div
                    key={item}
                    className="px-2 py-1 rounded text-[10px] transition-all"
                    style={{
                      background: i === 1 ? `color-mix(in srgb, ${form.gradient_color_start} 15%, transparent)` : 'transparent',
                      color: i === 1 ? form.gradient_color_start : '#F4F4F5',
                      border: i === 1 ? `1px solid color-mix(in srgb, ${form.gradient_color_start} 30%, transparent)` : '1px solid transparent',
                      opacity: i === 1 ? 1 : 0.6,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[9px] opacity-40 truncate">admin@exemplo.com</div>
          </div>

          {/* Lado Direito: Header + Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mini Header Fixo Glassmorphism */}
            <div
              className="h-8 shrink-0 flex items-center justify-end px-3 border-b"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                borderColor: 'rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                }}
                className="w-4.5 h-4.5 rounded flex items-center justify-center text-[8px] opacity-75"
              >
                ☀️
              </div>
            </div>

            {/* Mini Content Area with Glassmorphism Cards */}
            <div className="flex-1 p-3 space-y-2 overflow-hidden">
              <p className="text-xs font-bold" style={{ color: '#F4F4F5' }}>Painel de Administração</p>
              <div className="grid grid-cols-3 gap-1.5">
                {['Status', 'Cloudflare', 'Tenant'].map((label) => (
                  <div
                    key={label}
                    className="rounded-lg p-2 text-[9px] border"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      borderColor: 'rgba(255, 255, 255, 0.06)',
                      color: '#F4F4F5',
                    }}
                  >
                    <span className="opacity-60">{label}</span>
                    <div className="font-bold text-[10px] mt-0.5" style={{ color: form.gradient_color_start }}>Ativo</div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-1 px-3 py-1.5 rounded-lg text-[10px] font-bold border-none shadow cursor-default"
                style={{ background: previewGradient, color: form.contrast_color }}
              >
                Botão White-Label
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────── Feedback & Ação */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg disabled:opacity-50 border-none cursor-pointer flex items-center justify-center gap-2"
          style={{
            background: previewGradient,
            color: form.contrast_color,
          }}
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin text-current" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Salvando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Salvar Configurações
            </>
          )}
        </button>
      </div>
    </form>
  );
}
