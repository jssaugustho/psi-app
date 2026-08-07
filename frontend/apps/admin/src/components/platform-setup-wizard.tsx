'use client';

import React, { useState, useCallback } from 'react';
import { api, DnsVerifierResponse } from '@/lib/api';
import { Button, Input, Card } from '@psi/ui';
import { DnsVerifier } from '@/components/dns-verifier';

export interface PlatformSetupWizardProps {
  initialHasCloudflare?: boolean;
  onComplete: () => void;
}

const STEPS = [
  { n: 1, title: '1. Cloudflare Hostnames (SSL) & Bucket R2', desc: 'Cadastre o API Token, Zone ID, Account ID e as credenciais do Bucket R2 para hospedagem automática de mídias e SSL para os tenants.' },
  { n: 2, title: '2. Resend — E-mail Transacional', desc: 'Configure a API Key do Resend e o domínio de envio para habilitar e-mails transacionais. Após salvar, você verá os registros DNS necessários com botões de cópia.' },
  { n: 3, title: '3. Tenant-Pai & Identidade Visual White-Label', desc: 'Defina as configurações do Tenant Principal da sua plataforma, faça upload dos ativos R2 e personalize as cores dos temas Claro e Escuro.' },
];

export function PlatformSetupWizard({ initialHasCloudflare = false, onComplete }: PlatformSetupWizardProps) {
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
  const [cardLightColor, setCardLightColor] = useState('#FFFFFF');
  const [cardDarkColor, setCardDarkColor] = useState('#0F172A');
  const [textLightColor, setTextLightColor] = useState('#0F172A');
  const [textDarkColor, setTextDarkColor] = useState('#F8FAFC');
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');

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

  const handleSkipResend = () => { setError(null); setStep(3); };

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
      await api.setupPrimaryTenant({ name, slug, domain: domain || undefined, logo_light_url: logoLightUrl || undefined, logo_dark_url: logoDarkUrl || undefined, icon_light_url: iconLightUrl || undefined, icon_dark_url: iconDarkUrl || undefined, gradient_color_start: gradientStart, gradient_color_end: gradientEnd, contrast_color: contrastColor, bg_light_color: bgLightColor, bg_dark_color: bgDarkColor, card_light_color: cardLightColor, card_dark_color: cardDarkColor, text_light_color: textLightColor, text_dark_color: textDarkColor });
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

  const UploadBox = ({ label, url, previewBg, field }: { label: string; url: string; previewBg: string; field: 'logoLight' | 'logoDark' | 'iconLight' | 'iconDark' }) => (
    <div className="space-y-2 p-4 rounded-xl" style={{ background: 'var(--surface-hover)', border: '1px solid var(--surface-border)' }}>
      <label className="block text-xs font-semibold uppercase" style={{ opacity: 0.65 }}>{label}</label>
      {url && <div className="rounded-lg flex items-center justify-center h-16 mb-2" style={{ background: previewBg }}><img src={url} alt={label} className="max-h-full object-contain" /></div>}
      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(field, e.target.files[0])} className="text-xs cursor-pointer w-full" style={{ color: 'var(--brand-text-color)', opacity: 0.75 }} />
      {uploadingField === field && <span className="text-xs block" style={{ color: 'var(--brand-gradient-start)' }}>Enviando para o R2...</span>}
    </div>
  );

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
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Card className="space-y-8">

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
                  <button type="button" onClick={handleSkipResend} className="text-sm underline hover:no-underline bg-transparent border-none cursor-pointer" style={{ opacity: 0.55, color: 'var(--brand-text-color)' }}>
                    Pular por agora →
                  </button>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-auto">← Voltar</Button>
                    <Button type="submit" submitting={submitting} className="w-auto px-8">Salvar API Key →</Button>
                  </div>
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
                  <div className="flex gap-3">
                    <button type="button" onClick={handleSkipResend} className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer bg-transparent" style={{ border: '1px solid var(--surface-border)', color: 'var(--brand-text-color)', opacity: 0.7 }}>
                      Pular por agora
                    </button>
                    <Button type="submit" submitting={submitting} className="w-auto px-8">Cadastrar Domínio & Gerar DNS →</Button>
                  </div>
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
                  <div className="flex gap-3">
                    <button type="button" onClick={handleSkipResend} className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer bg-transparent" style={{ border: '1px solid var(--surface-border)', color: 'var(--brand-text-color)', opacity: 0.7 }}>
                      Continuar sem verificar
                    </button>
                    <button type="button" onClick={() => { setError(null); setStep(3); }} className="px-6 py-2 rounded-xl text-xs font-semibold cursor-pointer border-none" style={{ background: 'var(--brand-gradient)', color: 'var(--brand-contrast-color)' }}>
                      Avançar para o Tenant-Pai →
                    </button>
                  </div>
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
                <UploadBox label="Logotipo (Tema Claro)" url={logoLightUrl} previewBg="#F1F5F9" field="logoLight" />
                <UploadBox label="Logotipo (Tema Escuro)" url={logoDarkUrl} previewBg="#0F172A" field="logoDark" />
                <UploadBox label="Ícone/Favicon (Tema Claro)" url={iconLightUrl} previewBg="#F1F5F9" field="iconLight" />
                <UploadBox label="Ícone/Favicon (Tema Escuro)" url={iconDarkUrl} previewBg="#0F172A" field="iconDark" />
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

            {/* Cores de Fundo e Cartões */}
            <div className="space-y-4">
              <SectionTitle>Personalização de Fundo e Cartões (Modo Claro & Modo Escuro)</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl space-y-4" style={{ background: 'var(--surface-hover)', border: '1px solid var(--surface-border)' }}>
                  <span className="text-xs font-bold uppercase block" style={{ color: 'var(--status-warning-text)' }}>Tema Claro</span>
                  <p className="text-[10px] opacity-50 mt-1">Cores para fundo claro e cartões claros.</p>
                  <ColorRow label="Fundo da Página" val={bgLightColor} set={setBgLightColor} />
                  <ColorRow label="Fundo dos Cartões" val={cardLightColor} set={setCardLightColor} />
                  <ColorRow label="Texto Principal" val={textLightColor} set={setTextLightColor} />
                </div>
                <div className="p-4 rounded-xl space-y-4" style={{ background: 'var(--surface-hover)', border: '1px solid var(--surface-border)' }}>
                  <span className="text-xs font-bold uppercase block" style={{ color: 'var(--brand-gradient-start)' }}>Tema Escuro</span>
                  <ColorRow label="Fundo da Página" val={bgDarkColor} set={setBgDarkColor} />
                  <ColorRow label="Fundo dos Cartões" val={cardDarkColor} set={setCardDarkColor} />
                  <ColorRow label="Texto Principal" val={textDarkColor} set={setTextDarkColor} />
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div style={{ backgroundColor: previewTheme === 'dark' ? bgDarkColor : bgLightColor, color: previewTheme === 'dark' ? textDarkColor : textLightColor, border: '1px solid var(--surface-border)' }} className="p-6 rounded-2xl transition-colors duration-300 space-y-6">
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">Live Preview</span>
                <button type="button" onClick={() => setPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark')} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer bg-transparent" style={{ border: '1px solid rgba(128,128,128,0.3)' }}>
                  Modo: {previewTheme === 'dark' ? 'Escuro' : 'Claro'}
                </button>
              </div>
              <div style={{ backgroundColor: previewTheme === 'dark' ? cardDarkColor : cardLightColor }} className="p-5 rounded-xl shadow-xl space-y-4">
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

      </Card>
    </div>
  );
}
