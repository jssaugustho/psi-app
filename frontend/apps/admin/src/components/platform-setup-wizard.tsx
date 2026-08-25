'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { api, DnsVerifierResponse } from '@/lib/api';
import { Button, Input, BrandModal } from '@psi/ui';
import { DnsVerifier } from '@/components/dns-verifier';
import { Upload, Trash2, Loader2 } from 'lucide-react';

export interface PlatformSetupWizardProps {
  isOpen?: boolean;
  initialHasCloudflare?: boolean;
  onComplete: () => void;
}

const STEPS = [
  { n: 1, title: '1. Cloudflare Hostnames (SSL) & Bucket R2', desc: 'Cadastre o API Token, Zone ID, Account ID e as credenciais do Bucket R2 para hospedagem automática de mídias e SSL para os tenants.' },
  { n: 2, title: '2. Resend — E-mail Transacional', desc: 'Configure a API Key do Resend e o domínio de envio para habilitar e-mails transacionais. Após salvar, você verá os registros DNS necessários com botões de cópia.' },
  { n: 3, title: '3. Tenant-Pai & Identidade Visual White-Label', desc: 'Defina as configurações do Tenant Principal da sua plataforma, faça upload dos ativos R2 e personalize as cores dos temas Claro e Escuro.' },
];

