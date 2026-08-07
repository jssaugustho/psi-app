'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api, User } from '@/lib/api';
import { Input } from '@psi/ui';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated: (user: User) => void;
}

export function EditProfileModal({ isOpen, onClose, user, onUserUpdated }: EditProfileModalProps) {
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar formulário com dados do usuário
  useEffect(() => {
    if (isOpen && user) {
      setNome(user.nome || '');
      setSobrenome(user.sobrenome || '');
      setTelefone(user.telefone || '');
      setAvatarUrl(user.avatar_url || null);
      setPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const { url } = await api.uploadImage(file, 'avatar');
      setAvatarUrl(url);
    } catch (err: any) {
      setError(`Erro ao enviar foto: ${err.message || 'Falha no upload.'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita abrir o seletor de arquivos
    setAvatarUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!nome.trim()) {
      setError('O nome é obrigatório.');
      return;
    }
    if (!sobrenome.trim()) {
      setError('O sobrenome é obrigatório.');
      return;
    }
    if (password && password.length < 6) {
      setError('A nova senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('A confirmação da nova senha não confere.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateMe({
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        telefone: telefone.trim() || null,
        avatarUrl,
        password: password.trim() || null,
      });

      setSuccess('Perfil atualizado com sucesso!');
      onUserUpdated(res.user);

      // Fecha o modal após 1 segundo para o usuário ver o feedback de sucesso
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações do perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop com desfoque */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--brand-bg-color) 70%, transparent)',
        }}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="brand-modal w-full max-w-md rounded-2xl p-6 shadow-2xl relative z-10 overflow-y-auto max-h-[90vh] space-y-6"
        style={{
          color: 'var(--brand-text-color)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 bg-transparent border-none cursor-pointer p-1 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold">Editar Perfil</h2>
          <p className="text-xs opacity-60">Atualize suas informações pessoais e credenciais.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload Slot */}
          <div className="flex flex-col items-center space-y-2 mb-2">
            <div
              onClick={handleAvatarClick}
              className="w-20 h-20 rounded-full border-2 border-[var(--surface-border)] relative group overflow-hidden flex items-center justify-center bg-[var(--surface-hover)] cursor-pointer shadow-lg hover:border-[var(--brand-gradient-start)] transition-all shrink-0"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-xl font-bold uppercase"
                  style={{
                    background: 'var(--brand-gradient)',
                    color: 'var(--brand-contrast-color)',
                  }}
                >
                  {nome?.[0] || user.nome?.[0]}
                  {sobrenome?.[0] || user.sobrenome?.[0]}
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[9px] text-white font-bold uppercase tracking-wider mt-1">Alterar</span>
              </div>

              {/* Loader */}
              {uploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <svg className="w-6 h-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                </div>
              )}
            </div>

            {/* Remove picture if exists */}
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-all bg-transparent border-none cursor-pointer"
              >
                Remover Foto
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />
          </div>

          {/* Nome & Sobrenome */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: José"
            />
            <Input
              label="Sobrenome"
              type="text"
              required
              value={sobrenome}
              onChange={(e) => setSobrenome(e.target.value)}
              placeholder="Ex: Silva"
            />
          </div>

          {/* E-mail (Leitura) & Telefone */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider opacity-60 mb-1.5">E-mail</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] text-xs font-semibold opacity-50 cursor-not-allowed bg-[var(--surface-input)] text-[var(--brand-text-color)]"
              />
              <p className="text-[10px] opacity-40 mt-1">O e-mail de acesso não pode ser alterado.</p>
            </div>

            <Input
              label="Telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="Ex: (85) 99999-9999"
            />
          </div>

          {/* Alterar Senha (Opcional) */}
          <div className="pt-2 border-t border-[var(--surface-border)] space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-45">🔒 Alterar Senha (Deixe em branco para manter)</p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nova Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <Input
                label="Confirmar Senha"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
          </div>

          {/* Feedback Alertas */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--surface-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-transparent hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] cursor-pointer disabled:opacity-50 transition-all"
              style={{ color: 'var(--brand-text-color)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold border-none cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md"
              style={{
                background: 'var(--brand-gradient)',
                color: 'var(--brand-contrast-color)',
              }}
            >
              {saving && (
                <svg className="w-3.5 h-3.5 animate-spin text-current" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              )}
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
