'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { api } from '@/lib/api';
import { Card, Button, Input, BrandModal } from '@psi/ui';
import { MediaLibraryModal } from '@/components/media-library-modal';
import {
  User as UserIcon,
  Phone,
  Mail,
  ShieldCheck,
  AlertCircle,
  Check,
  Camera,
} from 'lucide-react';

export function UserProfileModal() {
  const { user, setUser: setGlobalAuthUser, isProfileOpen, setIsProfileOpen } = useAuth();
  const { tenant } = useBrand();

  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Modais e Estados de UI
  const [loading, setLoading] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user && isProfileOpen) {
      setNome(user.nome || '');
      setSobrenome(user.sobrenome || '');
      setTelefone(user.telefone || '');
      setAvatarUrl(user.avatar_url || '');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
    }
  }, [user, isProfileOpen]);

  if (!user || !isProfileOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword) {
      if (newPassword.length < 6) {
        setError('A nova senha deve ter no mínimo 6 caracteres.');
        setLoading(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('A confirmação da nova senha não confere.');
        setLoading(false);
        return;
      }
    }

    try {
      let meUpdatedUser = null;
      try {
        const updateMeRes = await api.updateMe({
          nome: nome.trim(),
          sobrenome: sobrenome.trim(),
          telefone: telefone.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          password: newPassword.trim() || null,
        });
        if (updateMeRes && updateMeRes.user) {
          meUpdatedUser = updateMeRes.user;
        }
      } catch (errMe) {
        console.warn('Atualização parcial /auth/me:', errMe);
      }

      const updatedUser = await api.updateProfile(user.id, {
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        telefone: telefone.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });

      const finalUser = updatedUser || meUpdatedUser || user;
      setGlobalAuthUser(finalUser);

      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Dados de acesso e perfil do usuário atualizados com sucesso!');

      setTimeout(() => {
        setIsProfileOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Não foi possível salvar o perfil do usuário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BrandModal
      isOpen={isProfileOpen}
      onClose={() => setIsProfileOpen(false)}
      maxWidth="max-w-xl"
    >
      <div className="space-y-1 pb-3 border-b border-[var(--surface-border)]">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-purple-400" />
          Perfil do Usuário
        </h2>
        <p className="text-xs text-slate-400">
          Gerencie seu nome de usuário, telefone/WhatsApp de acesso e senha da sua conta.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar p-1">
        {/* Alertas */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3.5 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Foto do Perfil */}
        <div className="flex flex-col items-center justify-center space-y-2.5 py-4 border-b border-[var(--surface-border)]/50 mb-2">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500/30 bg-slate-800/80 flex items-center justify-center shadow-lg relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-slate-300 select-none">
                  {nome ? nome[0]?.toUpperCase() : ''}
                  {sobrenome ? sobrenome[0]?.toUpperCase() : ''}
                </span>
              )}
            </div>
            
            {/* Botão de Alterar Foto com Câmera */}
            <button
              type="button"
              onClick={() => setMediaModalOpen(true)}
              className="absolute bottom-0 right-0 p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full cursor-pointer shadow-md transition-all border border-purple-500/20 active:scale-95 flex items-center justify-center w-8 h-8"
              title="Selecionar foto de perfil"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Clique no ícone para alterar foto de perfil
          </span>
        </div>

        {/* 1. Dados Pessoais de Acesso */}
        <Card className="space-y-4 p-5">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-purple-400" />
            Informações Pessoais
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Nome</label>
              <Input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Geovanna"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Sobrenome</label>
              <Input
                type="text"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                placeholder="Ex: Bastos"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-300 block mb-1">WhatsApp / Telefone de Contato</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <Input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 2. Segurança e Credenciais */}
        <Card className="space-y-4 p-5">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            Acesso e Redefinição de Senha
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">E-mail de Login</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-[var(--surface-border)] text-xs text-slate-400 cursor-not-allowed outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">O e-mail da conta não pode ser alterado por segurança.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nova Senha</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Confirmar Senha</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsProfileOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all cursor-pointer bg-transparent border-none"
          >
            Cancelar
          </button>

          <Button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-xs font-bold text-white rounded-xl bg-purple-600 hover:bg-purple-500 transition-all cursor-pointer border-none shadow-lg"
          >
            {loading ? 'Salvar Perfil...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>

      {mediaModalOpen && (
        <MediaLibraryModal
          tenantId={tenant?.id || ''}
          isOpen={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          onSelectImage={(asset: any) => {
            setAvatarUrl(asset.url);
            setMediaModalOpen(false);
          }}
        />
      )}
    </BrandModal>
  );
}
