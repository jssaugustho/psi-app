'use client';

import React, { useState, useEffect } from 'react';
import { api, PlatformSetupStatusResponse, R2BucketConfig } from '@/lib/api';
import { Input, Card, Button, BrandModal } from '@psi/ui';
import { HardDrive, Key, Link, ShieldCheck, CheckCircle2, AlertCircle, Plus, Trash2, Database, Layers } from 'lucide-react';

interface R2StorageSettingsProps {
  platformStatus: PlatformSetupStatusResponse | null;
  onSaved: () => void;
}

export function R2StorageSettings({ platformStatus, onSaved }: R2StorageSettingsProps) {
  const [r2BucketName, setR2BucketName] = useState(platformStatus?.r2_bucket_name || '');
  const [r2PublicDomain, setR2PublicDomain] = useState(platformStatus?.r2_public_domain || '');
  const [r2AccessKeyId, setR2AccessKeyId] = useState('');
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState('');

  // Backup Buckets List State
  const [backupBuckets, setBackupBuckets] = useState<R2BucketConfig[]>([]);

  // Modal / Form state for adding/editing backup bucket
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [backupForm, setBackupForm] = useState({
    name: '',
    publicDomain: '',
    accessKeyId: '',
    secretAccessKey: '',
  });

  // Save states
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (platformStatus) {
      if (platformStatus.r2_bucket_name) setR2BucketName(platformStatus.r2_bucket_name);
      if (platformStatus.r2_public_domain) setR2PublicDomain(platformStatus.r2_public_domain);
      if (platformStatus.backup_r2_buckets) setBackupBuckets(platformStatus.backup_r2_buckets);
    }
  }, [platformStatus]);

  const openAddModal = () => {
    setEditingId(null);
    setBackupForm({ name: '', publicDomain: '', accessKeyId: '', secretAccessKey: '' });
    setModalOpen(true);
  };

  const openEditModal = (bucket: R2BucketConfig) => {
    setEditingId(bucket.id);
    setBackupForm({
      name: bucket.name,
      publicDomain: bucket.publicDomain,
      accessKeyId: bucket.accessKeyId,
      secretAccessKey: bucket.secretAccessKey,
    });
    setModalOpen(true);
  };

  const handleSaveBackupBucket = () => {
    if (!backupForm.name.trim() || !backupForm.publicDomain.trim() || !backupForm.accessKeyId.trim() || !backupForm.secretAccessKey.trim()) {
      alert('Por favor, preencha todos os campos do Bucket de Reserva.');
      return;
    }

    let formattedDomain = backupForm.publicDomain.trim();
    if (!formattedDomain.startsWith('http://') && !formattedDomain.startsWith('https://')) {
      formattedDomain = `https://${formattedDomain}`;
    }
    if (formattedDomain.endsWith('/')) {
      formattedDomain = formattedDomain.slice(0, -1);
    }

    if (editingId) {
      setBackupBuckets((prev) =>
        prev.map((b) =>
          b.id === editingId
            ? {
                ...b,
                name: backupForm.name.trim(),
                publicDomain: formattedDomain,
                accessKeyId: backupForm.accessKeyId.trim(),
                secretAccessKey: backupForm.secretAccessKey.trim(),
              }
            : b
        )
      );
    } else {
      const newBucket: R2BucketConfig = {
        id: `backup-${Date.now()}`,
        name: backupForm.name.trim(),
        publicDomain: formattedDomain,
        accessKeyId: backupForm.accessKeyId.trim(),
        secretAccessKey: backupForm.secretAccessKey.trim(),
        isBackup: true,
      };
      setBackupBuckets((prev) => [...prev, newBucket]);
    }

    setModalOpen(false);
  };

  const handleRemoveBackupBucket = (id: string) => {
    setBackupBuckets((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.saveR2Storage({
        r2_bucket_name: r2BucketName.trim(),
        r2_public_domain: r2PublicDomain.trim(),
        r2_access_key_id: r2AccessKeyId.trim() || undefined,
        r2_secret_access_key: r2SecretAccessKey.trim() || undefined,
        backup_r2_buckets: backupBuckets,
      });

      setSuccess(res.message || 'Configurações de Armazenamento R2 salvas com sucesso!');
      setR2AccessKeyId('');
      setR2SecretAccessKey('');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar o armazenamento R2.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" />
          Armazenamento de Mídia (Cloudflare R2 Buckets)
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Gerencie o Bucket Principal de arquivos e cadastre buckets de reserva (opcionais) para alta disponibilidade.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Erro ao salvar configurações de armazenamento</p>
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

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* BUCKET PRINCIPAL */}
        <Card className="p-6 space-y-5 bg-slate-900/60 border-slate-800 backdrop-blur-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              1. Bucket Principal R2 (Padrão da Plataforma)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nome do Bucket R2 *
              </label>
              <Input
                type="text"
                placeholder="ex: app-aj-strategy"
                value={r2BucketName}
                onChange={(e) => setR2BucketName(e.target.value)}
                className="bg-slate-950/60 border-slate-800 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Domínio Público do Bucket R2 *
              </label>
              <div className="relative">
                <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="https://storage.meudominio.com.br"
                  value={r2PublicDomain}
                  onChange={(e) => setR2PublicDomain(e.target.value)}
                  className="pl-9 bg-slate-950/60 border-slate-800 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                R2 Access Key ID * {platformStatus?.has_r2 && <span className="text-slate-500 font-normal">(Preenchido)</span>}
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  placeholder={platformStatus?.has_r2 ? '••••••••••••••••' : 'Access Key S3 API'}
                  value={r2AccessKeyId}
                  onChange={(e) => setR2AccessKeyId(e.target.value)}
                  className="pl-9 bg-slate-950/60 border-slate-800 focus:border-indigo-500 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                R2 Secret Access Key * {platformStatus?.has_r2 && <span className="text-slate-500 font-normal">(Preenchido)</span>}
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  placeholder={platformStatus?.has_r2 ? '••••••••••••••••••••••••••••••••' : 'Secret Token R2 de 64 caracteres'}
                  value={r2SecretAccessKey}
                  onChange={(e) => setR2SecretAccessKey(e.target.value)}
                  className="pl-9 bg-slate-950/60 border-slate-800 focus:border-indigo-500 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* BUCKETS DE RESERVA (OPCIONAL) */}
        <Card className="p-6 space-y-5 bg-slate-900/60 border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                2. Buckets de Reserva (Opcional - Multi-Bucket Storage)
              </h3>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700/80 hover:border-indigo-500/50 bg-slate-950/80 hover:bg-indigo-500/10 text-xs font-semibold text-indigo-300 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Bucket de Reserva
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Cadastre buckets de backup para failover automático de mídia caso o bucket principal atinja limites de quota ou passe por manutenção.
          </p>

          {backupBuckets.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 text-center space-y-2">
              <HardDrive className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Nenhum bucket de reserva cadastrado.</p>
              <p className="text-[11px] text-slate-500">
                O uso de buckets de reserva é totalmente opcional. Todos os uploads usam o Bucket Principal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {backupBuckets.map((bucket, index) => (
                <div
                  key={bucket.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{bucket.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{bucket.publicDomain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openEditModal(bucket)}
                      className="text-[11px] h-8 border-slate-700 hover:bg-slate-800"
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRemoveBackupBucket(bucket.id)}
                      className="text-[11px] h-8 border-red-500/20 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 font-medium shadow-lg shadow-indigo-600/20"
          >
            {saving ? 'Salvação em andamento...' : 'Salvar Configurações de Armazenamento'}
          </Button>
        </div>
      </form>

      {/* MODAL ADICIONAR / EDITAR BUCKET DE RESERVA */}
      <BrandModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="max-w-lg"
      >
        <div className="space-y-1 pb-3 border-b border-[var(--surface-border)]">
          <h3 className="text-lg font-bold text-slate-100">
            {editingId ? 'Editar Bucket de Reserva' : 'Adicionar Bucket de Reserva'}
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Nome do Bucket *</label>
            <Input
              type="text"
              placeholder="ex: app-aj-strategy-backup-1"
              value={backupForm.name}
              onChange={(e) => setBackupForm({ ...backupForm, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Domínio Público do Bucket *</label>
            <Input
              type="text"
              placeholder="https://storage2.meudominio.com.br"
              value={backupForm.publicDomain}
              onChange={(e) => setBackupForm({ ...backupForm, publicDomain: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Access Key ID *</label>
            <Input
              type="password"
              placeholder="Access Key S3"
              value={backupForm.accessKeyId}
              onChange={(e) => setBackupForm({ ...backupForm, accessKeyId: e.target.value })}
              className="font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Secret Access Key *</label>
            <Input
              type="password"
              placeholder="Secret Access Key S3 de 64 caracteres"
              value={backupForm.secretAccessKey}
              onChange={(e) => setBackupForm({ ...backupForm, secretAccessKey: e.target.value })}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--surface-border)]">
          <Button
            type="button"
            variant="outline"
            onClick={() => setModalOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSaveBackupBucket}
          >
            {editingId ? 'Atualizar' : 'Adicionar'}
          </Button>
        </div>
      </BrandModal>
    </div>
  );
}