export function PlatformSetupWizard({ isOpen = true, initialHasCloudflare = false, onComplete }: PlatformSetupWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(initialHasCloudflare ? 2 : 1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Step 1
  const [cfToken, setCfToken] = useState('');
  const [cfZoneId, setCfZoneId] = useState('');
  const [cfAccountId, setCfAccountId] = useState('');
  const [r2BucketName, setR2BucketName] = useState('');
  const [r2PublicDomain, setR2PublicDomain] = useState('');
  const [r2AccessKeyId, setR2AccessKeyId] = useState('');
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState('');

  // Step 2 — Resend
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromDomain, setResendFromDomain] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [dnsData, setDnsData] = useState<DnsVerifierResponse | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsError, setDnsError] = useState('');

  // Step 3 — Tenant
  const [name, setName] = useState('Plataforma Principal');
  const [slug, setSlug] = useState('plataforma-principal');
  const [domain, setDomain] = useState('');
  const [logoLightUrl, setLogoLightUrl] = useState('');
  const [logoDarkUrl, setLogoDarkUrl] = useState('');
  const [iconLightUrl, setIconLightUrl] = useState('');
  const [iconDarkUrl, setIconDarkUrl] = useState('');
  const [gradientStart, setGradientStart] = useState('#4F46E5');
  const [gradientEnd, setGradientEnd] = useState('#06B6D4');
  const [contrastColor, setContrastColor] = useState('#FFFFFF');
  const [bgLightColor, setBgLightColor] = useState('#F8FAFC');
  const [bgDarkColor, setBgDarkColor] = useState('#020617');
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');

  // Carregar configurações salvas no banco ao montar o componente
  useEffect(() => {
    let isMounted = true;
    async function loadSavedSettings() {
      try {
        const res = await api.getPlatformSetupStatus();
        if (!isMounted || !res) return;

        if (res.cloudflare_api_token) setCfToken(res.cloudflare_api_token);
        if (res.cloudflare_zone_id) setCfZoneId(res.cloudflare_zone_id);
        if (res.cloudflare_account_id) setCfAccountId(res.cloudflare_account_id);
        if (res.r2_bucket_name) setR2BucketName(res.r2_bucket_name);
        if (res.r2_public_domain) setR2PublicDomain(res.r2_public_domain);
        if (res.r2_access_key_id) setR2AccessKeyId(res.r2_access_key_id);
        if (res.r2_secret_access_key) setR2SecretAccessKey(res.r2_secret_access_key);

        if (res.resend_api_key) {
          setResendApiKey(res.resend_api_key);
          setKeySaved(true);
        }
        if (res.resend_from_domain) {
          setResendFromDomain(res.resend_from_domain);
          api.getResendDns().then((dns) => {
            if (isMounted && dns) setDnsData(dns);
          }).catch(() => {});
        }

        if (res.primary_tenant) {
          if (res.primary_tenant.name) setName(res.primary_tenant.name);
          if (res.primary_tenant.slug) setSlug(res.primary_tenant.slug);
          if (res.primary_tenant.domain) setDomain(res.primary_tenant.domain);
          if (res.primary_tenant.logoLightUrl) setLogoLightUrl(res.primary_tenant.logoLightUrl);
          if (res.primary_tenant.logoDarkUrl) setLogoDarkUrl(res.primary_tenant.logoDarkUrl);
          if (res.primary_tenant.iconLightUrl) setIconLightUrl(res.primary_tenant.iconLightUrl);
          if (res.primary_tenant.iconDarkUrl) setIconDarkUrl(res.primary_tenant.iconDarkUrl);
          if (res.primary_tenant.gradientColorStart) setGradientStart(res.primary_tenant.gradientColorStart);
          if (res.primary_tenant.gradientColorEnd) setGradientEnd(res.primary_tenant.gradientColorEnd);
          if (res.primary_tenant.contrastColor) setContrastColor(res.primary_tenant.contrastColor);
          if (res.primary_tenant.bgLightColor) setBgLightColor(res.primary_tenant.bgLightColor);
          if (res.primary_tenant.bgDarkColor) setBgDarkColor(res.primary_tenant.bgDarkColor);
        }

        // Seleção automática da etapa atual
        if (!res.has_cloudflare || !res.has_r2) {
          setStep(1);
        } else if (!res.has_resend) {
          setStep(2);
        } else {
          setStep(3);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do setup:', err);
      }
    }
    loadSavedSettings();
    return () => { isMounted = false; };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveCloudflare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccessMsg(null); setSubmitting(true);
    try {
      const res = await api.saveCloudflare({ api_token: cfToken, zone_id: cfZoneId, account_id: cfAccountId, r2_bucket_name: r2BucketName, r2_public_domain: r2PublicDomain, r2_access_key_id: r2AccessKeyId, r2_secret_access_key: r2SecretAccessKey });
      setSuccessMsg(res.message);
      setTimeout(() => { setSuccessMsg(null); setStep(2); }, 1000);
    } catch (err: any) {
      setError(err.message || 'Falha ao validar credenciais do Cloudflare e Bucket R2.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadDns = useCallback(async () => {
    setDnsLoading(true);
    setDnsError('');
    try {
      setDnsData(await api.getResendDns());
    } catch (e: any) {
      setDnsError(e.message || 'Não foi possível carregar os registros DNS.');
    } finally {
      setDnsLoading(false);
    }
  }, []);

  const handleSaveResendKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccessMsg(null); setSubmitting(true);
    try {
      const res = await api.updateResend({ resend_api_key: resendApiKey });
      setSuccessMsg(res.message);
      setKeySaved(true);
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      setError(err.message || 'Falha ao validar e salvar a API Key do Resend.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveResendDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccessMsg(null); setSubmitting(true);
    try {
      const res = await api.updateResend({ resend_from_domain: resendFromDomain });
      setSuccessMsg(res.message);
      await loadDns();
    } catch (err: any) {
      setError(err.message || 'Falha ao cadastrar o domínio no Resend.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (field: 'logoLight' | 'logoDark' | 'iconLight' | 'iconDark', file: File) => {
    setError(null);
    setUploadingField(field);
    try {
      const uploadType = field.includes('icon') ? 'icon' : 'logo';
      const res = await api.uploadImage(file, uploadType);
      if (field === 'logoLight') setLogoLightUrl(res.url);
      if (field === 'logoDark') setLogoDarkUrl(res.url);
      if (field === 'iconLight') setIconLightUrl(res.url);
      if (field === 'iconDark') setIconDarkUrl(res.url);
    } catch (err: any) {
      setError(`Falha no upload (${field}): ${err.message}`);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccessMsg(null); setSubmitting(true);
    try {
      await api.setupPrimaryTenant({ name, slug, domain: domain || undefined, logo_light_url: logoLightUrl || undefined, logo_dark_url: logoDarkUrl || undefined, icon_light_url: iconLightUrl || undefined, icon_dark_url: iconDarkUrl || undefined, gradient_color_start: gradientStart, gradient_color_end: gradientEnd, contrast_color: contrastColor, bg_light_color: bgLightColor, bg_dark_color: bgDarkColor });
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar o Tenant-Pai.');
      setSubmitting(false);
    }
  };

  // ── Helpers de UI ─────────────────────────────────────────────────────────

  const StepBubble = ({ n }: { n: number }) => {
    const done = step > n;
    const active = step === n;
    return (
      <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all"
        style={done ? { background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', color: 'var(--status-success-text)' }
          : active ? { background: 'var(--brand-gradient)', color: 'var(--brand-contrast-color)' }
          : { background: 'var(--surface-hover)', border: '1px solid var(--surface-border)', color: 'var(--brand-text-color)', opacity: 0.4 }}
      >{done ? '✓' : n}</span>
    );
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-bold uppercase tracking-wider pb-2" style={{ borderBottom: '1px solid var(--surface-border)', opacity: 0.55 }}>{children}</h3>
  );

  const UploadBox = ({
    label,
    url,
    previewBg,
    field,
    setUrl,
  }: {
    label: string;
    url: string;
    previewBg: string;
    field: 'logoLight' | 'logoDark' | 'iconLight' | 'iconDark';
    setUrl: (u: string) => void;
  }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isEditingUrl, setIsEditingUrl] = useState(false);
    const isUploading = uploadingField === field;

    const handleSelectFile = () => {
      fileInputRef.current?.click();
    };

    return (
      <div
        className="space-y-3 p-4 rounded-xl transition-all"
        style={{
          background: 'var(--surface-hover)',
          border: '1px solid var(--surface-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider" style={{ opacity: 0.7 }}>
            {label}
          </label>
          <button
            type="button"
            onClick={() => setIsEditingUrl(!isEditingUrl)}
            className="text-[11px] underline hover:no-underline bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--brand-gradient-start)', opacity: 0.8 }}
          >
            {isEditingUrl ? 'Modo Upload' : 'Inserir URL'}
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileUpload(field, e.target.files[0]);
              e.target.value = '';
            }
          }}
        />

        {isEditingUrl ? (
          <div className="space-y-2">
            <Input
              type="url"
              placeholder="https://sua-cdn.com/imagem.png"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        ) : url ? (
          <div className="space-y-3">
            <div
              className="rounded-xl flex items-center justify-center h-20 p-2 relative overflow-hidden group shadow-inner"
              style={{ background: previewBg, border: '1px solid var(--surface-border)' }}
            >
              <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleSelectFile}
                disabled={isUploading}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer bg-transparent hover:bg-slate-800/40"
                style={{ border: '1px solid var(--surface-border)', color: 'var(--brand-text-color)' }}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Novo Arquivo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setUrl('')}
                className="py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                title="Remover imagem"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={handleSelectFile}
            className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-[var(--brand-gradient-start)] hover:bg-black/10 group"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            {isUploading ? (
              <div className="flex items-center gap-2 py-2 text-xs font-medium" style={{ color: 'var(--brand-gradient-start)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando para o Bucket R2...</span>
              </div>
            ) : (
              <>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-105"
                  style={{
                    background: 'color-mix(in srgb, var(--brand-gradient-start) 15%, transparent)',
                    color: 'var(--brand-gradient-start)',
                  }}
                >
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-semibold block" style={{ color: 'var(--brand-text-color)' }}>
                    Clique para Subir Imagem no R2
                  </span>
                  <span className="text-[10px] block opacity-50">PNG, JPG, SVG ou WEBP</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const ColorRow = ({ label, val, set }: { label: string; val: string; set: (v: string) => void }) => (
    <div className="space-y-1">
      <label className="block text-xs" style={{ opacity: 0.6 }}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={val} onChange={(e) => set(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent" style={{ border: '1px solid var(--surface-border)' }} />
        <Input type="text" value={val} onChange={(e) => set(e.target.value)} />
      </div>
    </div>
  );

  const currentStep = STEPS.find((s) => s.n === step)!;

  return (
    <BrandModal
      isOpen={isOpen}
      onClose={() => {}}
      maxWidth="max-w-4xl"
      showCloseButton={false}
      className="max-h-[90vh] flex flex-col overflow-hidden p-6 md:p-8 space-y-0"
    >
      <div className="overflow-y-auto custom-scrollbar pr-1.5 space-y-6 flex-1 text-left">

        {/* Cabeçalho e Stepper */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid var(--surface-border)' }}>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--brand-gradient-start)' }}>Configuração Inicial da Plataforma</span>
              <h2 className="text-2xl font-bold mt-1">{currentStep.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <StepBubble n={1} />
              <div className="w-6 h-0.5" style={{ background: 'var(--surface-border)' }} />
              <StepBubble n={2} />
              <div className="w-6 h-0.5" style={{ background: 'var(--surface-border)' }} />
              <StepBubble n={3} />
            </div>
          </div>
          <p className="text-sm" style={{ opacity: 0.6 }}>{currentStep.desc}</p>
        </div>

        {/* Feedback global */}
        {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

        {/* ── STEP 1: CLOUDFLARE & R2 ─────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleSaveCloudflare} className="space-y-6">
            <div className="space-y-4">
              <SectionTitle>Credenciais da Zone Cloudflare (Custom Hostnames & SSL)</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Cloudflare API Token *" type="password" required value={cfToken} onChange={(e) => setCfToken(e.target.value)} placeholder="API Token com acesso a Zone e R2" />
                <Input label="Zone ID *" type="text" required value={cfZoneId} onChange={(e) => setCfZoneId(e.target.value)} placeholder="Ex: 023e105f4ecef8ad9ca31a8372d0c353" />
              </div>
            </div>

            <div className="space-y-4">
              <SectionTitle>Configuração do Cloudflare R2 (Object Storage de Ativos)</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Account ID *" type="text" required value={cfAccountId} onChange={(e) => setCfAccountId(e.target.value)} placeholder="Cloudflare Account ID" />
                <Input label="Nome do Bucket R2 *" type="text" required value={r2BucketName} onChange={(e) => setR2BucketName(e.target.value)} placeholder="Ex: psi-assets" />
                <Input label="Domínio Público R2 *" type="text" required value={r2PublicDomain} onChange={(e) => setR2PublicDomain(e.target.value)} placeholder="Ex: https://assets.psi.app" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="R2 Access Key ID *" type="text" required value={r2AccessKeyId} onChange={(e) => setR2AccessKeyId(e.target.value)} placeholder="Chave de acesso S3 para upload" />
                <Input label="R2 Secret Access Key *" type="password" required value={r2SecretAccessKey} onChange={(e) => setR2SecretAccessKey(e.target.value)} placeholder="Chave secreta S3" />
              </div>
            </div>

            <Button type="submit" submitting={submitting}>Testar Permissões no Cloudflare / R2 e Avançar →</Button>
          </form>
        )}

        {/* ── STEP 2: RESEND ──────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Guia */}
            <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--brand-gradient-start)' }}>Como configurar o Resend</p>
              <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: 'var(--brand-text-color)', opacity: 0.75 }}>
                <li>Primeiro, insira e salve sua API Key no <strong>Passo 2A</strong>. Ela será armazenada de forma segura e oculta.</li>
                <li>Com a chave salva, cadastre seu domínio de envio no <strong>Passo 2B</strong>. Nós faremos o cadastro dele automaticamente no Resend.</li>
                <li>Configure os registros DNS gerados e verifique a ativação do domínio.</li>
              </ol>
            </div>

            {/* Sub-passo A: Salvar API Key */}
            {!keySaved && !dnsData && (
              <form onSubmit={handleSaveResendKey} className="space-y-4">
                <SectionTitle>Passo 2A: API Key do Resend</SectionTitle>
                <p className="text-xs" style={{ opacity: 0.65 }}>
                  Crie uma API Key em <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--brand-gradient-start)' }}>resend.com/api-keys</a> com permissão de <strong>Full access</strong>.
                </p>
                <Input label="API Key do Resend *" type="password" required value={resendApiKey} onChange={(e) => setResendApiKey(e.target.value)} placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                
                <div className="flex items-center justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-auto">← Voltar</Button>
                  <Button type="submit" submitting={submitting} className="w-auto px-8">Salvar API Key →</Button>
                </div>
              </form>
            )}

            {/* Sub-passo B: Cadastrar Domínio */}
            {keySaved && !dnsData && (
              <form onSubmit={handleSaveResendDomain} className="space-y-4">
                <SectionTitle>Passo 2B: Domínio de Envio</SectionTitle>
                <p className="text-xs" style={{ opacity: 0.65 }}>
                  Insira o domínio que deseja usar para enviar e-mails. Ele será cadastrado automaticamente no Resend.
                </p>
                <Input label="Domínio de envio *" type="text" required value={resendFromDomain} onChange={(e) => setResendFromDomain(e.target.value)} placeholder="seudominio.com.br" />
                <p className="text-xs" style={{ opacity: 0.5 }}>
                  E-mails enviados como <em>noreply@{resendFromDomain || 'seudominio.com.br'}</em>.
                </p>

                <div className="flex items-center justify-between pt-2">
                  <button type="button" onClick={() => setKeySaved(false)} className="text-xs underline hover:no-underline bg-transparent border-none cursor-pointer" style={{ opacity: 0.55, color: 'var(--brand-text-color)' }}>
                    ← Alterar API Key
                  </button>
                  <Button type="submit" submitting={submitting} className="w-auto px-8">Cadastrar Domínio & Gerar DNS →</Button>
                </div>
              </form>
            )}

            {/* Registros DNS — mostrados após salvar com sucesso */}
            {dnsData && (
              <div className="space-y-4">
                <SectionTitle>Registros DNS para verificar &quot;{dnsData.domain}&quot;</SectionTitle>

                {dnsError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{dnsError}</span>
                  </div>
                )}

                <DnsVerifier
                  records={dnsData.records}
                  domain={dnsData.domain}
                  status={dnsData.status}
                  loading={dnsLoading}
                  onRefresh={loadDns}
                  onVerify={async () => {
                    try { await api.triggerResendVerify(); }
                    catch (e: any) { setDnsError(e.message); }
                  }}
                />

                <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
                  <button type="button" onClick={() => { setDnsData(null); }} className="text-xs underline hover:no-underline bg-transparent border-none cursor-pointer" style={{ opacity: 0.55, color: 'var(--brand-text-color)' }}>
                    ← Alterar Domínio
                  </button>
                  <button type="button" onClick={() => { setError(null); setStep(3); }} className="px-6 py-2 rounded-xl text-xs font-semibold cursor-pointer border-none" style={{ background: 'var(--brand-gradient)', color: 'var(--brand-contrast-color)' }}>
                    Avançar para o Tenant-Pai →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: TENANT-PAI WHITE-LABEL ─────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleSaveTenant} className="space-y-8">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <SectionTitle>Informações da Plataforma</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nome da Plataforma *" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Psi App" />
                <Input label="Slug Único *" type="text" required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Ex: psi-app" />
              </div>
              <Input label="Domínio Principal (opcional)" type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Ex: psi.app" />
            </div>

            {/* Logotipos e Ícones */}
            <div className="space-y-4">
              <SectionTitle>Logotipos e Ícones (Uploads em Nuvem para o R2)</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UploadBox label="Logotipo (Tema Claro)" url={logoLightUrl} previewBg="#F1F5F9" field="logoLight" setUrl={setLogoLightUrl} />
                <UploadBox label="Logotipo (Tema Escuro)" url={logoDarkUrl} previewBg="#0F172A" field="logoDark" setUrl={setLogoDarkUrl} />
                <UploadBox label="Ícone/Favicon (Tema Claro)" url={iconLightUrl} previewBg="#F1F5F9" field="iconLight" setUrl={setIconLightUrl} />
                <UploadBox label="Ícone/Favicon (Tema Escuro)" url={iconDarkUrl} previewBg="#0F172A" field="iconDark" setUrl={setIconDarkUrl} />
              </div>
            </div>

            {/* Paleta de Destaque */}
            <div className="space-y-4">
              <SectionTitle>Paleta de Destaque (Gradientes e Botões)</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Início do Gradiente', val: gradientStart, set: setGradientStart },
                  { label: 'Fim do Gradiente', val: gradientEnd, set: setGradientEnd },
                  { label: 'Texto dos Botões (Contraste)', val: contrastColor, set: setContrastColor },
                ].map(({ label, val, set }) => (
                  <div key={label} className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase" style={{ opacity: 0.6 }}>{label}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={val} onChange={(e) => set(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent" style={{ border: '1px solid var(--surface-border)' }} />
                      <Input type="text" value={val} onChange={(e) => set(e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Intensidade de Fundo (Modo Claro & Modo Escuro) */}
            <div className="space-y-4">
              <SectionTitle>Intensidade do Tema (Fundo Claro & Fundo Escuro)</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--surface-hover)', border: '1px solid var(--surface-border)' }}>
                  <span className="text-xs font-bold uppercase block" style={{ color: 'var(--status-warning-text)' }}>Tema Claro</span>
                  <p className="text-[10px] opacity-60">Cor base para a intensidade do fundo em modo claro.</p>
                  <ColorRow label="Intensidade do Branco (Fundo)" val={bgLightColor} set={setBgLightColor} />
                </div>
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--surface-hover)', border: '1px solid var(--surface-border)' }}>
                  <span className="text-xs font-bold uppercase block" style={{ color: 'var(--brand-gradient-start)' }}>Tema Escuro</span>
                  <p className="text-[10px] opacity-60">Cor base para a intensidade do fundo em modo escuro.</p>
                  <ColorRow label="Intensidade do Preto (Fundo)" val={bgDarkColor} set={setBgDarkColor} />
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div style={{ backgroundColor: previewTheme === 'dark' ? bgDarkColor : bgLightColor, color: previewTheme === 'dark' ? '#F4F4F5' : '#09090B', border: '1px solid var(--surface-border)' }} className="p-6 rounded-2xl transition-colors duration-300 space-y-6">
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">Live Preview</span>
                <button type="button" onClick={() => setPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark')} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer bg-transparent" style={{ border: '1px solid rgba(128,128,128,0.3)' }}>
                  Modo: {previewTheme === 'dark' ? 'Escuro' : 'Claro'}
                </button>
              </div>
              <div style={{ backgroundColor: previewTheme === 'dark' ? 'color-mix(in srgb, #FFFFFF 6%, ' + bgDarkColor + ')' : '#FFFFFF', border: '1px solid rgba(128,128,128,0.2)' }} className="p-5 rounded-xl shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  {(previewTheme === 'dark' ? logoDarkUrl || logoLightUrl : logoLightUrl || logoDarkUrl)
                    ? <img src={(previewTheme === 'dark' ? logoDarkUrl || logoLightUrl : logoLightUrl || logoDarkUrl)!} alt="Logo Preview" className="max-h-8 object-contain" />
                    : <span className="font-bold text-lg">{name || 'Minha Plataforma'}</span>
                  }
                </div>
                <p className="text-xs opacity-70">Exemplo de cartão no tema <strong>{previewTheme === 'dark' ? 'Escuro' : 'Claro'}</strong>.</p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button type="button" style={{ background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`, color: contrastColor }} className="font-semibold py-2.5 px-5 rounded-xl shadow-lg text-xs border-none cursor-default">Botão Principal</button>
                  <div style={{ background: `linear-gradient(135deg, ${gradientStart}20, ${gradientEnd}20)`, borderColor: `${gradientStart}50`, color: gradientStart }} className="border px-3 py-1.5 rounded-xl text-xs font-bold uppercase">Destaque</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
              <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-auto">← Voltar para Resend</Button>
              <Button type="submit" submitting={submitting} className="w-auto px-8">Salvar Tenant-Pai e Concluir Setup</Button>
            </div>
          </form>
        )}

      </div>
    </BrandModal>
  );
}
