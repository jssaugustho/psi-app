'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { BrandModal, Button } from '@psi/ui';
import { Trash2, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSelectImage: (asset: { url: string; id: string; key: string; name: string }) => void;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  onSelectImage
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMediaAssets(tenantId);
      setAssets(data || []);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar a galeria.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

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
      const { url, key } = await api.uploadImage(file, 'asset');

      const registered = await api.registerMediaAsset({
        tenantId,
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir permanentemente esta imagem da biblioteca?')) return;

    try {
      await api.deleteMediaAsset(id);
      setAssets(prev => prev.filter(asset => asset.id !== id));
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir a imagem.');
    }
  };

  return (
    <BrandModal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Biblioteca de Mídia</h3>
          <p className="text-[10px] text-slate-400">Escolha uma foto da galeria ou faça o upload de uma nova.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 gap-4">
          <button
            onClick={() => setActiveTab('library')}
            className={`pb-2 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'library'
                ? 'text-[#CC8667] border-b-2 border-[#CC8667]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Galeria
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'text-[#CC8667] border-b-2 border-[#CC8667]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Enviar Arquivo
          </button>
        </div>

        {error && (
          <div className="text-[9px] text-red-400 font-sans font-medium bg-red-400/10 p-2 rounded-lg">
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
                    className="relative aspect-square bg-zinc-900 border border-white/5 rounded-lg overflow-hidden group cursor-pointer hover:border-[#CC8667]/50 transition-all bg-cover bg-center"
                    style={{ backgroundImage: `url(${asset.url})` }}
                  >
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, asset.id)}
                          className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
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
          <div className="h-[280px] flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
            {uploading ? (
              <div className="space-y-2 flex flex-col items-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#CC8667]" />
                <span className="text-[10px] text-slate-400">Otimizando e enviando...</span>
              </div>
            ) : (
              <div className="space-y-3 text-center p-6 flex flex-col items-center">
                <Upload className="h-8 w-8 text-slate-600" />
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-[#CC8667] text-white hover:bg-[#b07053] font-bold text-xs uppercase transition-all cursor-pointer"
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
            className="text-[10px] uppercase font-bold bg-zinc-900 border border-white/5 text-slate-400 hover:text-white px-4 h-8 cursor-pointer"
          >
            Fechar
          </Button>
        </div>
      </div>
    </BrandModal>
  );
};
