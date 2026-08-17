'use client';

import React, { useState, useEffect } from 'react';
import { api, PlatformSetupStatusResponse } from '@/lib/api';
import { Input, Card, Button } from '@psi/ui';
import { Key, Globe, Building2, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, Sparkles, ExternalLink, Activity } from 'lucide-react';

interface CloudflareDomainsSettingsProps {
  platformStatus: PlatformSetupStatusResponse | null;
  onSaved: () => void;
}

export function CloudflareDomainsSettings({ platformStatus, onSaved }: CloudflareDomainsSettingsProps) {
  const [apiToken, setApiToken] = useState('');
  const [zoneId, setZoneId] = useState(platformStatus?.cloudflare_zone_id || '');
  const [accountId, setAccountId] = useState(platformStatus?.cloudflare_account_id || '');
  const [baseDomain, setBaseDomain] = useState(platformStatus?.base_domain || '');

  // Permission test state
  const [testingPermissions, setTestingPermissions] = useState(false);
  const [permissionReport, setPermissionReport] = useState<Array<{ name: string; status: 'ok' | 'warning' | 'error'; detail: string }> | null>(null);

  // Save states
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (platformStatus) {
      if (platformStatus.cloudflare_zone_id) setZoneId(platformStatus.cloudflare_zone_id);
      if (platformStatus.cloudflare_account_id) setAccountId(platformStatus.cloudflare_account_id);
      if (platformStatus.base_domain) setBaseDomain(platformStatus.base_domain);
    }
  }, [platformStatus]);

  const handleTestPermissions = async () => {
    setTestingPermissions(true);
    setError('');
    try {
      const res = await api.testCloudflarePermissions({
        api_token: apiToken.trim() || undefined,
        zone_id: zoneId.trim() || undefined,
        account_id: accountId.trim() || undefined,
      });

      if (res.permissions) {
        setPermissionReport(res.permissions);
        if (res.zoneName) setBaseDomain(res.zoneName);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao testar permissões do Cloudflare.');
    } finally {
      setTestingPermissions(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.saveCloudflareDomains({
        api_token: apiToken.trim() || undefined,
        zone_id: zoneId.trim(),
        account_id: accountId.trim(),
        base_domain: baseDomain.trim() || undefined,
      });

      setSuccess(res.message || 'Configurações de Domínio salvas com sucesso!');
      setApiToken('');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar as configurações de domínio.');
    } finally {
      setSaving(false);
    }
  };

  const sampleSlug = 'dra-geovanna';
  const previewDomain = baseDomain ? baseDomain.replace(/^https?:\/\//, '') : 'ajstrategy.digital';
  const fullPreviewUrl = `https://${sampleSlug}.${previewDomain}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-400" />
          Domínios & SSL (Cloudflare DNS)
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Gerencie a integração com o Cloudflare para subdomínios automáticos das psicólogas e certificados SSL da plataforma.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Erro no Cloudflare</p>
            <p className="text-xs opacity-90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-medium">{success}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6 space-y-5 bg-slate-900/60 border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                1. Credenciais da Conta Cloudflare
              </h3>
            </div>
            <button
              type="button"
              onClick={handleTestPermissions}
              disabled={testingPermissions}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700/80 hover:border-indigo-500/50 bg-slate-950/80 hover:bg-indigo-500/10 text-xs font-semibold text-indigo-300 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Activity className={`w-3.5 h-3.5 ${testingPermissions ? 'animate-spin' : ''}`} />
              {testingPermissions ? 'Testando...' : 'Testar Conexão & Permissões'}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Cloudflare API Token {platformStatus?.has_cloudflare && <span className="text-slate-500 font-normal">(Preenchido — digite apenas se desejar atualizar)</span>}
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  placeholder={platformStatus?.has_cloudflare ? '••••••••••••••••••••••••' : 'Cole seu Token da API do Cloudflare'}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="pl-9 bg-slate-950/60 border-slate-800 focus:border-indigo-500 font-mono text-xs"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                O token deve possuir permissões de leitura/edição para SSL e Zones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Domínio Base dos Sites (Zone Name) *
                </label>
                <Input
                  type="text"
                  placeholder="ex: ajstrategy.digital"
                  value={baseDomain}
                  onChange={(e) => setBaseDomain(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 focus:border-indigo-500 font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Domínio base onde os subdomínios gratuitos serão criados.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Cloudflare Zone ID *
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Zone ID de 32 caracteres"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="pl-9 bg-slate-950/60 border-slate-800 focus:border-indigo-500 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Cloudflare Account ID *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Account ID de 32 caracteres"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="pl-9 bg-slate-950/60 border-slate-800 focus:border-indigo-500 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* PAINEL DE RELATÓRIO DE PERMISSÕES */}
          {permissionReport && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 animate-fadeIn">
              <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Relatório de Conexão com a API do Cloudflare
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {permissionReport.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 flex flex-col justify-between gap-1">
                    <span className="text-[11px] font-semibold text-slate-300">{p.name}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      {p.status === 'ok' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ✓ VÁLIDO / ATIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          ⚠ REVISAR
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">{p.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* CARTÃO PREVIEW DE SUBDOMÍNIOS GRATUITOS */}
        <Card className="p-6 space-y-4 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-cyan-950/40 border-indigo-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
              2. Subdomínios Dinâmicos para Psicólogas (Preview ao Vivo)
            </h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Cada psicóloga cadastrada na plataforma recebe instantaneamente um site profissional sob o seu domínio base. As requisições são roteadas via Edge Proxy sem necessidade de compilação ou reinicialização.
          </p>

          <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-500/30 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block mb-0.5">
                Exemplo de URL Gerada Automaticamente
              </span>
              <span className="text-sm font-mono font-bold text-white tracking-wide">
                {fullPreviewUrl}
              </span>
            </div>
            <a
              href={fullPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 border border-indigo-500/30 transition-colors"
            >
              Testar URL <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 font-medium shadow-lg shadow-indigo-600/20"
          >
            {saving ? 'Salvando Domínios...' : 'Salvar Configurações de Domínio'}
          </Button>
        </div>
      </form>
    </div>
  );
}
