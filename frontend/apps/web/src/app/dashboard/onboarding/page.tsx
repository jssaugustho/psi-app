'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api, Workspace } from '@/lib/api';
import { Card, Input, Button, Textarea } from '@psi/ui';
import { BrandIdentityManager } from '@/components/brand-identity-manager';
import { DomainManager } from '@/components/domain-manager';
import { Building2, Palette, Globe, User as UserIcon, ChevronRight, ArrowLeft } from 'lucide-react';

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

const STEPS = [
  { id: 1, label: 'Workspace',  Icon: Building2 },
  { id: 2, label: 'Perfil',    Icon: UserIcon   },
  { id: 3, label: 'Identidade', Icon: Palette    },
  { id: 4, label: 'Domínio',   Icon: Globe      },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { primaryTenant, theme, toggleTheme, reloadBrand } = useBrand();

  // ─── Stepper ────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ─── Etapa 1: Nome do Workspace ──────────────────────────────────────────
  const [workspaceName, setWorkspaceName] = useState('');
  const [createdWorkspace, setCreatedWorkspace] = useState<Workspace | null>(null);

  // ─── Etapa 2: Perfil do Consultório ─────────────────────────────────────
  const [displayName, setDisplayName] = useState('');
  const [cityState, setCityState] = useState('');
  const [instagram, setInstagram] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState('');

  // ─── Etapa 4: Domínio ────────────────────────────────────────────────────
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  // ─── Erros e loading ─────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ─── Auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // ─── Pré-popular displayName ──────────────────────────────────────────────
  useEffect(() => {
    if (!displayName && workspaceName) setDisplayName(workspaceName);
  }, [workspaceName, displayName]);

  // ─── Gerar slug do subdomínio ─────────────────────────────────────────────
  const sanitizeSlug = useCallback((name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, ''), []);

  useEffect(() => {
    if (workspaceName && !subdomain) setSubdomain(sanitizeSlug(workspaceName));
  }, [workspaceName, subdomain, sanitizeSlug]);

  // ─── Verificar disponibilidade do subdomínio ─────────────────────────────
  useEffect(() => {
    if (!subdomain || subdomain.length < 3) { setSubdomainAvailable(null); return; }
    const timer = setTimeout(async () => {
      setCheckingSubdomain(true);
      try {
        const taken = await api.checkSubdomainExists(subdomain);
        if (taken) { setSubdomainError('Este subdomínio já está em uso.'); setSubdomainAvailable(false); }
        else { setSubdomainError(null); setSubdomainAvailable(true); }
      } catch { /* ignore */ }
      finally { setCheckingSubdomain(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [subdomain]);

  // ─── Especialidades ───────────────────────────────────────────────────────
  const handleAddSpecialty = (s: string) => {
    const t = s.trim();
    if (t && !specialties.includes(t)) setSpecialties(p => [...p, t]);
    setNewSpecialty('');
  };
  const handleRemoveSpecialty = (idx: number) =>
    setSpecialties(p => p.filter((_, i) => i !== idx));

  // ─── Submit: Etapa 1 ─────────────────────────────────────────────────────
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user || !workspaceName.trim()) { setError('O nome do workspace é obrigatório.'); return; }
    setSubmitting(true);
    try {
      const ws = await api.createWorkspace(workspaceName.trim(), user.id);
      if (!ws?.id) throw new Error('Falha ao instanciar o workspace.');
      localStorage.setItem('active_workspace_id', ws.id);
      localStorage.setItem('active_tenant_id', ws.id);
      sessionStorage.setItem('active_workspace_id', ws.id);
      document.cookie = `active_workspace_id=${ws.id}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `active_tenant_id=${ws.id}; path=/; max-age=31536000; SameSite=Lax`;
      setCreatedWorkspace(ws);
      setDisplayName(ws.name);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar o workspace.');
    } finally { setSubmitting(false); }
  };

  // ─── Submit: Etapa 2 ─────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!createdWorkspace) return;
    setSubmitting(true);
    try {
      await api.updateTenantBranding(createdWorkspace.id, {
        name: displayName.trim() || workspaceName.trim(),
        bio: bio.trim() || undefined,
        specialties: specialties.length ? specialties : undefined,
        cityState: cityState.trim() || undefined,
        instagram: instagram.trim() || undefined,
      });
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar o perfil.');
    } finally { setSubmitting(false); }
  };

  // ─── Submit: Etapa 4 ─────────────────────────────────────────────────────
  const handleFinish = async () => {
    setError(null);
    if (!createdWorkspace) return;
    if (!subdomain || subdomain.length < 3) { setError('O subdomínio deve ter ao menos 3 caracteres.'); return; }
    if (subdomainAvailable === false) { setError('Por favor, escolha um subdomínio disponível.'); return; }
    setSubmitting(true);
    try {
      const cleanCustom = customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      await api.createWorkspaceDomain(createdWorkspace.id, subdomain.toLowerCase().trim(), cleanCustom || null);
      if (cleanCustom) {
        await api.registerCustomHostname(null, cleanCustom, createdWorkspace.id);
      }
      await reloadBrand();
      window.location.href = '/dashboard/crm';
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar o domínio.');
      setSubmitting(false);
    }
  };


  const logoUrl =
    theme === 'light'
      ? (primaryTenant?.logoLightUrl || primaryTenant?.logoDarkUrl)
      : (primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl);

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app';

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse brand-text-muted">Verificando autenticação...</div>
      </div>
    );
  }

  // ─── Sub-componentes ──────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, idx) => {
        const Icon = s.Icon;
        const isActive = s.id === step;
        const isDone = s.id < step;
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : isActive ? 'text-white shadow-lg'
                  : 'border-2 border-[var(--surface-border)] brand-text-muted'
                }`}
                style={isActive ? { background: 'var(--brand-gradient)' } : {}}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={`text-[10px] font-semibold transition-all ${isActive ? '' : 'brand-text-muted opacity-60'}`}
                style={isActive ? { color: 'var(--brand-gradient-start)' } : {}}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-12 h-0.5 mb-5 transition-all duration-500 ${s.id < step ? 'bg-emerald-500/60' : 'bg-[var(--surface-border)]'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const PageHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="text-center space-y-1.5 mb-6">
      {logoUrl && <img src={logoUrl} alt={primaryTenant?.name || 'TheraOS'} className="max-h-10 max-w-[55%] mx-auto object-contain mb-3" />}
      <h1
        className="text-2xl font-bold bg-clip-text text-transparent"
        style={{ background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        {title}
      </h1>
      <p className="text-sm brand-text-muted">{subtitle}</p>
    </div>
  );

  const ErrorBanner = () => error ? (
    <div
      className="text-sm p-3 rounded-lg text-center font-medium mb-4"
      style={{ background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)', color: 'var(--status-error-text)' }}
    >
      {error}
    </div>
  ) : null;

  const BackButton = ({ toStep }: { toStep: number }) => (
    <button
      type="button"
      onClick={() => setStep(toStep)}
      className="flex items-center gap-1.5 text-sm font-medium brand-text-muted hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" /> Voltar
    </button>
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative animate-page-enter">
      {/* Toggle de tema */}
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={toggleTheme}
          style={{ border: '1px solid var(--surface-border)', color: 'var(--brand-text-color)' }}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-transparent hover:bg-[var(--surface-hover)]"
        >
          {theme === 'dark' ? (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
            </svg>
          ) : (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      <Card className={`w-full p-8 transition-all duration-300 ${step >= 3 ? 'max-w-3xl' : 'max-w-lg'}`}>
        <StepIndicator />

        {/* ──── ETAPA 1: Nome do Workspace ──── */}
        {step === 1 && (
          <>
            <PageHeader title="Criar Workspace" subtitle="Defina o nome do seu espaço de trabalho profissional." />
            <ErrorBanner />
            <form onSubmit={handleCreateWorkspace} className="space-y-5">
              <Input
                label="Nome do Workspace / Consultório *"
                type="text"
                required
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Ex: Consultório de Psicologia Ana"
              />
              <Button type="submit" submitting={submitting} className="w-full">
                Criar & Continuar <ChevronRight className="w-4 h-4 ml-1 inline" />
              </Button>
            </form>
            <div className="flex items-center justify-between text-xs pt-5 mt-4 border-t border-[var(--surface-border)]" style={{ color: 'var(--brand-text-color)', opacity: 0.6 }}>
              <span>Logado como: <strong style={{ color: 'var(--brand-text-color)' }}>{user.email}</strong></span>
              <button onClick={logout} className="hover:underline bg-transparent border-none cursor-pointer font-semibold" style={{ color: 'var(--brand-gradient-start)' }}>
                Sair da Conta
              </button>
            </div>
          </>
        )}

        {/* ──── ETAPA 2: Perfil do Consultório ──── */}
        {step === 2 && (
          <>
            <PageHeader title="Perfil do Consultório" subtitle="Essas informações aparecem no seu site de captação. Você pode preencher depois." />
            <ErrorBanner />
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--brand-text-color)', opacity: 0.8 }}>Nome de Exibição / Clínica</label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={workspaceName || 'Ex: Dra. Ana Silva'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--brand-text-color)', opacity: 0.8 }}>Cidade / Estado</label>
                  <Input value={cityState} onChange={(e) => setCityState(e.target.value)} placeholder="Ex: São Paulo / SP" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--brand-text-color)', opacity: 0.8 }}>Instagram Profissional</label>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seu.perfil" />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--brand-text-color)', opacity: 0.8 }}>Biografia Resumida</label>
                <Textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Conte sobre sua trajetória, abordagem clínica e compromisso com os pacientes..."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold" style={{ color: 'var(--brand-text-color)', opacity: 0.8 }}>Especialidades & Áreas de Atuação</label>
                <div className="flex gap-2">
                  <Input
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="Adicionar especialidade..."
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSpecialty(newSpecialty); } }}
                  />
                  <Button type="button" onClick={() => handleAddSpecialty(newSpecialty)} className="shrink-0 bg-violet-600 hover:bg-violet-500">+</Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {DEFAULT_SPECIALTIES_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddSpecialty(preset)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer transition-all"
                      style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', color: 'var(--brand-text-color)', opacity: specialties.includes(preset) ? 0.4 : 0.8 }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
                {specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {specialties.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-semibold">
                        {item}
                        <button type="button" onClick={() => handleRemoveSpecialty(idx)} className="hover:text-rose-400 cursor-pointer bg-transparent border-none">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <BackButton toStep={1} />
                <Button type="submit" submitting={submitting} className="flex-1">
                  Salvar & Continuar <ChevronRight className="w-4 h-4 ml-1 inline" />
                </Button>
                <button type="button" onClick={() => setStep(3)} className="text-sm font-medium brand-text-muted hover:opacity-80 bg-transparent border-none cursor-pointer whitespace-nowrap">
                  Pular etapa
                </button>
              </div>
            </form>
          </>
        )}

        {/* ──── ETAPA 3: Identidade Visual ──── */}
        {step === 3 && createdWorkspace && (
          <>
            <PageHeader title="Identidade Visual" subtitle="Personalize a aparência do seu site. Você pode alterar isso depois." />
            <ErrorBanner />
            <BrandIdentityManager
              workspace={createdWorkspace}
              onSaved={() => setStep(4)}
              saveButtonLabel="Salvar & Continuar"
              showSkip
              onSkip={() => setStep(4)}
            />
            <div className="mt-4">
              <BackButton toStep={2} />
            </div>
          </>
        )}

        {/* ──── ETAPA 4: Domínio ──── */}
        {step === 4 && createdWorkspace && (
          <>
            <PageHeader title="Endereço de Acesso" subtitle="Defina o subdomínio do seu workspace na plataforma." />
            <ErrorBanner />
            <DomainManager
              subdomain={subdomain}
              onSubdomainChange={(val) => { setSubdomain(val); setSubdomainAvailable(null); setSubdomainError(null); }}
              customDomain={customDomain}
              onCustomDomainChange={setCustomDomain}
              subdomainAvailable={subdomainAvailable}
              checkingSubdomain={checkingSubdomain}
              tenantId={createdWorkspace.id}
            />
            <div className="flex gap-3 mt-6">
              <BackButton toStep={3} />
              <Button
                type="button"
                onClick={handleFinish}
                submitting={submitting}
                disabled={subdomainAvailable === false || !subdomain || subdomain.length < 3}
                className="flex-1"
              >
                Finalizar & Entrar no Dashboard
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
