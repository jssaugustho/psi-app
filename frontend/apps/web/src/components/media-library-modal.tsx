'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { BrandModal, Button, ConfirmModal } from '@psi/ui';
import { Trash2, Upload, Image as ImageIcon, Loader2, CheckSquare, Square, ZoomIn, ZoomOut, ArrowLeft, ShieldAlert, Maximize2, Focus, Sun, Moon } from 'lucide-react';
import { useBrand } from '@/context/BrandContext';
import { type UploadType, validateImageSafety, checkHasAlphaChannel, type ImageCategory } from '@psi/image-utils';

/**
 * Detecta a luminância média de uma imagem para ajustar automaticamente
 * o contraste do fundo do modal de corte (fundo claro para logotipo escuro, fundo escuro para logotipo claro).
 */
function detectImageLuminance(img: HTMLImageElement): 'dark' | 'light' {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 60;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'dark';
    ctx.drawImage(img, 0, 0, 60, 60);
    const imageData = ctx.getImageData(0, 0, 60, 60);
    const data = imageData.data;
    let totalLum = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 30) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = (r * 299 + g * 587 + b * 114) / 1000;
        totalLum += lum;
        count++;
      }
    }
    if (count === 0) return 'dark';
    const avgLum = totalLum / count;
    return avgLum < 140 ? 'dark' : 'light';
  } catch (e) {
    return 'dark';
  }
}

export interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  resolution?: { width: number; height: number };
  type?: ImageCategory;
  onSelectImage: (asset: any) => void;
  uploadType?: UploadType;
  usageContext?: string;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  resolution = { width: 800, height: 800 },
  type = 'imagem',
  onSelectImage,
  uploadType,
  usageContext
}) => {
  const { tenant: brandTenant } = useBrand();
  const targetTenantId = (tenantId && tenantId !== 'default') ? tenantId : (brandTenant?.id || '');

  // Modal Step State: 'gallery' | 'crop'
  const [step, setStep] = useState<'gallery' | 'crop'>('gallery');
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-selection for Mass Delete
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string } | null>(null);

  // Crop Step States
  const [selectedAsset, setSelectedAsset] = useState<{ id?: string; name: string; url: string } | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [workspaceTheme, setWorkspaceTheme] = useState<'dark' | 'light'>('dark');
  const [processingCrop, setProcessingCrop] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetWidth = resolution.width || 800;
  const targetHeight = resolution.height || 800;
  const targetAspect = targetWidth / targetHeight;
  const isLogo = type === 'logotipo';

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
    if (isOpen) {
      if (step === 'gallery') {
        fetchAssets();
      }
    } else {
      // Reset state on modal close
      setStep('gallery');
      setActiveTab('library');
      setIsMultiSelectMode(false);
      setSelectedAssetIds([]);
      setImageSrc(null);
      setSelectedAsset(null);
      setError(null);
    }
  }, [isOpen, step, activeTab, fetchAssets]);

  // Read natural image dimensions when imageSrc changes for Crop step
  useEffect(() => {
    if (imageSrc) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      img.onload = () => {
        setImgDimensions({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      };
    } else {
      setImgDimensions(null);
    }
  }, [imageSrc]);

  // Handle direct file upload from computer
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setError('O arquivo excede o limite máximo permitido de 15MB.');
      return;
    }

    // Safety validation check
    const validation = await validateImageSafety(file, { resolution, type });
    if (!validation.valid && validation.error) {
      setError(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Read as Data URL to send to Crop step
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedAsset({ name: file.name, url: dataUrl });
      setImageSrc(dataUrl);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setStep('crop');
      setError(null);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectAssetForCrop = (asset: { id: string; name: string; url: string }) => {
    if (isMultiSelectMode) {
      setSelectedAssetIds(prev =>
        prev.includes(asset.id) ? prev.filter(id => id !== asset.id) : [...prev, asset.id]
      );
      return;
    }
    setSelectedAsset(asset);
    setImageSrc(asset.url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setStep('crop');
    setError(null);
  };

  // Mass deletion handler
  const handleBulkDelete = async () => {
    if (selectedAssetIds.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(selectedAssetIds.map(id => api.deleteMediaAsset(id)));
      setAssets(prev => prev.filter(asset => !selectedAssetIds.includes(asset.id)));
      setSelectedAssetIds([]);
      setIsMultiSelectMode(false);
      setShowBulkDeleteConfirm(false);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao excluir imagens selecionadas.');
    } finally {
      setLoading(false);
    }
  };

  // Single asset deletion
  const handleDeleteSingle = async (id: string) => {
    try {
      await api.deleteMediaAsset(id);
      setAssets(prev => prev.filter(asset => asset.id !== id));
      setAssetToDelete(null);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao excluir imagem.');
    }
  };

  // Dragging logic for crop viewport
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Responsive Crop Frame calculations
  // Modal max crop container width & height
  const maxCropW = 600;
  const maxCropH = 380;

  let frameW = maxCropW;
  let frameH = frameW / targetAspect;

  if (frameH > maxCropH) {
    frameH = maxCropH;
    frameW = frameH * targetAspect;
  }

  // Calculate base display dimensions of original image to fit crop box gracefully without squishing
  let baseW = 0;
  let baseH = 0;

  if (imgDimensions && imgDimensions.width > 0 && imgDimensions.height > 0) {
    const imgRatio = imgDimensions.width / imgDimensions.height;
    if (imgRatio > targetAspect) {
      baseH = frameH;
      baseW = frameH * imgRatio;
    } else {
      baseW = frameW;
      baseH = frameW / imgRatio;
    }
  }

  // Process final Crop & Upload to R2
  const handleConfirmCrop = async () => {
    if (!imageSrc || !selectedAsset) return;
    setProcessingCrop(true);
    setError(null);

    try {
      const croppedFile = await new Promise<File>((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        const cacheBustUrl = imageSrc.startsWith('data:') ? imageSrc : (imageSrc.includes('?') ? `${imageSrc}&t=${Date.now()}` : `${imageSrc}?t=${Date.now()}`);
        img.src = cacheBustUrl;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Contexto 2D do Canvas indisponível.'));

          // Handle Transparency Rule
          if (isLogo) {
            ctx.clearRect(0, 0, targetWidth, targetHeight);
          } else {
            // Fill background with solid white for non-logos (impassable transparency check)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
          }

          // Calculate exact natural image scale to avoid any distortion on canvas
          const imgRatio = img.naturalWidth / img.naturalHeight;
          let drawBaseW = frameW;
          let drawBaseH = frameH;
          if (imgRatio > targetAspect) {
            drawBaseH = frameH;
            drawBaseW = frameH * imgRatio;
          } else {
            drawBaseW = frameW;
            drawBaseH = frameW / imgRatio;
          }

          // Screen position calculation
          const centerX = frameW / 2 + offset.x;
          const centerY = frameH / 2 + offset.y;
          const drawX = centerX - (drawBaseW * zoom) / 2;
          const drawY = centerY - (drawBaseH * zoom) / 2;

          // Scale to target output resolution
          const scaleToTarget = targetWidth / frameW;
          const canvasDrawX = drawX * scaleToTarget;
          const canvasDrawY = drawY * scaleToTarget;
          const canvasDrawW = (drawBaseW * zoom) * scaleToTarget;
          const canvasDrawH = (drawBaseH * zoom) * scaleToTarget;

          ctx.drawImage(img, canvasDrawX, canvasDrawY, canvasDrawW, canvasDrawH);

          // WebP format selection with fallback
          const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
          let outputMime = isLogo ? (supportsWebP ? 'image/webp' : 'image/png') : (supportsWebP ? 'image/webp' : 'image/jpeg');
          let outputExt = isLogo ? (supportsWebP ? 'webp' : 'png') : (supportsWebP ? 'webp' : 'jpg');

          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Falha ao gerar blob do corte.'));
              const baseName = selectedAsset.name.split('.').slice(0, -1).join('.') || 'image';
              const fileResult = new File([blob], `${baseName}_cropped.${outputExt}`, {
                type: outputMime,
                lastModified: Date.now(),
              });
              resolve(fileResult);
            },
            outputMime,
            0.88
          );
        };
        img.onerror = () => reject(new Error('Erro ao carregar a imagem original para o corte.'));
      });

      // 1. Upload file to Cloudflare R2
      const targetUploadType = uploadType || (isLogo ? 'logo' : 'asset');
      const { url, key } = await api.uploadImage(croppedFile, targetUploadType);

      // 2. Register media asset
      const registered = await api.registerMediaAsset({
        tenantId: targetTenantId,
        name: croppedFile.name,
        key,
        url,
        mimeType: croppedFile.type,
        fileSize: croppedFile.size,
        isCropped: true,
        parentId: selectedAsset.id || null,
        usageContext: usageContext || null
      });

      // 3. Safety validation of final output
      const validation = await validateImageSafety(registered.url, { resolution, type });
      if (!validation.valid && validation.error) {
        setError(validation.error);
        setProcessingCrop(false);
        return;
      }

      // 4. Update gallery assets state
      await fetchAssets();

      // 5. Fire callback returning R2 storage URL
      onSelectImage(registered.url);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao processar e salvar imagem recortada.');
    } finally {
      setProcessingCrop(false);
    }
  };

  return (
    <>
      <BrandModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                {step === 'crop' && (
                  <button
                    type="button"
                    onClick={() => setStep('gallery')}
                    className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-slate-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {step === 'gallery' ? 'Biblioteca de Mídia' : 'Ajustar e Recortar Imagem'}
                </h3>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {step === 'gallery'
                  ? 'Selecione uma imagem da sua galeria ou envie um novo arquivo.'
                  : `Enquadre a imagem no molde de corte com proporção ${targetWidth}x${targetHeight}px.`}
              </p>
            </div>

            {/* Badge for Resolution */}
            <div className="flex items-center gap-2 font-mono text-[9px] shrink-0 mr-10">
              <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold whitespace-nowrap">
                {targetWidth} × {targetHeight}px
              </span>
            </div>
          </div>

          {error && (
            <div className="text-[11px] text-red-500 dark:text-red-400 font-medium bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: GALLERY & UPLOAD */}
          {step === 'gallery' && (
            <div className="space-y-3">
              {/* Tab Selector & Multi-select Toolbar */}
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] text-xs font-semibold pb-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className={`pb-1 px-3 transition-colors bg-transparent border-none cursor-pointer whitespace-nowrap ${
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
                    className={`pb-1 px-3 transition-colors bg-transparent border-none cursor-pointer whitespace-nowrap ${
                      activeTab === 'upload'
                        ? 'text-[var(--brand-gradient-start)] border-b-2 border-[var(--brand-gradient-start)] font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Enviar Arquivo
                  </button>
                </div>

                {activeTab === 'library' && assets.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMultiSelectMode(!isMultiSelectMode);
                        setSelectedAssetIds([]);
                      }}
                      className="px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg border border-[var(--surface-border)] glass-sm text-slate-700 dark:text-slate-300 hover:bg-[var(--surface-hover)] cursor-pointer transition-all whitespace-nowrap"
                    >
                      {isMultiSelectMode ? 'Cancelar Seleção' : 'Seleção Múltipla'}
                    </button>

                    {isMultiSelectMode && selectedAssetIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        className="px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white cursor-pointer transition-all flex items-center gap-1 border-none whitespace-nowrap"
                      >
                        <Trash2 className="h-3 w-3" />
                        Excluir Selecionadas ({selectedAssetIds.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Gallery Grid */}
              {activeTab === 'library' ? (
                <div className="min-h-[320px] max-h-[440px] overflow-y-auto pr-1">
                  {loading ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
                    </div>
                  ) : assets.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
                      <ImageIcon className="h-10 w-10 opacity-30" />
                      <span className="text-xs">Nenhuma imagem salva na biblioteca.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {assets.map((asset) => {
                        const isSelected = selectedAssetIds.includes(asset.id);
                        return (
                          <div
                            key={asset.id}
                            onClick={() => handleSelectAssetForCrop(asset)}
                            className={`relative aspect-square border rounded-xl overflow-hidden group cursor-pointer transition-all bg-[var(--brand-bg-color,transparent)] ${
                              isSelected
                                ? 'border-2 border-indigo-500 ring-2 ring-indigo-500/30'
                                : 'border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)]/60'
                            }`}
                          >
                            <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                            {/* Checkbox indicator in Multi-select Mode */}
                            {isMultiSelectMode ? (
                              <div className="absolute top-2 left-2 z-10">
                                {isSelected ? (
                                  <CheckSquare className="h-5 w-5 text-indigo-400 bg-zinc-950 rounded" />
                                ) : (
                                  <Square className="h-5 w-5 text-slate-400/80 hover:text-white" />
                                )}
                              </div>
                            ) : (
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAssetToDelete({ id: asset.id, name: asset.name });
                                    }}
                                    className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/40 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <span className="text-[9px] text-slate-200 truncate font-sans font-medium">
                                  {asset.name}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Upload Tab */
                <div className="h-[320px] flex flex-col items-center justify-center border-2 border-dashed border-[var(--surface-border)] rounded-2xl glass-sm">
                  <div className="space-y-3 text-center p-6 flex flex-col items-center">
                    <Upload className="h-10 w-10 text-slate-400 dark:text-slate-600" />
                    <div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl brand-accent text-white font-bold text-xs uppercase transition-all cursor-pointer border-none shadow-lg whitespace-nowrap"
                      >
                        Selecionar Imagem do Computador
                      </button>
                      <p className="text-[10px] text-slate-500 mt-2">Formatos aceitos: JPG, PNG, WEBP (Máx. 15MB)</p>
                      {!isLogo && (
                        <p className="text-[9px] text-amber-500/90 mt-1 italic">
                          * Imagens normais recebem fundo sólido opaca automaticamente.
                        </p>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CROP & ADJUSTMENT VIEWPORT */}
          {step === 'crop' && (
            <div className="space-y-4">
              {/* Full Interactive Workspace Container (400px height, full width) */}
              <div
                className="relative w-full h-[400px] flex items-center justify-center rounded-2xl border border-[var(--surface-border)] overflow-hidden select-none shadow-inner cursor-grab active:cursor-grabbing transition-colors duration-300"
                style={{
                  background: workspaceTheme === 'light'
                    ? 'repeating-conic-gradient(#f8fafc 0% 25%, #e2e8f0 0% 50%) 0 0 / 20px 20px'
                    : 'repeating-conic-gradient(#18181b 0% 25%, #09090b 0% 50%) 0 0 / 20px 20px'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY < 0 ? 0.05 : -0.05;
                  setZoom((prev) => Math.min(Math.max(0.1, prev + delta), 8.0));
                }}
              >
                {/* Floating Corner Toolbar: High-Contrast Enquadrar, Centralizar & Theme Toggle */}
                <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                  {/* Background Contrast Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setWorkspaceTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                    title="Alternar contraste do fundo do molde (Claro / Escuro)"
                    className="p-2 rounded-xl bg-zinc-950 text-white border border-zinc-700 hover:border-amber-400/80 shadow-2xl transition-all cursor-pointer select-none active:scale-95"
                  >
                    {workspaceTheme === 'dark' ? (
                      <Sun className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Moon className="h-4 w-4 text-indigo-400" />
                    )}
                  </button>

                  {/* Enquadrar Button (Re-enquadra ajustando o zoom e a posição) */}
                  <button
                    type="button"
                    onClick={() => {
                      setOffset({ x: 0, y: 0 });
                      setZoom(1);
                    }}
                    title="Reenquadra a imagem centralizada no molde ajustando o zoom"
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-950 text-white border border-zinc-700 shadow-2xl hover:bg-zinc-900 hover:border-indigo-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none whitespace-nowrap active:scale-95"
                  >
                    <Maximize2 className="h-3.5 w-3.5 text-indigo-400" />
                    Enquadrar
                  </button>

                  {/* Centralizar Button (Centraliza a posição mantendo o zoom atual) */}
                  <button
                    type="button"
                    onClick={() => {
                      setOffset({ x: 0, y: 0 });
                    }}
                    title="Centraliza a imagem na posição sem mexer no nível de zoom"
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-950 text-white border border-zinc-700 shadow-2xl hover:bg-zinc-900 hover:border-indigo-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none whitespace-nowrap active:scale-95"
                  >
                    <Focus className="h-3.5 w-3.5 text-indigo-400" />
                    Centralizar
                  </button>
                </div>

                {/* 1. Full Image rendered across the entire workspace */}
                {imageSrc && (
                  <img
                    src={imageSrc}
                    alt="Crop Preview Workspace"
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (img.naturalWidth && img.naturalHeight) {
                        setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                        // Auto-detect luminance to pick best contrast background
                        const lumCategory = detectImageLuminance(img);
                        setWorkspaceTheme(lumCategory === 'dark' ? 'light' : 'dark');
                      }
                    }}
                    className="absolute max-w-none pointer-events-none transition-transform ease-out duration-75 select-none"
                    style={{
                      width: baseW > 0 ? `${baseW}px` : 'auto',
                      height: baseH > 0 ? `${baseH}px` : 'auto',
                      left: '50%',
                      top: '50%',
                      transform: baseW > 0
                        ? `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`
                        : 'translate(-50%, -50%)',
                      transformOrigin: 'center center',
                    }}
                  />
                )}

                {/* 2. Highlight Cutout Frame Mask with contrast Overlay outside */}
                <div
                  className={`absolute pointer-events-none border-2 border-dashed border-indigo-500 rounded-lg z-10 ${
                    workspaceTheme === 'light'
                      ? 'shadow-[0_0_0_9999px_rgba(241,245,249,0.85)]'
                      : 'shadow-[0_0_0_9999px_rgba(9,9,11,0.85)]'
                  }`}
                  style={{
                    width: `${frameW}px`,
                    height: `${frameH}px`,
                    left: `calc(50% - ${frameW / 2}px)`,
                    top: `calc(50% - ${frameH / 2}px)`,
                  }}
                >
                  {/* Rule of Thirds Grid Overlay (inside crop frame) */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
                    <div className={`border-r border-b ${workspaceTheme === 'light' ? 'border-slate-900/30' : 'border-white/30'}`}></div>
                    <div className={`border-r border-b ${workspaceTheme === 'light' ? 'border-slate-900/30' : 'border-white/30'}`}></div>
                    <div className={`border-b ${workspaceTheme === 'light' ? 'border-slate-900/30' : 'border-white/30'}`}></div>
                    <div className={`border-r border-b ${workspaceTheme === 'light' ? 'border-slate-900/30' : 'border-white/30'}`}></div>
                    <div className={`border-r border-b ${workspaceTheme === 'light' ? 'border-slate-900/30' : 'border-white/30'}`}></div>
                    <div className={`border-b ${workspaceTheme === 'light' ? 'border-slate-900/30' : 'border-white/30'}`}></div>
                  </div>
                </div>
              </div>

              {/* Controls: Zoom Slider & Action Button Hierarchy */}
              <div className="flex flex-wrap items-center justify-between gap-4 glass-sm p-3.5 rounded-2xl border border-[var(--surface-border)]">
                <div className="flex items-center gap-3 min-w-[220px] flex-1">
                  <ZoomOut className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="range"
                    min="0.1"
                    max="6.0"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[var(--brand-gradient-start,#6366f1)]"
                  />
                  <ZoomIn className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-[11px] font-mono font-bold text-slate-300 w-12 text-right shrink-0">
                    {zoom.toFixed(2)}x
                  </span>
                </div>

                {/* Button Action Hierarchy */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Secondary Button: Voltar */}
                  <button
                    type="button"
                    onClick={() => setStep('gallery')}
                    disabled={processingCrop}
                    className="px-4 h-10 rounded-xl glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap uppercase disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Voltar
                  </button>

                  {/* Primary Button: Confirmar e Aplicar */}
                  <button
                    type="button"
                    onClick={handleConfirmCrop}
                    disabled={processingCrop}
                    className="px-5 h-10 rounded-xl brand-accent text-white font-bold text-xs uppercase transition-all cursor-pointer border-none shadow-md flex items-center justify-center gap-2 shrink-0 whitespace-nowrap hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
                  >
                    {processingCrop && <Loader2 className="h-4 w-4 animate-spin" />}
                    {processingCrop ? 'Otimizando & Enviando...' : 'Confirmar e Aplicar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions for Gallery Step */}
          {step === 'gallery' && (
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={onClose}
                className="text-[10px] uppercase font-bold glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-4 h-8 cursor-pointer"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </BrandModal>

      {/* Confirmation Modal for Single Delete */}
      <ConfirmModal
        isOpen={!!assetToDelete}
        onClose={() => setAssetToDelete(null)}
        onConfirm={async () => {
          if (assetToDelete) {
            await handleDeleteSingle(assetToDelete.id);
          }
        }}
        title="Excluir Imagem da Biblioteca"
        description={`Deseja mesmo excluir permanentemente a imagem "${assetToDelete?.name || ''}" da galeria?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Confirmation Modal for Bulk Delete */}
      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Exclusão em Massa de Imagens"
        description={`Deseja excluir permanentemente as ${selectedAssetIds.length} imagens selecionadas da sua biblioteca? Esta ação não pode ser desfeita.`}
        confirmText={`Excluir ${selectedAssetIds.length} Imagens`}
        cancelText="Cancelar"
        variant="danger"
      />
    </>
  );
};
