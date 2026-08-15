'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { BrandModal, Button, ConfirmModal } from '@psi/ui';
import { Trash2, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useBrand } from '@/context/BrandContext';
import { type UploadType } from '@psi/image-utils';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSelectImage: (asset: { url: string; id: string; key: string; name: string }) => void;
  uploadType?: UploadType;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  onSelectImage,
  uploadType
}) => {
  const { tenant: brandTenant } = useBrand();
  const targetTenantId = (tenantId && tenantId !== 'default') ? tenantId : (brandTenant?.id || '');

  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = useCallback(async () => {
    if (!targetTenantId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMediaAssets(targetTenantId);
      setAssets(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar a galeria.');
    } finally {
      setLoading(false);
    }
  }, [targetTenantId]);

  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      fetchAssets();
    }
  }, [isOpen, activeTab, fetchAssets]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setError('O arquivo excede o limite máximo de 15MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const isTransparentFormat = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/svg+xml';
      const targetUploadType = uploadType || (isTransparentFormat ? 'logo' : 'asset');

      const { url, key } = await api.uploadImage(file, targetUploadType);

      const registered = await api.registerMediaAsset({
        tenantId: targetTenantId,
        name: file.name,
        key,
        url,
        mimeType: file.type || 'image/webp',
        fileSize: file.size,
        isCropped: false
      });

      onSelectImage({
        url: registered.url,
        id: registered.id,
        key: registered.key,
        name: registered.name
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao enviar a imagem.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMediaAsset(id);
      setAssets(prev => prev.filter(asset => asset.id !== id));
    } catch (err: any) {
      console.error(err);
      setError('Erro ao excluir imagem da biblioteca.');
    }
  };

  return (
    <>
      <BrandModal isOpen={isOpen} onClose={onClose}>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Biblioteca de Mídia</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Selecione uma imagem salva ou faça upload de um novo arquivo.</p>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-[var(--surface-border)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`pb-2 px-4 transition-colors bg-transparent border-none cursor-pointer ${
                activeTab === 'library'
                  ? 'text-[var(--brand-gradient-start)] border-b-2 border-[var(--brand-gradient-start)] font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Galeria da Conta
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`pb-2 px-4 transition-colors bg-transparent border-none cursor-pointer ${
                activeTab === 'upload'
                  ? 'text-[var(--brand-gradient-start)] border-b-2 border-[var(--brand-gradient-start)] font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Enviar Arquivo
            </button>
          </div>

          {error && (
            <div className="text-[9px] text-red-500 dark:text-red-400 font-sans font-medium bg-red-500/10 p-2 rounded-lg">
              {error}
            </div>
          )}

          {activeTab === 'library' ? (
            <div className="min-h-[280px] max-h-[360px] overflow-y-auto pr-1">
              {loading ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : assets.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <ImageIcon className="h-8 w-8 opacity-30" />
                  <span className="text-[10px]">Nenhuma imagem na biblioteca.</span>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => onSelectImage({ url: asset.url, id: asset.id, key: asset.key, name: asset.name })}
                      className="relative aspect-square border border-[var(--surface-border)] rounded-lg overflow-hidden group cursor-pointer hover:border-[var(--brand-gradient-start)]/50 transition-all bg-contain bg-center bg-no-repeat bg-[var(--brand-bg-color,transparent)]"
                      style={{
                        backgroundImage: `url(${asset.url})`,
                      }}
                    >
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssetToDelete({ id: asset.id, name: asset.name });
                            }}
                            className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      <span className="text-[7px] text-slate-300 truncate font-sans">
                        {asset.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-[280px] flex flex-col items-center justify-center border-2 border-dashed border-[var(--surface-border)] rounded-xl glass-sm">
            {uploading ? (
              <div className="space-y-2 flex flex-col items-center">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-gradient-start)]" />
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Otimizando e enviando...</span>
              </div>
            ) : (
              <div className="space-y-3 text-center p-6 flex flex-col items-center">
                <Upload className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg brand-accent text-white font-bold text-xs uppercase transition-all cursor-pointer border-none shadow-md"
                  >
                    Selecionar Imagem
                  </button>
                  <p className="text-[8px] text-slate-500 mt-1.5">Arquivos suportados: JPG, PNG, WEBP (Máx. 15MB)</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleUpload}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="text-[10px] uppercase font-bold glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-4 h-8 cursor-pointer"
          >
            Fechar
          </Button>
        </div>
      </div>
    </BrandModal>

    <ConfirmModal
      isOpen={!!assetToDelete}
      onClose={() => setAssetToDelete(null)}
      onConfirm={async () => {
        if (assetToDelete) {
          await handleDelete(assetToDelete.id);
          setAssetToDelete(null);
        }
      }}
      title="Excluir Imagem da Biblioteca"
      description={`Deseja mesmo excluir permanentemente a imagem "${assetToDelete?.name || ''}" da biblioteca?`}
      confirmText="Excluir"
      cancelText="Cancelar"
      variant="danger"
    />
    </>
  );
};
