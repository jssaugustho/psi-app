'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api, PlatformSetupStatusResponse } from '@/lib/api';
import { Input, Card, Button } from '@psi/ui';
import { Key, Globe, Building2, HardDrive, Link, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface CloudflareSettingsProps {
  platformStatus: PlatformSetupStatusResponse | null;
  onSaved: () => void;
}

export function CloudflareSettings({ platformStatus, onSaved }: CloudflareSettingsProps) {
  const [apiToken, setApiToken] = useState('');
  const [zoneId, setZoneId] = useState(platformStatus?.cloudflare_zone_id || '');
  const [accountId, setAccountId] = useState(platformStatus?.cloudflare_account_id || '');
  const [baseDomain, setBaseDomain] = useState(platformStatus?.base_domain || '');
  const [r2BucketName, setR2BucketName] = useState(platformStatus?.r2_bucket_name || '');
  const [r2PublicDomain, setR2PublicDomain] = useState(platformStatus?.r2_public_domain || '');
  const [r2AccessKeyId, setR2AccessKeyId] = useState('');
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState('');

  // Zone listing state
  const [zones, setZones] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [zonesError, setZonesError] = useState('');

  // Save states
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchZones = useCallback(async (tokenToUse?: string) => {
    setLoadingZones(true);
    setZonesError('');
    setError('');
    try {
      const res = await api.getCloudflareZones(tokenToUse || (apiToken.trim() || undefined));
      if (res.success && res.zones) {
        setZones(res.zones);
        if (res.zones.length > 0) {
          const matched = res.zones.find((z) => z.id === zoneId);
          if (matched) {
            setBaseDomain(matched.name);
          } else if (!baseDomain) {
            setZoneId(res.zones[0].id);
            setBaseDomain(res.zones[0].name);
          }
        }
      }
    } catch (err: any) {
      const errMsg = err.message || 'Não foi possível buscar as Zones do Cloudflare.';
      setZonesError(errMsg);
      setError(errMsg);
    } finally {
      setLoadingZones(false);
    }
  }, [apiToken, baseDomain, zoneId]);

  useEffect(() => {
    if (platformStatus?.has_cloudflare) {
      fetchZones();
    }
  }, [platformStatus?.has_cloudflare]);

  const handleZoneSelect = (selectedZoneId: string) => {
    setZoneId(selectedZoneId);
    const found = zones.find((z) => z.id === selectedZoneId);
    if (found) {
      setBaseDomain(found.name);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.saveCloudflare({
        api_token: apiToken.trim(),
        zone_id: zoneId.trim(),
        account_id: accountId.trim(),
        base_domain: baseDomain.trim() || undefined,
        r2_bucket_name: r2BucketName.trim(),
        r2_public_domain: r2PublicDomain.trim(),
        r2_access_key_id: r2AccessKeyId.trim(),
        r2_secret_access_key: r2SecretAccessKey.trim(),
      });

      setSuccess(res.message || 'Configurações do Cloudflare salvas com sucesso!');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar credenciais do Cloudflare.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 mb-1">Cloudflare & R2 Storage</h2>
          <p className="text-sm text-slate-400">
            Gerencie as credenciais globais do Cloudflare para Custom Hostnames, SSL para SaaS e armazenamento de mídia no R2.
          </p>
        </div>
        {platformStatus?.has_cloudflare && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Cloudflare Conectado</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <Card className="p-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              1. Credenciais da Conta Cloudflare
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300">Cloudflare API Token *</label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder={platformStatus?.has_cloudflare ? '••••••••••••••••••••••••' : 'Insira o API Token'}
                    required={!platformStatus?.has_cloudflare}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fetchZones(apiToken)}
                    disabled={loadingZones}
                    className="shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingZones ? 'animate-spin' : ''}`} />
                    <span>{loadingZones ? 'Buscando...' : 'Buscar Domínios'}</span>
                  </Button>
                </div>
                {zonesError ? (
                  <p className="text-xs text-red-400 font-medium pt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{zonesError}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    O token deve possuir permissões de leitura/edição para SSL, Custom Hostnames e Zones.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Domínio Base da Plataforma (Zone) *</label>
                {zones.length > 0 ? (
                  <select
                    value={zoneId}
                    onChange={(e) => handleZoneSelect(e.target.value)}
                    className="w-full h-10 px-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.status})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    value={baseDomain}
                    onChange={(e) => setBaseDomain(e.target.value)}
                    placeholder="ex: psiapp.com.br"
                  />
                )}
                <p className="text-[11px] text-slate-500">
                  Domínio que servirá de base para os subdomínios gratuitos (ex: <code className="text-slate-300">*.psiapp.com.br</code>) e CNAME target.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Cloudflare Zone ID *</label>
                <Input
                  type="text"
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  placeholder="ID da Zone no Cloudflare"
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300">Cloudflare Account ID *</label>
                <Input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="ID da Conta Cloudflare (usado para o R2)"
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              2. Armazenamento de Arquivos Cloudflare R2
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nome do Bucket R2 *</label>
                <Input
                  type="text"
                  value={r2BucketName}
                  onChange={(e) => setR2BucketName(e.target.value)}
                  placeholder="ex: psiapp-assets"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Domínio Público do Bucket R2 *</label>
                <Input
                  type="text"
                  value={r2PublicDomain}
                  onChange={(e) => setR2PublicDomain(e.target.value)}
                  placeholder="ex: https://assets.psiapp.com.br"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">R2 Access Key ID *</label>
                <Input
                  type="text"
                  value={r2AccessKeyId}
                  onChange={(e) => setR2AccessKeyId(e.target.value)}
                  placeholder="Access Key S3 API"
                  required={!platformStatus?.has_r2}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">R2 Secret Access Key *</label>
                <Input
                  type="password"
                  value={r2SecretAccessKey}
                  onChange={(e) => setR2SecretAccessKey(e.target.value)}
                  placeholder="Secret Access Key S3 API"
                  required={!platformStatus?.has_r2}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-4 flex justify-end">
            <Button type="submit" disabled={saving} className="px-6">
              {saving ? 'Validando & Salvando...' : 'Salvar Configurações do Cloudflare'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
