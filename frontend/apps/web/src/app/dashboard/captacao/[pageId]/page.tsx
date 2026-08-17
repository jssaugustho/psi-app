'use client';

import React, { useState, useEffect, useCallback, useMemo, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBrand } from '@/context/BrandContext';
import { api, CapturePage, ContractTemplate } from '@/lib/api';
import { Card, Button, Input, BrandModal, ConfirmModal } from '@psi/ui';
import { MediaLibraryModal } from '@/components/media-library-modal';
import { LogoOptionModal } from '@/components/logo-option-modal';
import { LogoBuilderModal } from '@/components/logo-builder-modal';
import { FontPicker } from '@/components/FontPicker';
import {
  ArrowLeft, Save, Sparkles, AlertCircle, Layout, GitBranch, Settings, Palette,
  Plus, Trash2, ExternalLink, RefreshCw, Eye, HelpCircle, Check, Play, Maximize2, Minimize2,
  Monitor, Smartphone, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Undo, Redo,
  Upload, Image as ImageIcon, Loader2, MapPin, ArrowUp, ArrowDown, GripVertical,
  PanelLeft, PanelLeftClose, Sun, Moon
} from 'lucide-react';
import Link from 'next/link';

// dnd-kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// React Flow Imports
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface PageProps {
  params: Promise<{
    pageId: string;
  }>;
}

// Helper to crop & resize image to target aspect ratio & resolution client-side
function cropAndResizeImage(
  file: File,
  aspectRatio: number,
  targetWidth: number,
  targetHeight: number,
  allowTransparency: boolean = false
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        if (allowTransparency) {
          ctx.clearRect(0, 0, targetWidth, targetHeight);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        const imgWidth = img.width;
        const imgHeight = img.height;
        const imgAspectRatio = imgWidth / imgHeight;

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = imgWidth;
        let sourceHeight = imgHeight;

        if (imgAspectRatio > aspectRatio) {
          sourceWidth = imgHeight * aspectRatio;
          sourceX = (imgWidth - sourceWidth) / 2;
        } else if (imgAspectRatio < aspectRatio) {
          sourceHeight = imgWidth / aspectRatio;
          sourceY = (imgHeight - sourceHeight) / 2;
        }

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          targetWidth,
          targetHeight
        );

        const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        const outputMime = allowTransparency 
          ? (supportsWebP ? 'image/webp' : 'image/png')
          : (supportsWebP ? 'image/webp' : 'image/jpeg');
        const outputExt = allowTransparency 
          ? (supportsWebP ? 'webp' : 'png')
          : (supportsWebP ? 'webp' : 'jpg');

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const baseName = file.name.split('.').slice(0, -1).join('.') || 'image';
            const croppedFile = new File([blob], `${baseName}_cropped.${outputExt}`, {
              type: outputMime,
              lastModified: Date.now(),
            });
            resolve(croppedFile);
          },
          outputMime,
          0.85
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}



// Reusable premium image uploader component with client-side crop modal, gallery, & R2 direct upload
interface ImageUploaderProps {
  id?: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  onFocus?: () => void;
  isFocused?: boolean;
  tenantId: string;
  aspectRatio?: number;
  targetWidth?: number;
  targetHeight?: number;
  allowTransparency?: boolean;
  hideOnMobile?: boolean;
  onToggleHideOnMobile?: (hidden: boolean) => void;
  isLogo?: boolean;
  logoConfig?: {
    mode?: 'html' | 'image';
    text?: string;
    iconType?: 'psi' | 'custom';
    customIconUrl?: string;
  };
  onLogoConfigChange?: (config: {
    mode: 'html';
    text: string;
    iconType: 'psi' | 'custom';
    customIconUrl?: string;
  }) => void;
  defaultLogoText?: string;
  onClearLogoConfig?: () => void;
  gradientStart?: string;
  gradientEnd?: string;
  contrastColor?: string;
  headingFont?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  id,
  label,
  value,
  onChange,
  onFocus,
  isFocused,
  tenantId,
  aspectRatio,
  targetWidth,
  targetHeight,
  allowTransparency = false,
  hideOnMobile,
  onToggleHideOnMobile,
  isLogo = false,
  logoConfig,
  onLogoConfigChange,
  defaultLogoText = '',
  onClearLogoConfig,
  gradientStart,
  gradientEnd,
  contrastColor,
  headingFont,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Library & Logo Modal States
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [builderModalOpen, setBuilderModalOpen] = useState(false);

  // Crop Modal States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedAsset, setSelectedAsset] = useState<{ id: string; name: string } | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imageElementRef = useRef<HTMLImageElement>(null);

  // Target frame size on screen
  const targetAspect = aspectRatio || 1;
  const frameW = 280;
  const frameH = frameW / targetAspect;

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

  let baseW = frameW;
  let baseH = frameH;

  if (imgDimensions) {
    const imgRatio = imgDimensions.width / imgDimensions.height;
    if (imgRatio > targetAspect) {
      baseH = frameH;
      baseW = frameH * imgRatio;
    } else {
      baseW = frameW;
      baseH = frameW / imgRatio;
    }
  }

  const handleSelectFromLibrary = (asset: { url: string; id: string; key: string; name: string }) => {
    setLibraryOpen(false);
    if (aspectRatio && targetWidth && targetHeight) {
      // Crop required -> open crop modal using the selected image URL
      setSelectedAsset({ id: asset.id, name: asset.name });
      setImageSrc(asset.url);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setCropModalOpen(true);
    } else if (targetWidth && targetHeight) {
      // No crop required but resize/optimize is needed (e.g. for Logo)
      setSelectedAsset({ id: asset.id, name: asset.name });
      setImageSrc(asset.url);
      handleAutoOptimize(asset);
    } else {
      // No crop or resize required -> apply directly
      onChange(asset.url);
    }
  };

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

  const handleAutoOptimize = async (asset: { url: string; id: string; key: string; name: string }) => {
    setUploading(true);
    try {
      const optimizedFile = await new Promise<File>((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = asset.url.includes('?') ? `${asset.url}&t=${Date.now()}` : `${asset.url}?t=${Date.now()}`;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          let width = img.width;
          let height = img.height;
          
          if (width > targetWidth! || height > targetHeight!) {
            const ratio = Math.min(targetWidth! / width, targetHeight! / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas context not available'));
          }

          if (allowTransparency) {
            ctx.clearRect(0, 0, width, height);
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
          let outputMime = supportsWebP ? 'image/webp' : 'image/jpeg';
          let outputExt = supportsWebP ? 'webp' : 'jpg';

          if (allowTransparency) {
            outputMime = supportsWebP ? 'image/webp' : 'image/png';
            outputExt = supportsWebP ? 'webp' : 'png';
          }

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Blob generation failed'));
              }
              const baseName = asset.name.split('.').slice(0, -1).join('.') || 'image';
              const fileResult = new File([blob], `${baseName}_optimized.${outputExt}`, {
                type: outputMime,
                lastModified: Date.now(),
              });
              resolve(fileResult);
            },
            outputMime,
            0.85
          );
        };
        img.onerror = () => reject(new Error('Image load failed'));
      });

      const uploadType = allowTransparency ? (id?.includes('favicon') ? 'icon' : 'logo') : 'asset';
      const { url, key } = await api.uploadImage(optimizedFile, uploadType);

      const registered = await api.registerMediaAsset({
        tenantId,
        name: optimizedFile.name,
        key,
        url,
        mimeType: optimizedFile.type,
        fileSize: optimizedFile.size,
        isCropped: true,
        parentId: asset.id,
        usageContext: id || null
      });

      onChange(registered.url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao otimizar imagem.');
    } finally {
      setUploading(false);
      setImageSrc(null);
      setSelectedAsset(null);
    }
  };

  const handleCropAndSave = async () => {
    if (!imageSrc || !selectedAsset || !aspectRatio || !targetWidth || !targetHeight) return;

    setUploading(true);
    setCropModalOpen(false);

    try {
      const croppedFile = await new Promise<File>((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = imageSrc.includes('?') ? `${imageSrc}&t=${Date.now()}` : `${imageSrc}?t=${Date.now()}`;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas context not available'));
          }

          if (allowTransparency) {
            ctx.clearRect(0, 0, targetWidth, targetHeight);
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
          }

          // Calculate base dimensions fitting the crop frame
          const imgRatio = img.width / img.height;
          let baseW = frameW;
          let baseH = frameW / aspectRatio;

          if (imgRatio > aspectRatio) {
            baseH = frameH;
            baseW = frameH * imgRatio;
          } else {
            baseW = frameW;
            baseH = frameW / imgRatio;
          }

          // Screen position coordinates
          const centerX = frameW / 2 + offset.x;
          const centerY = frameH / 2 + offset.y;
          const drawX = centerX - (baseW * zoom) / 2;
          const drawY = centerY - (baseH * zoom) / 2;

          // Scale coordinates to output target dimensions
          const scaleToTarget = targetWidth / frameW;
          const canvasDrawX = drawX * scaleToTarget;
          const canvasDrawY = drawY * scaleToTarget;
          const canvasDrawW = (baseW * zoom) * scaleToTarget;
          const canvasDrawH = (baseH * zoom) * scaleToTarget;

          ctx.drawImage(img, canvasDrawX, canvasDrawY, canvasDrawW, canvasDrawH);

          // Compress to WebP or fallback to PNG/JPEG
          const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
          let outputMime = supportsWebP ? 'image/webp' : 'image/jpeg';
          let outputExt = supportsWebP ? 'webp' : 'jpg';

          if (allowTransparency) {
            outputMime = supportsWebP ? 'image/webp' : 'image/png';
            outputExt = supportsWebP ? 'webp' : 'png';
          }

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Blob generation failed'));
              }
              const baseName = selectedAsset.name.split('.').slice(0, -1).join('.') || 'image';
              const fileResult = new File([blob], `${baseName}_cropped.${outputExt}`, {
                type: outputMime,
                lastModified: Date.now(),
              });
              resolve(fileResult);
            },
            outputMime,
            0.85
          );
        };
        img.onerror = () => reject(new Error('Image load failed'));
      });

      // 1. Upload to Cloudflare R2
      const uploadType = allowTransparency ? (id?.includes('favicon') ? 'icon' : 'logo') : 'asset';
      const { url, key } = await api.uploadImage(croppedFile, uploadType);

      // 2. Register as a cropped asset with context
      const registered = await api.registerMediaAsset({
        tenantId,
        name: croppedFile.name,
        key,
        url,
        mimeType: croppedFile.type,
        fileSize: croppedFile.size,
        isCropped: true,
        parentId: selectedAsset.id,
        usageContext: id || null
      });

      onChange(registered.url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao processar imagem.');
    } finally {
      setUploading(false);
      setImageSrc(null);
      setSelectedAsset(null);
    }
  };

  return (
    <div 
      id={id} 
      className={`space-y-2 border border-[var(--surface-border)] glass-sm p-3 rounded-xl transition-all duration-300 ${
        isFocused ? 'ring-2 ring-blue-500 border-transparent' : ''
      }`}
      onClick={() => onFocus?.()}
    >
      <div className="flex justify-between items-center">
        <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">{label}</label>
        {(value || (isLogo && logoConfig?.mode === 'html')) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              if (onClearLogoConfig) onClearLogoConfig();
            }}
            className="text-[9px] text-red-500 dark:text-red-400 hover:underline font-semibold transition-colors cursor-pointer"
          >
            Remover
          </button>
        )}
      </div>

      <div className="flex gap-3 items-center">
        {isLogo && logoConfig?.mode === 'html' ? (
          <div className="h-16 px-3 glass-sm border border-[var(--surface-border)] rounded-lg shrink-0 flex items-center justify-center gap-2 select-none">
            <div 
              className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-sm"
              style={{
                background: gradientStart && gradientEnd ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` : 'linear-gradient(135deg, var(--brand-gradient-start), #E5A98B)',
                color: contrastColor || '#FFFFFF'
              }}
            >
              {logoConfig.iconType === 'custom' && logoConfig.customIconUrl ? (
                <img src={logoConfig.customIconUrl} alt="Ícone" className="h-4 w-4 object-contain" />
              ) : (
                <span style={{ color: contrastColor || '#FFFFFF' }}>Ψ</span>
              )}
            </div>
            <span 
              className="text-[10px] font-bold text-slate-900 dark:text-white truncate max-w-[100px]"
              style={{ fontFamily: headingFont ? `'${headingFont}', serif` : 'serif' }}
            >
              {logoConfig.text || 'Psicologia'}
            </span>
          </div>
        ) : (
          <div 
            className="relative glass-sm border border-[var(--surface-border)] rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-cover bg-center"
            style={{ 
              width: '64px', 
              height: '64px',
              ...(allowTransparency
                ? {
                    backgroundImage: value
                      ? `url(${value}), repeating-conic-gradient(#a1a1aa 0% 25%, #e4e4e7 0% 50%)`
                      : 'repeating-conic-gradient(#a1a1aa 0% 25%, #e4e4e7 0% 50%)',
                    backgroundSize: value ? `cover, 12px 12px` : '12px 12px',
                    backgroundPosition: 'center, 0 0',
                  }
                : {
                    backgroundImage: value ? `url(${value})` : 'none',
                  })
            }}
          >
            {!value && <ImageIcon className="h-5 w-5 text-slate-400 dark:text-slate-600" />}
          </div>
        )}

        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {isLogo ? (
              logoConfig?.mode === 'html' ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBuilderModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded brand-accent text-white text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border-none"
                  >
                    <Sparkles className="h-3 w-3" />
                    Editar Logotipo
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOptionModalOpen(true);
                    }}
                    className="px-2 py-1 rounded glass-sm border border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-[9px] transition-all cursor-pointer"
                  >
                    Alternar Modo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOptionModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded bg-[var(--brand-gradient-start)]/10 border border-[var(--brand-gradient-start)]/20 text-[var(--brand-gradient-start)] hover:bg-[var(--brand-gradient-start)]/20 disabled:opacity-50 text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {uploading ? 'Processando...' : 'Definir Logotipo'}
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={uploading}
                onClick={(e) => {
                  e.stopPropagation();
                  setLibraryOpen(true);
                }}
                className="px-2.5 py-1.5 rounded bg-[var(--brand-gradient-start)]/10 border border-[var(--brand-gradient-start)]/20 text-[var(--brand-gradient-start)] hover:bg-[var(--brand-gradient-start)]/20 disabled:opacity-50 text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                {uploading ? 'Processando...' : 'Biblioteca de Mídia'}
              </button>
            )}
            <span className="text-[8px] text-slate-500">
              {isLogo && logoConfig?.mode === 'html' ? 'Personalizado' : (targetWidth && targetHeight ? `${targetWidth}x${targetHeight}px` : 'Galeria')}
            </span>
          </div>
        </div>
      </div>
      
      {error && (
        <span className="text-[8px] text-red-400 block font-sans font-medium">{error}</span>
      )}

      {onToggleHideOnMobile && (
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--surface-border)] mt-1">
          <input
            type="checkbox"
            id={`hideMobile-${id || label}`}
            checked={hideOnMobile ?? false}
            onChange={(e) => onToggleHideOnMobile(e.target.checked)}
            className="rounded border-[var(--surface-border)] text-[var(--brand-gradient-start)] focus:ring-[var(--brand-gradient-start)] h-3.5 w-3.5 cursor-pointer"
          />
          <label htmlFor={`hideMobile-${id || label}`} className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold cursor-pointer select-none">
            📱 Ocultar imagem no mobile
          </label>
        </div>
      )}

      {/* Logo Option Popup Modal */}
      {isLogo && (
        <LogoOptionModal
          isOpen={optionModalOpen}
          onClose={() => setOptionModalOpen(false)}
          onSelectOption={(mode) => {
            if (mode === 'html') {
              setBuilderModalOpen(true);
            } else {
              setLibraryOpen(true);
            }
          }}
        />
      )}

      {/* Logo Builder HTML Modal */}
      {isLogo && (
        <LogoBuilderModal
          isOpen={builderModalOpen}
          onClose={() => setBuilderModalOpen(false)}
          tenantId={tenantId}
          initialText={logoConfig?.text || defaultLogoText}
          initialIconType={logoConfig?.iconType || 'psi'}
          initialCustomIconUrl={logoConfig?.customIconUrl || ''}
          gradientStart={gradientStart}
          gradientEnd={gradientEnd}
          contrastColor={contrastColor}
          headingFont={headingFont}
          onSave={(cfg) => {
            if (onLogoConfigChange) {
              onLogoConfigChange(cfg);
            }
          }}
        />
      )}

      {/* Media Library Selector Modal */}
      <MediaLibraryModal
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        tenantId={tenantId}
        onSelectImage={handleSelectFromLibrary}
        uploadType={allowTransparency ? (id?.includes('favicon') ? 'icon' : 'logo') : 'asset'}
      />

      {/* Visual Crop Modal */}
      <BrandModal
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          setImageSrc(null);
          setSelectedAsset(null);
        }}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ajustar e Recortar Imagem</h3>
            <p className="text-[10px] text-slate-400">Arraste a foto e ajuste o zoom para enquadrar na área destacada.</p>
          </div>

          {/* Workspace */}
          <div 
            className="relative border border-[var(--surface-border)] rounded-xl flex items-center justify-center overflow-hidden cursor-move select-none"
            style={{
              width: '100%',
              height: '360px',
              // Checkerboard for transparent images; solid bg for opaque ones
              background: allowTransparency
                ? 'repeating-conic-gradient(#3f3f46 0% 25%, #27272a 0% 50%)'
                : '#09090B',
              backgroundSize: allowTransparency ? '20px 20px' : undefined,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Cutout Highlight Target Area */}
            {aspectRatio && (
              <div 
                className="absolute z-20 pointer-events-none rounded-lg border border-dashed border-[var(--brand-gradient-start)]"
                style={{
                  width: `${frameW}px`,
                  height: `${frameH}px`,
                  boxShadow: '0 0 0 9999px rgba(9, 9, 11, 0.75)'
                }}
              />
            )}

            {/* Draggable Panned and Zoomed Image */}
            {imageSrc && (
              <img
                ref={imageElementRef}
                src={imageSrc}
                alt="Crop Workspace"
                className="max-w-none origin-center pointer-events-none transition-transform duration-75"
                style={{
                  width: `${baseW}px`,
                  height: `${baseH}px`,
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                }}
              />
            )}
          </div>

          {/* Zoom Slider Control */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-medium">
              <span>Zoom</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-300 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[var(--brand-gradient-start)]"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              onClick={() => {
                setCropModalOpen(false);
                setImageSrc(null);
                setSelectedAsset(null);
              }}
              className="text-[10px] uppercase font-bold glass-sm border border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer px-4 h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCropAndSave}
              className="text-[10px] uppercase font-bold brand-accent cursor-pointer px-4 h-8"
            >
              Recortar e Salvar
            </Button>
          </div>
        </div>
      </BrandModal>
    </div>
  );
};

// React Flow Custom Node Components
const CustomStartNode = ({ data }: any) => (
  <div className="w-56 glass-md border border-emerald-500/30 rounded-xl p-3 shadow-lg relative">
    <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-1.5 mb-1.5">
      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        Início
      </span>
      <Play className="h-3.5 w-3.5 text-emerald-500" />
    </div>
    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{data.title}</div>
    <Handle
      type="source"
      position={Position.Right}
      id="source"
      className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-[var(--brand-bg-color)]"
    />
  </div>
);

const CustomInputNode = ({ data }: any) => {
  const isSelected = data.isSelected;
  const isEmergency = data.node.type === 'emergencia';
  const isCpf = data.node.type === 'cpf';
  const isNome = data.node.type === 'nome';
  const isCelular = data.node.type === 'celular';
  
  return (
    <div 
      className={`w-64 glass-md border rounded-xl p-3 shadow-lg relative transition-all ${
        isSelected ? 'border-[var(--brand-gradient-start)] ring-1 ring-[var(--brand-gradient-start)]' : 'border-[var(--surface-border)]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!bg-[var(--brand-gradient-start)] !w-3 !h-3 !border-2 !border-[var(--brand-bg-color)]"
      />
      <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-1.5 mb-1.5">
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
          Etapa: {data.node.type}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onDelete(data.node.id); }}
          className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
          title="Excluir Etapa"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate mb-1">{data.node.data.title}</div>
      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
        {isEmergency ? 'Contato emergencial' : isCpf ? 'Cadastro CPF' : isNome ? 'Nome Completo' : isCelular ? 'WhatsApp com país' : 'Campo de texto'}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="!bg-[var(--brand-gradient-start)] !w-3 !h-3 !border-2 !border-[var(--brand-bg-color)]"
      />
    </div>
  );
};

const CustomContractNode = ({ data }: any) => {
  const isSelected = data.isSelected;
  return (
    <div 
      className={`w-64 glass-md border rounded-xl p-3 shadow-lg relative transition-all ${
        isSelected ? 'border-[var(--brand-gradient-start)] ring-1 ring-[var(--brand-gradient-start)]' : 'border-[var(--surface-border)]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!bg-[var(--brand-gradient-start)] !w-3 !h-3 !border-2 !border-[var(--brand-bg-color)]"
      />
      <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-1.5 mb-1.5">
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400">
          Contrato Aceite
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onDelete(data.node.id); }}
          className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate mb-1">{data.node.data.title}</div>
      <div className="text-[9px] text-violet-600 dark:text-violet-400 font-medium truncate">
        Modelo: {data.contractTitle || <span className="italic">Nenhum associado</span>}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="!bg-[var(--brand-gradient-start)] !w-3 !h-3 !border-2 !border-[var(--brand-bg-color)]"
      />
    </div>
  );
};

const CustomSelectorNode = ({ data }: any) => {
  const isSelected = data.isSelected;
  const options = data.node.data.options || [];

  return (
    <div 
      className={`w-64 glass-md border rounded-xl p-3 shadow-lg relative transition-all ${
        isSelected ? 'border-[var(--brand-gradient-start)] ring-1 ring-[var(--brand-gradient-start)]' : 'border-[var(--surface-border)]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!bg-[var(--brand-gradient-start)] !w-3 !h-3 !border-2 !border-[var(--brand-bg-color)]"
      />
      <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-1.5 mb-1.5">
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
          Seletor Condicional
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onDelete(data.node.id); }}
          className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate mb-2">{data.node.data.title}</div>
      
      <div className="space-y-1.5">
        {options.map((opt: any, idx: number) => (
          <div key={idx} className="relative flex items-center justify-between text-[10px] glass-sm border border-[var(--surface-border)] p-1.5 rounded text-slate-700 dark:text-slate-300">
            <span className="truncate pr-4">{opt.label}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={`option-${idx}`}
              className="!bg-[var(--brand-gradient-start)] !w-2.5 !h-2.5 !border-2 !border-[var(--brand-bg-color)]"
              style={{ top: '50%', transform: 'translateY(-50%)', right: '-6px' }}
            />
          </div>
        ))}
        {options.length === 0 && (
          <div className="text-[9px] italic text-slate-500 text-center py-1">Sem opções cadastradas</div>
        )}
      </div>
    </div>
  );
};

const safeJsonStringify = (obj: any): string => {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(safeJsonStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => `${JSON.stringify(key)}:${safeJsonStringify(obj[key])}`);
  return '{' + pairs.join(',') + '}';
};

interface SortableSectionItemProps {
  section: any;
  index: number;
  openSection: string | null;
  setOpenSection: (id: string | null) => void;
  toggleSectionActive: (id: string) => void;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
  updateLayoutSectionField: (id: string, field: string, value: any) => void;
  getSectionNameByType: (type: string) => string;
  renderSectionEditorContent: (section: any) => React.ReactNode;
  page: any;
}

const SortableSectionItem = ({
  section,
  index,
  openSection,
  setOpenSection,
  toggleSectionActive,
  focusedField,
  setFocusedField,
  updateLayoutSectionField,
  getSectionNameByType,
  renderSectionEditorContent,
  page
}: SortableSectionItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.6 : 1,
  };

  const name = section.name || getSectionNameByType(section.type);
  const isOpen = openSection === section.id;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`border rounded-xl glass-sm overflow-hidden relative transition-all duration-200 ${
        isDragging ? 'shadow-2xl border-[var(--brand-gradient-start)] glass-md z-50' :
        isOpen ? 'border-[var(--brand-gradient-start)]/20 glass-sm' : 'border-[var(--surface-border)]'
      }`}
    >
      <div className="w-full glass-sm flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors">
        <div className="flex items-center flex-1 min-w-0">
          {/* Drag Handle button */}
          <button
            type="button"
            className="p-3 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-grab active:cursor-grabbing bg-transparent border-none transition-colors shrink-0"
            title="Arrastar para Reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setOpenSection(isOpen ? null : section.id)}
            className="flex-1 py-3 text-left text-xs font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer truncate"
          >
            <span className={`transition-colors ${isOpen ? 'text-[var(--brand-gradient-start)] font-extrabold' : 'text-slate-900 dark:text-white'}`}>
              {index + 2}. {name}
            </span>
          </button>
        </div>
        
        {/* Deleting button */}
        <div className="flex items-center gap-1.5 px-3">
          <button
            type="button"
            onClick={() => toggleSectionActive(section.id)}
            className="p-1 text-slate-500 hover:text-red-500 dark:hover:text-red-400 cursor-pointer bg-transparent border-none transition-colors pl-2"
            title="Remover Seção"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform mr-1 shrink-0 ${isOpen ? 'rotate-180 text-[var(--brand-gradient-start)]' : ''}`} />
        </div>
      </div>

      {openSection === section.id && (
        <div className="p-4 space-y-4 border-t border-[var(--surface-border)] animate-in fade-in duration-200">
          {/* Identificação e Navegação da Seção */}
          <div className="glass-sm p-3 rounded-xl border border-[var(--surface-border)] space-y-3 mb-2 text-left">
            <span className="text-[10px] text-[var(--brand-gradient-start)] font-bold uppercase tracking-wider block">Identificação & Navegação</span>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-600 dark:text-slate-400 font-semibold uppercase">Nome no Menu</label>
                <Input
                  type="text"
                  id={`${section.id}.name`}
                  className={`brand-input text-xs ${focusedField === `${section.id}.name` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                  value={section.name || ''}
                  placeholder={getSectionNameByType(section.type)}
                  onChange={(e) => updateLayoutSectionField(section.id, 'name', e.target.value)}
                  onFocus={() => setFocusedField(`${section.id}.name`)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-600 dark:text-slate-400 font-semibold uppercase">Link Anchor (Slug)</label>
                <Input
                  type="text"
                  id={`${section.id}.slug`}
                  className={`brand-input text-xs ${focusedField === `${section.id}.slug` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                  value={section.slug || ''}
                  placeholder={section.id}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '');
                    updateLayoutSectionField(section.id, 'slug', val);
                  }}
                  onFocus={() => setFocusedField(`${section.id}.slug`)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`showInNavbar-${section.id}`}
                  checked={section.showInNavbar ?? true}
                  onChange={(e) => updateLayoutSectionField(section.id, 'showInNavbar', e.target.checked)}
                  className="rounded border-[var(--surface-border)] text-[var(--brand-gradient-start)] focus:ring-[var(--brand-gradient-start)] h-3.5 w-3.5 cursor-pointer"
                />
                <label htmlFor={`showInNavbar-${section.id}`} className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold uppercase cursor-pointer select-none">
                  Exibir no menu
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`hideOnMobile-${section.id}`}
                  checked={section.hideOnMobile ?? false}
                  onChange={(e) => updateLayoutSectionField(section.id, 'hideOnMobile', e.target.checked)}
                  className="rounded border-[var(--surface-border)] text-[var(--brand-gradient-start)] focus:ring-[var(--brand-gradient-start)] h-3.5 w-3.5 cursor-pointer"
                />
                <label htmlFor={`hideOnMobile-${section.id}`} className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold uppercase cursor-pointer select-none">
                  📱 Ocultar seção no mobile
                </label>
              </div>
            </div>
          </div>

          {renderSectionEditorContent(section)}
        </div>
      )}
    </div>
  );
};

export default function PageEditor({ params }: PageProps) {
  const { pageId } = use(params);
  const { tenant, theme, toggleTheme } = useBrand();
  const router = useRouter();

  const [page, setPage] = useState<CapturePage | null>(null);
  const [lastPublishedPage, setLastPublishedPage] = useState<CapturePage | null>(null);
  const [contracts, setContracts] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Navigation Tabs: 'layout' | 'flow' | 'settings' | 'theme'
  const [activeTab, setActiveTab] = useState<'layout' | 'flow' | 'settings' | 'theme'>('layout');

  // React Flow internal states
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Live preview refresh counter
  const [previewKey, setPreviewKey] = useState(0);

  // Live preview mode state ('desktop' | 'mobile')
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Cloudflare Custom Hostname Verification States
  const [cfDnsRecords, setCfDnsRecords] = useState<Array<{ type: string; name: string; value: string; description: string }>>([]);
  const [cfStatus, setCfStatus] = useState<string | null>(null);
  const [cfVerifying, setCfVerifying] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteCurrentPage = async () => {
    if (!page) return;
    setDeleting(true);
    try {
      await api.deleteCapturePage(page.id);
      router.push('/dashboard/captacao');
    } catch (err: any) {
      alert('Erro ao excluir página: ' + (err.message || 'Ocorreu um erro.'));
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  // Accordion section state for texts sidebar
  const [openSection, setOpenSection] = useState<string | null>('hero');

  // State for adding section modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Default sections configuration
  const defaultSections = useMemo(() => [
    { id: 'diagnostic', type: 'diagnostic', isActive: true, name: 'Especialidades' },
    { id: 'about', type: 'about', isActive: true, name: 'Sobre Mim' },
    { id: 'process', type: 'process', isActive: true, name: 'Como Funciona' },
    { id: 'space', type: 'space', isActive: true, name: 'Consultório & Espaço' },
    { id: 'faq', type: 'faq', isActive: true, name: 'Perguntas Frequentes (FAQ)' }
  ], []);

  const getSectionNameByType = (type: string) => {
    switch (type) {
      case 'diagnostic': return 'Especialidades';
      case 'about': return 'Sobre Mim';
      case 'process': return 'Como Funciona';
      case 'space': return 'Consultório & Espaço';
      case 'faq': return 'Perguntas Frequentes (FAQ)';
      case 'grid': return 'Grade de Cards / Serviços';
      case 'two-columns': return 'Duas Colunas de Texto';
      case 'text-image': return 'Texto e Imagem Lateral';
      case 'cta-banner': return 'Chamada para Ação (CTA Banner)';
      case 'cta-split': return 'CTA Dividido com Foto';
      case 'quote': return 'Frase / Citação';
      case 'text-block': return 'Bloco de Texto Simples (Legacy)';
      default: return 'Nova Seção';
    }
  };

  // Active sections memo
  const activeSections = useMemo(() => {
    if (!page) return [];
    return (page.siteConfig.sections || defaultSections).filter((s: any) => s.isActive);
  }, [page, defaultSections]);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag-and-drop reordering handler
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (!page) return;

    const sections = [...(page.siteConfig.sections || defaultSections)];
    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newSections = arrayMove(sections, oldIndex, newIndex);
      setPage({
        ...page,
        siteConfig: {
          ...page.siteConfig,
          sections: newSections
        }
      });
      setHasUnsavedChanges(true);
    }
  }, [page, defaultSections]);

  // Toggling section active state
  const toggleSectionActive = useCallback((id: string) => {
    if (!page) return;
    const currentSections = (page.siteConfig.sections || defaultSections).map((sec: any) => {
      if (sec.id === id) {
        return { ...sec, isActive: !sec.isActive };
      }
      return sec;
    });

    setPage({
      ...page,
      siteConfig: {
        ...page.siteConfig,
        sections: currentSections
      }
    });
    setHasUnsavedChanges(true);
  }, [page, defaultSections]);

  // Adding/enabling section
  const addSection = useCallback((type: string) => {
    if (!page) return;
    const currentSections = [...(page.siteConfig.sections || defaultSections)];

    const isSemantic = ['diagnostic', 'about', 'process', 'space', 'faq'].includes(type);
    
    if (isSemantic) {
      const existingIndex = currentSections.findIndex((s: any) => s.type === type);
      if (existingIndex > -1) {
        currentSections[existingIndex].isActive = true;
      } else {
        currentSections.push({
          id: type,
          type: type,
          isActive: true,
          name: getSectionNameByType(type)
        });
      }
    } else {
      // Dynamic layout template - ALWAYS append a new one with a unique timestamp ID
      const newSecId = `${type}-${Date.now()}`;
      let newSectionProps: any = {
        id: newSecId,
        type: type,
        isActive: true,
        name: getSectionNameByType(type)
      };

      if (type === 'grid') {
        newSectionProps = {
          ...newSectionProps,
          badge: 'Diferenciais',
          title: 'Como posso te ajudar',
          description: 'Desenvolvemos um acompanhamento clínico focado na sua regulação emocional e autoconhecimento.',
          items: [
            { title: 'Acolhimento', description: 'Um ambiente seguro e ético para você expressar suas emoções sem julgamentos.', number: '01' },
            { title: 'Praticidade', description: 'Sessões online no conforto da sua casa ou presenciais em ótima localização.', number: '02' },
            { title: 'Evolução', description: 'Uso de estratégias e ferramentas práticas para lidar com seus desafios diários.', number: '03' }
          ],
          settings: {
            columns: 3,
            markerType: 'number',
            cardStyle: 'glass',
            itemAlignment: 'left'
          }
        };
      } else if (type === 'two-columns') {
        newSectionProps = {
          ...newSectionProps,
          badge: 'Abordagem',
          title: 'Entenda nossa metodologia de trabalho',
          leftTitle: 'Foco no Autoconhecimento',
          leftText: 'Ajudamos você a compreender a origem das suas angústias e padrões de comportamento recorrentes.',
          rightTitle: 'Ações Práticas',
          rightText: 'Desenvolvemos em conjunto estratégias viáveis para lidar com os desafios do cotidiano.',
          settings: {
            cardStyle: 'glass',
            itemAlignment: 'left'
          }
        };
      } else if (type === 'text-image') {
        newSectionProps = {
          ...newSectionProps,
          badge: 'Sobre mim',
          title: 'Minha trajetória profissional',
          description: 'Acredito que a terapia é um espaço de descoberta e acolhimento. Ao longo da minha jornada, tenho auxiliado pessoas a conquistarem mais leveza e equilíbrio em suas vidas diárias.',
          image: '',
          imagePosition: 'right',
          ctaText: 'Conhecer Abordagem',
          settings: {
            columnOrder: 'text-first',
            imageAspectRatio: 'portrait'
          }
        };
      } else if (type === 'cta-banner') {
        newSectionProps = {
          ...newSectionProps,
          badge: 'Ação',
          title: 'Pronta para iniciar o seu processo de mudança?',
          description: 'Agende uma conversa inicial para avaliarmos suas necessidades e alinhar a melhor direção para o seu tratamento.',
          ctaText: 'Quero Começar Agora',
          ctaSubtext: 'Atendimento 100% sigiloso e ético',
          settings: {
            bgStyle: 'gradient',
            alignment: 'center',
            showSecondaryCta: false
          }
        };
      } else if (type === 'cta-split') {
        newSectionProps = {
          ...newSectionProps,
          badge: 'Triagem',
          title: 'Vamos caminhar juntos?',
          description: 'Se você tem dúvidas sobre como funciona a psicoterapia ou quer alinhar seus objetivos, inicie sua triagem virtual agora.',
          image: '',
          ctaText: 'Fazer Minha Triagem',
          ctaSecondaryText: 'Falar no WhatsApp',
          settings: {
            imagePosition: 'right',
            imageAspectRatio: 'portrait',
            cardStyle: 'glass'
          }
        };
      } else if (type === 'quote') {
        newSectionProps = {
          ...newSectionProps,
          title: 'Conheça todas as teorias, domine todas as técnicas, mas ao tocar uma alma humana, seja apenas outra alma humana.',
          author: 'Carl Jung',
          settings: {
            style: 'elegant',
            alignment: 'center'
          }
        };
      }

      currentSections.push(newSectionProps);
    }

    setPage({
      ...page,
      siteConfig: {
        ...page.siteConfig,
        sections: currentSections
      }
    });
    setHasUnsavedChanges(true);
    setIsAddModalOpen(false);
  }, [page, defaultSections]);

  const renderSectionEditorContent = (section: any) => {
    if (!page) return null;
    const { type } = section;
    switch (type) {
      case 'diagnostic':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Etiqueta Seção (Badge)</label>
              <Input
                type="text"
                id="diagnostic.badge"
                className={`brand-input text-xs ${focusedField === 'diagnostic.badge' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.dictionary.diagnostic?.badge || ''}
                onChange={(e) => updateDictField('diagnostic', 'badge', e.target.value)}
                onFocus={() => setFocusedField('diagnostic.badge')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Título Principal</label>
              <Input
                type="text"
                id="diagnostic.title"
                className={`brand-input text-xs ${focusedField === 'diagnostic.title' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.dictionary.diagnostic?.title || ''}
                onChange={(e) => updateDictField('diagnostic', 'title', e.target.value)}
                onFocus={() => setFocusedField('diagnostic.title')}
              />
              <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*terapia*</code>
              </p>
            </div>
            <div className="space-y-1 pb-3 border-b border-[var(--surface-border)]">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição / Subtítulo</label>
              <textarea
                rows={2}
                id="diagnostic.description"
                className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'diagnostic.description' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                value={page.dictionary.diagnostic?.description || ''}
                onChange={(e) => updateDictField('diagnostic', 'description', e.target.value)}
                onFocus={() => setFocusedField('diagnostic.description')}
              />
            </div>

            {/* Card 1 */}
            <div className="border-l-2 border-[var(--brand-gradient-start)] pl-3 py-1 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Card 1: Título</label>
                <Input
                  type="text"
                  id="diagnostic.card1Title"
                  className={`brand-input text-xs ${focusedField === 'diagnostic.card1Title' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                  value={page.dictionary.diagnostic?.card1Title || ''}
                  onChange={(e) => updateDictField('diagnostic', 'card1Title', e.target.value)}
                  onFocus={() => setFocusedField('diagnostic.card1Title')}
                />
                <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                  💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*ansiedade*</code>
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Card 1: Descrição</label>
                <textarea
                  rows={2}
                  id="diagnostic.card1Desc"
                  className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'diagnostic.card1Desc' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                  value={page.dictionary.diagnostic?.card1Desc || ''}
                  onChange={(e) => updateDictField('diagnostic', 'card1Desc', e.target.value)}
                  onFocus={() => setFocusedField('diagnostic.card1Desc')}
                />
                <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                  💡 <strong>Negrito:</strong> Envolva o texto com dois asteriscos. Ex: <code className="text-slate-900 dark:text-white bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">**texto**</code>
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="border-l-2 border-[var(--brand-gradient-start)] pl-3 py-1 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Card 2: Título</label>
                <Input
                  type="text"
                  id="diagnostic.card2Title"
                  className={`brand-input text-xs ${focusedField === 'diagnostic.card2Title' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                  value={page.dictionary.diagnostic?.card2Title || ''}
                  onChange={(e) => updateDictField('diagnostic', 'card2Title', e.target.value)}
                  onFocus={() => setFocusedField('diagnostic.card2Title')}
                />
                <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                  💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*relações*</code>
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Card 2: Descrição</label>
                <textarea
                  rows={2}
                  id="diagnostic.card2Desc"
                  className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'diagnostic.card2Desc' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                  value={page.dictionary.diagnostic?.card2Desc || ''}
                  onChange={(e) => updateDictField('diagnostic', 'card2Desc', e.target.value)}
                  onFocus={() => setFocusedField('diagnostic.card2Desc')}
                />
                <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                  💡 <strong>Negrito:</strong> Envolva o texto com dois asteriscos. Ex: <code className="text-slate-900 dark:text-white bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">**texto**</code>
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="border-l-2 border-[var(--brand-gradient-start)] pl-3 py-1 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Card 3: Título</label>
                <Input
                  type="text"
                  id="diagnostic.card3Title"
                  className={`brand-input text-xs ${focusedField === 'diagnostic.card3Title' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                  value={page.dictionary.diagnostic?.card3Title || ''}
                  onChange={(e) => updateDictField('diagnostic', 'card3Title', e.target.value)}
                  onFocus={() => setFocusedField('diagnostic.card3Title')}
                />
                <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                  💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*pessoal*</code>
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Card 3: Descrição</label>
                <textarea
                  rows={2}
                  id="diagnostic.card3Desc"
                  className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'diagnostic.card3Desc' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                  value={page.dictionary.diagnostic?.card3Desc || ''}
                  onChange={(e) => updateDictField('diagnostic', 'card3Desc', e.target.value)}
                  onFocus={() => setFocusedField('diagnostic.card3Desc')}
                />
                <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                  💡 <strong>Negrito:</strong> Envolva o texto com dois asteriscos. Ex: <code className="text-slate-900 dark:text-white bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">**texto**</code>
                </p>
              </div>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-4">
            <ImageUploader
              id="siteConfig.images.portrait"
              label="Foto Retrato Psicóloga"
              value={page.siteConfig.images?.portrait || ''}
              onChange={(url) => {
                const updated = { ...page.siteConfig, images: { ...page.siteConfig.images, portrait: url } };
                setPage({ ...page, siteConfig: updated });
                setHasUnsavedChanges(true);
              }}
              onFocus={() => setFocusedField('siteConfig.images.portrait')}
              isFocused={focusedField === 'siteConfig.images.portrait'}
              tenantId={page.tenantId}
              aspectRatio={3 / 4}
              targetWidth={600}
              targetHeight={800}
              hideOnMobile={page.siteConfig.images?.hidePortraitOnMobile ?? false}
              onToggleHideOnMobile={(hidden) => {
                const updated = { ...page.siteConfig, images: { ...page.siteConfig.images, hidePortraitOnMobile: hidden } };
                setPage({ ...page, siteConfig: updated });
                setHasUnsavedChanges(true);
              }}
            />
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etiqueta (Badge)</label>
              <Input
                type="text"
                id="about.badge"
                className={`brand-input text-xs ${focusedField === 'about.badge' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.dictionary.about?.badge || ''}
                onChange={(e) => updateDictField('about', 'badge', e.target.value)}
                onFocus={() => setFocusedField('about.badge')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título de Apresentação</label>
              <Input
                type="text"
                id="about.title"
                className={`brand-input text-xs ${focusedField === 'about.title' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.dictionary.about?.title || ''}
                onChange={(e) => updateDictField('about', 'title', e.target.value)}
                onFocus={() => setFocusedField('about.title')}
              />
              <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*terapeuta*</code>
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição Parágrafo 1</label>
              <textarea
                rows={3}
                id="about.description1"
                className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'about.description1' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                value={page.dictionary.about?.description1 || ''}
                onChange={(e) => updateDictField('about', 'description1', e.target.value)}
                onFocus={() => setFocusedField('about.description1')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição Parágrafo 2</label>
              <textarea
                rows={3}
                id="about.description2"
                className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'about.description2' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                value={page.dictionary.about?.description2 || ''}
                onChange={(e) => updateDictField('about', 'description2', e.target.value)}
                onFocus={() => setFocusedField('about.description2')}
              />
            </div>

            {/* Highlights List */}
            <div className="space-y-2.5 border-t border-[var(--surface-border)] pt-3">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider block">Pontos de Destaque</label>
              {(page.dictionary.about?.points || []).map((pt: string, ptIdx: number) => (
                <div key={ptIdx} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    id={`about.points.${ptIdx}`}
                    className={`brand-input text-xs ${focusedField === `about.points.${ptIdx}` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                    value={pt}
                    onChange={(e) => {
                      const newPts = [...(page.dictionary.about?.points || [])];
                      newPts[ptIdx] = e.target.value;
                      setPage({
                        ...page,
                        dictionary: {
                          ...page.dictionary,
                          about: { ...page.dictionary.about, points: newPts }
                        }
                      });
                    }}
                    onFocus={() => setFocusedField(`about.points.${ptIdx}`)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newPts = (page.dictionary.about?.points || []).filter((_: any, idx: number) => idx !== ptIdx);
                      setPage({
                        ...page,
                        dictionary: {
                          ...page.dictionary,
                          about: { ...page.dictionary.about, points: newPts }
                        }
                      });
                    }}
                    className="text-slate-400 hover:text-red-400 cursor-pointer bg-transparent border-none"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => {
                  const newPts = [...(page.dictionary.about?.points || []), 'Novo ponto de destaque'];
                  setPage({
                    ...page,
                    dictionary: {
                      ...page.dictionary,
                      about: { ...page.dictionary.about, points: newPts }
                    }
                  });
                }}
                className="w-full text-[10px] glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] cursor-pointer text-slate-800 dark:text-white font-semibold"
              >
                + Adicionar Destaque
              </Button>
            </div>

            <div className="space-y-1 border-t border-[var(--surface-border)] pt-3">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Texto Botão (CTA)</label>
              <Input
                type="text"
                id="about.cta"
                className={`brand-input text-xs ${focusedField === 'about.cta' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.dictionary.about?.cta || ''}
                onChange={(e) => updateDictField('about', 'cta', e.target.value)}
                onFocus={() => setFocusedField('about.cta')}
              />
            </div>
          </div>
        );
      case 'process':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etiqueta (Badge)</label>
              <Input
                type="text"
                id="process.badge"
                className={`brand-input text-xs ${focusedField === 'process.badge' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.dictionary.process?.badge || ''}
                onChange={(e) => updateDictField('process', 'badge', e.target.value)}
                onFocus={() => setFocusedField('process.badge')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título Principal</label>
              <Input
                type="text"
                id="process.title"
                className={`brand-input text-xs ${focusedField === 'process.title' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.dictionary.process?.title || ''}
                onChange={(e) => updateDictField('process', 'title', e.target.value)}
                onFocus={() => setFocusedField('process.title')}
              />
              <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*jornada*</code>
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição de Introdução</label>
              <textarea
                rows={2}
                id="process.description"
                className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'process.description' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                value={page.dictionary.process?.description || ''}
                onChange={(e) => updateDictField('process', 'description', e.target.value)}
                onFocus={() => setFocusedField('process.description')}
              />
              <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                💡 <strong>Negrito:</strong> Envolva o texto com dois asteriscos. Ex: <code className="text-slate-900 dark:text-white bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">**texto**</code>
              </p>
            </div>

            {/* Step 1 */}
            <div className="border-l-2 border-emerald-500 pl-3 py-1 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etapa 1: Título</label>
                <Input
                  type="text"
                  id="process.step1.title"
                  className={`brand-input text-xs ${focusedField === 'process.step1.title' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                  value={page.dictionary.process?.step1?.title || ''}
                  onChange={(e) => updateProcessStepField('step1', 'title', e.target.value)}
                  onFocus={() => setFocusedField('process.step1.title')}
                />
                <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                  💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*Triagem*</code>
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etapa 1: Descrição</label>
                <textarea
                  rows={2}
                  id="process.step1.description"
                  className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'process.step1.description' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                  value={page.dictionary.process?.step1?.description || ''}
                  onChange={(e) => updateProcessStepField('step1', 'description', e.target.value)}
                  onFocus={() => setFocusedField('process.step1.description')}
                />
                <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                  💡 <strong>Negrito:</strong> Envolva o texto com dois asteriscos. Ex: <code className="text-slate-900 dark:text-white bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">**texto**</code>
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etapa 1: Link/Texto CTA</label>
                <Input
                  type="text"
                  id="process.step1.cta"
                  className={`brand-input text-xs ${focusedField === 'process.step1.cta' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                  value={page.dictionary.process?.step1?.cta || ''}
                  onChange={(e) => updateProcessStepField('step1', 'cta', e.target.value)}
                  onFocus={() => setFocusedField('process.step1.cta')}
                />
              </div>
            </div>

            {/* Step 2 */}
            <div className="border-l-2 border-emerald-500 pl-3 py-1 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etapa 2: Título</label>
                <Input
                  type="text"
                  id="process.step2.title"
                  className={`brand-input text-xs ${focusedField === 'process.step2.title' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                  value={page.dictionary.process?.step2?.title || ''}
                  onChange={(e) => updateProcessStepField('step2', 'title', e.target.value)}
                  onFocus={() => setFocusedField('process.step2.title')}
                />
                <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                  💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*Agendamento*</code>
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etapa 2: Descrição</label>
                <textarea
                  rows={2}
                  id="process.step2.description"
                  className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'process.step2.description' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                  value={page.dictionary.process?.step2?.description || ''}
                  onChange={(e) => updateProcessStepField('step2', 'description', e.target.value)}
                  onFocus={() => setFocusedField('process.step2.description')}
                />
                <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                  💡 <strong>Negrito:</strong> Envolva o texto com dois asteriscos. Ex: <code className="text-slate-900 dark:text-white bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">**texto**</code>
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border-l-2 border-emerald-500 pl-3 py-1 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etapa 3: Título</label>
                <Input
                  type="text"
                  id="process.step3.title"
                  className={`brand-input text-xs ${focusedField === 'process.step3.title' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                  value={page.dictionary.process?.step3?.title || ''}
                  onChange={(e) => updateProcessStepField('step3', 'title', e.target.value)}
                  onFocus={() => setFocusedField('process.step3.title')}
                />
                <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                  💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*Sessão*</code>
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etapa 3: Descrição</label>
                <textarea
                  rows={2}
                  id="process.step3.description"
                  className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'process.step3.description' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                  value={page.dictionary.process?.step3?.description || ''}
                  onChange={(e) => updateProcessStepField('step3', 'description', e.target.value)}
                  onFocus={() => setFocusedField('process.step3.description')}
                />
                <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                  💡 <strong>Negrito:</strong> Envolva o texto com dois asteriscos. Ex: <code className="text-slate-900 dark:text-white bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">**texto**</code>
                </p>
              </div>
            </div>
          </div>
        );
      case 'space':
        return (
          <div className="space-y-4">
            <ImageUploader
              id="siteConfig.images.officeSpace"
              label="Foto do Consultório/Espaço"
              value={page.siteConfig.images?.officeSpace || ''}
              onChange={(url) => {
                const updated = { ...page.siteConfig, images: { ...page.siteConfig.images, officeSpace: url } };
                setPage({ ...page, siteConfig: updated });
                setHasUnsavedChanges(true);
              }}
              onFocus={() => setFocusedField('siteConfig.images.officeSpace')}
              isFocused={focusedField === 'siteConfig.images.officeSpace'}
              tenantId={page.tenantId}
              aspectRatio={16 / 9}
              targetWidth={960}
              targetHeight={540}
              hideOnMobile={page.siteConfig.images?.hideOfficeSpaceOnMobile ?? false}
              onToggleHideOnMobile={(hidden) => {
                const updated = { ...page.siteConfig, images: { ...page.siteConfig.images, hideOfficeSpaceOnMobile: hidden } };
                setPage({ ...page, siteConfig: updated });
                setHasUnsavedChanges(true);
              }}
            />
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">CRP da Psicóloga</label>
              <Input
                type="text"
                id="professional.crp"
                className={`brand-input text-xs ${focusedField === 'professional.crp' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.siteConfig.professional?.crp || ''}
                onChange={(e) => {
                  const updated = { ...page.siteConfig, professional: { ...page.siteConfig.professional, crp: e.target.value } };
                  setPage({ ...page, siteConfig: updated });
                }}
                onFocus={() => setFocusedField('professional.crp')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Abordagem Clínica / Especialidade</label>
              <Input
                type="text"
                id="professional.approach"
                className={`brand-input text-xs ${focusedField === 'professional.approach' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.siteConfig.professional?.approach || ''}
                onChange={(e) => {
                  const updated = { ...page.siteConfig, professional: { ...page.siteConfig.professional, approach: e.target.value } };
                  setPage({ ...page, siteConfig: updated });
                }}
                onFocus={() => setFocusedField('professional.approach')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Endereço Físico Completo</label>
              <Input
                type="text"
                id="professional.address"
                className={`brand-input text-xs ${focusedField === 'professional.address' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.siteConfig.professional?.address || ''}
                onChange={(e) => {
                  const updated = { ...page.siteConfig, professional: { ...page.siteConfig.professional, address: e.target.value } };
                  setPage({ ...page, siteConfig: updated });
                }}
                onFocus={() => setFocusedField('professional.address')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Google Maps Embed URL</label>
              <Input
                type="text"
                id="siteConfig.professional.mapsIframeUrl"
                className={`brand-input text-xs ${focusedField === 'siteConfig.professional.mapsIframeUrl' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.siteConfig.professional?.mapsIframeUrl || ''}
                onChange={(e) => {
                  const updated = { ...page.siteConfig, professional: { ...page.siteConfig.professional, mapsIframeUrl: e.target.value } };
                  setPage({ ...page, siteConfig: updated });
                }}
                onFocus={() => setFocusedField('siteConfig.professional.mapsIframeUrl')}
              />
            </div>

            <div className="space-y-1 border-t border-[var(--surface-border)] pt-3">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etiqueta Seção (Badge)</label>
              <Input
                type="text"
                id="space.badge"
                className={`brand-input text-xs ${focusedField === 'space.badge' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.dictionary.space?.badge || ''}
                onChange={(e) => updateDictField('space', 'badge', e.target.value)}
                onFocus={() => setFocusedField('space.badge')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título Principal</label>
              <Input
                type="text"
                id="space.title"
                className={`brand-input text-xs ${focusedField === 'space.title' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.dictionary.space?.title || ''}
                onChange={(e) => updateDictField('space', 'title', e.target.value)}
                onFocus={() => setFocusedField('space.title')}
              />
              <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*Acolhedor*</code>
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição</label>
              <textarea
                rows={2}
                id="space.description"
                className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'space.description' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                value={page.dictionary.space?.description || ''}
                onChange={(e) => updateDictField('space', 'description', e.target.value)}
                onFocus={() => setFocusedField('space.description')}
              />
              <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                💡 <strong>Negrito:</strong> Envolva o texto com dois asteriscos. Ex: <code className="text-slate-900 dark:text-white bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">**texto**</code>
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etiqueta de Endereço</label>
              <Input
                type="text"
                id="space.addressLabel"
                className={`brand-input text-xs ${focusedField === 'space.addressLabel' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.dictionary.space?.addressLabel || ''}
                onChange={(e) => updateDictField('space', 'addressLabel', e.target.value)}
                onFocus={() => setFocusedField('space.addressLabel')}
              />
            </div>
          </div>
        );
      case 'faq':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etiqueta (Badge)</label>
              <Input
                type="text"
                id="faq.badge"
                className={`brand-input text-xs ${focusedField === 'faq.badge' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.dictionary.faq?.badge || ''}
                onChange={(e) => updateDictField('faq', 'badge', e.target.value)}
                onFocus={() => setFocusedField('faq.badge')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título Principal</label>
              <Input
                type="text"
                id="faq.title"
                className={`brand-input text-xs ${focusedField === 'faq.title' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={page.dictionary.faq?.title || ''}
                onChange={(e) => updateDictField('faq', 'title', e.target.value)}
                onFocus={() => setFocusedField('faq.title')}
              />
              <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*Perguntas*</code>
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição / Subtítulo</label>
              <textarea
                rows={2}
                id="faq.description"
                className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'faq.description' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                value={page.dictionary.faq?.description || ''}
                onChange={(e) => updateDictField('faq', 'description', e.target.value)}
                onFocus={() => setFocusedField('faq.description')}
              />
            </div>

            {/* FAQ Items */}
            <div className="space-y-3 border-t border-[var(--surface-border)] pt-3">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider block">Itens do FAQ</label>
              <div className="space-y-4">
                {(page.dictionary.faq?.items || page.dictionary.faq?.faq || []).map((faqItem: { question: string; answer: string }, faqIdx: number) => (
                  <div key={faqIdx} className="border border-[var(--surface-border)] p-3 rounded-lg glass-sm space-y-2 relative">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-semibold uppercase">Pergunta {faqIdx + 1}</label>
                      <Input
                        type="text"
                        id={`faq.items.${faqIdx}.question`}
                        className={`brand-input text-xs ${focusedField === `faq.items.${faqIdx}.question` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={faqItem.question}
                        onChange={(e) => {
                          const listKey = page.dictionary.faq?.items ? 'items' : 'faq';
                          const newList = [...(page.dictionary.faq?.[listKey] || [])];
                          newList[faqIdx] = { ...faqItem, question: e.target.value };
                          setPage({
                            ...page,
                            dictionary: {
                              ...page.dictionary,
                              faq: { ...page.dictionary.faq, [listKey]: newList }
                            }
                          });
                        }}
                        onFocus={() => setFocusedField(`faq.items.${faqIdx}.question`)}
                      />
                      <p className="text-[8px] text-slate-500 leading-relaxed font-sans mt-0.5">
                        💡 <strong>Palavras coloridas:</strong> Envolva com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*Dúvida*</code>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-semibold uppercase">Resposta {faqIdx + 1}</label>
                      <textarea
                        rows={2}
                        id={`faq.items.${faqIdx}.answer`}
                        className={`w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === `faq.items.${faqIdx}.answer` ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                        value={faqItem.answer}
                        onChange={(e) => {
                          const listKey = page.dictionary.faq?.items ? 'items' : 'faq';
                          const newList = [...(page.dictionary.faq?.[listKey] || [])];
                          newList[faqIdx] = { ...faqItem, answer: e.target.value };
                          setPage({
                            ...page,
                            dictionary: {
                              ...page.dictionary,
                              faq: { ...page.dictionary.faq, [listKey]: newList }
                            }
                          });
                        }}
                        onFocus={() => setFocusedField(`faq.items.${faqIdx}.answer`)}
                      />
                      <p className="text-[8px] text-slate-500 leading-relaxed font-sans mt-0.5">
                        💡 <strong>Negrito:</strong> Envolva com dois asteriscos. Ex: <code className="text-slate-900 dark:text-white bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">**texto**</code>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const listKey = page.dictionary.faq?.items ? 'items' : 'faq';
                        const newList = (page.dictionary.faq?.[listKey] || []).filter((_: any, idx: number) => idx !== faqIdx);
                        setPage({
                          ...page,
                          dictionary: {
                            ...page.dictionary,
                            faq: { ...page.dictionary.faq, [listKey]: newList }
                          }
                        });
                      }}
                      className="absolute top-1.5 right-1.5 text-[#e11d48] hover:text-[#f43f5e] cursor-pointer bg-transparent border-none"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={() => {
                    const listKey = page.dictionary.faq?.items ? 'items' : 'faq';
                    const newList = [...(page.dictionary.faq?.[listKey] || []), { question: 'Nova Pergunta?', answer: 'Nova Resposta.' }];
                    setPage({
                      ...page,
                      dictionary: {
                        ...page.dictionary,
                        faq: { ...page.dictionary.faq, [listKey]: newList }
                      }
                    });
                  }}
                  className="w-full text-[10px] glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] cursor-pointer text-slate-800 dark:text-white font-semibold"
                >
                  + Adicionar FAQ Item
                </Button>
              </div>

              {/* Structural Layout Settings */}
              {(() => {
                const faqSection = (page.siteConfig.sections || []).find((s: any) => s.type === 'faq') || { id: 'faq', type: 'faq', settings: {} };
                return (
                  <div className="border-t border-[var(--surface-border)] pt-3 mt-4 space-y-3">
                    <span className="text-[10px] text-[var(--brand-gradient-start)] font-bold uppercase tracking-wider block">Configurações de Layout</span>
                    
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 font-semibold uppercase">Modo de Exibição</label>
                        <select
                          value={faqSection.settings?.displayMode || 'accordion'}
                          onChange={(e) => updateLayoutSectionField(faqSection.id, 'settings.displayMode', e.target.value)}
                          className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                        >
                          <option value="accordion">Acordeão Expansível</option>
                          <option value="grid">Grid de 2 Colunas</option>
                        </select>
                      </div>

                      <div className="space-y-1 flex flex-col justify-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase">
                          <input
                            type="checkbox"
                            checked={faqSection.settings?.defaultOpenFirst ?? true}
                            onChange={(e) => updateLayoutSectionField(faqSection.id, 'settings.defaultOpenFirst', e.target.checked)}
                            className="rounded border-[var(--surface-border)] brand-input text-[var(--brand-gradient-start)] focus:ring-[var(--brand-gradient-start)] cursor-pointer"
                          />
                          Abrir 1º Item
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      case 'grid':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etiqueta Seção (Badge)</label>
              <Input
                type="text"
                id={`${section.id}.badge`}
                className={`brand-input text-xs ${focusedField === `${section.id}.badge` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.badge || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'badge', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.badge`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título Principal</label>
              <Input
                type="text"
                id={`${section.id}.title`}
                className={`brand-input text-xs ${focusedField === `${section.id}.title` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.title || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'title', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.title`)}
              />
              <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*palavra*</code>
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição Geral</label>
              <textarea
                rows={2}
                id={`${section.id}.description`}
                className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === `${section.id}.description` ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                value={section.description || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'description', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.description`)}
              />
            </div>

            {/* Structural Layout Settings */}
            <div className="border-t border-[var(--surface-border)] pt-3 space-y-3">
              <span className="text-[10px] text-[var(--brand-gradient-start)] font-bold uppercase tracking-wider block">Configurações de Layout</span>
              
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Colunas Desktop</label>
                  <select
                    value={section.settings?.columns || 3}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.columns', parseInt(e.target.value))}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value={2}>2 Colunas</option>
                    <option value={3}>3 Colunas</option>
                    <option value={4}>4 Colunas</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Marcador do Card</label>
                  <select
                    value={section.settings?.markerType || 'number'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.markerType', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="number">Números (01, 02)</option>
                    <option value="icon">Ícones</option>
                    <option value="none">Nenhum</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Estilo do Card</label>
                  <select
                    value={section.settings?.cardStyle || 'glass'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.cardStyle', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="glass">Cartão Elevado</option>
                    <option value="bordered">Contorno Fino</option>
                    <option value="flat">Texto Puro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Alinhamento Texto</label>
                  <select
                    value={section.settings?.itemAlignment || 'left'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.itemAlignment', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="left">Esquerda</option>
                    <option value="center">Centralizado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loop over 3 grid items */}
            <div className="space-y-3 border-t border-[var(--surface-border)] pt-3">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider block">Itens da Grade (Cards)</label>
              {(section.items || []).map((item: any, cardIdx: number) => (
                <div key={cardIdx} className="border border-[var(--surface-border)] p-3 rounded-lg glass-sm space-y-2">
                  <div className="flex gap-2">
                    <div className="w-16 space-y-1">
                      <label className="text-[8px] text-slate-500 font-semibold uppercase">Ordem</label>
                      <Input
                        type="text"
                        id={`${section.id}.items.${cardIdx}.number`}
                        className={`brand-input text-xs ${focusedField === `${section.id}.items.${cardIdx}.number` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={item.number || ''}
                        onChange={(e) => updateLayoutSectionField(section.id, `items.${cardIdx}.number`, e.target.value)}
                        onFocus={() => setFocusedField(`${section.id}.items.${cardIdx}.number`)}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[8px] text-slate-500 font-semibold uppercase">Título Card {cardIdx + 1}</label>
                      <Input
                        type="text"
                        id={`${section.id}.items.${cardIdx}.title`}
                        className={`brand-input text-xs ${focusedField === `${section.id}.items.${cardIdx}.title` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={item.title || ''}
                        onChange={(e) => updateLayoutSectionField(section.id, `items.${cardIdx}.title`, e.target.value)}
                        onFocus={() => setFocusedField(`${section.id}.items.${cardIdx}.title`)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-500 font-semibold uppercase">Descrição Card {cardIdx + 1}</label>
                    <textarea
                      rows={2}
                      id={`${section.id}.items.${cardIdx}.description`}
                      className={`w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === `${section.id}.items.${cardIdx}.description` ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                      value={item.description || ''}
                      onChange={(e) => updateLayoutSectionField(section.id, `items.${cardIdx}.description`, e.target.value)}
                      onFocus={() => setFocusedField(`${section.id}.items.${cardIdx}.description`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'two-columns':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etiqueta Seção (Badge)</label>
              <Input
                type="text"
                id={`${section.id}.badge`}
                className={`brand-input text-xs ${focusedField === `${section.id}.badge` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.badge || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'badge', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.badge`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título Principal</label>
              <Input
                type="text"
                id={`${section.id}.title`}
                className={`brand-input text-xs ${focusedField === `${section.id}.title` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.title || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'title', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.title`)}
              />
            </div>

            {/* Structural Layout Settings */}
            <div className="border-t border-[var(--surface-border)] pt-3 space-y-3">
              <span className="text-[10px] text-[var(--brand-gradient-start)] font-bold uppercase tracking-wider block">Configurações de Layout</span>
              
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Estilo das Colunas</label>
                  <select
                    value={section.settings?.cardStyle || 'glass'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.cardStyle', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="glass">Cartão Elevado</option>
                    <option value="bordered">Contorno Fino</option>
                    <option value="flat">Texto Puro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Alinhamento do Texto</label>
                  <select
                    value={section.settings?.itemAlignment || 'left'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.itemAlignment', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="left">Esquerda</option>
                    <option value="center">Centralizado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-[var(--surface-border)] pt-3">
              <div className="space-y-3">
                <label className="text-[9px] text-[var(--brand-gradient-start)] font-bold uppercase tracking-wider block">Coluna Esquerda</label>
                <div className="space-y-1">
                  <label className="text-[8px] text-slate-500 font-semibold uppercase">Título</label>
                  <Input
                    type="text"
                    id={`${section.id}.leftTitle`}
                    className={`brand-input text-xs ${focusedField === `${section.id}.leftTitle` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                    value={section.leftTitle || ''}
                    onChange={(e) => updateLayoutSectionField(section.id, 'leftTitle', e.target.value)}
                    onFocus={() => setFocusedField(`${section.id}.leftTitle`)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] text-slate-500 font-semibold uppercase">Conteúdo</label>
                  <textarea
                    rows={4}
                    id={`${section.id}.leftText`}
                    className={`w-full text-xs p-2.5 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === `${section.id}.leftText` ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                    value={section.leftText || ''}
                    onChange={(e) => updateLayoutSectionField(section.id, 'leftText', e.target.value)}
                    onFocus={() => setFocusedField(`${section.id}.leftText`)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] text-[var(--brand-gradient-start)] font-bold uppercase tracking-wider block">Coluna Direita</label>
                <div className="space-y-1">
                  <label className="text-[8px] text-slate-500 font-semibold uppercase">Título</label>
                  <Input
                    type="text"
                    id={`${section.id}.rightTitle`}
                    className={`brand-input text-xs ${focusedField === `${section.id}.rightTitle` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                    value={section.rightTitle || ''}
                    onChange={(e) => updateLayoutSectionField(section.id, 'rightTitle', e.target.value)}
                    onFocus={() => setFocusedField(`${section.id}.rightTitle`)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] text-slate-500 font-semibold uppercase">Conteúdo</label>
                  <textarea
                    rows={4}
                    id={`${section.id}.rightText`}
                    className={`w-full text-xs p-2.5 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === `${section.id}.rightText` ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                    value={section.rightText || ''}
                    onChange={(e) => updateLayoutSectionField(section.id, 'rightText', e.target.value)}
                    onFocus={() => setFocusedField(`${section.id}.rightText`)}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 'text-image':
        return (
          <div className="space-y-4">
            <ImageUploader
              id={`${section.id}.image`}
              label="Imagem Lateral"
              value={section.image || ''}
              onChange={(url) => updateLayoutSectionField(section.id, 'image', url)}
              onFocus={() => setFocusedField(`${section.id}.image`)}
              isFocused={focusedField === `${section.id}.image`}
              tenantId={page.tenantId}
              aspectRatio={16 / 9}
              targetWidth={960}
              targetHeight={540}
              hideOnMobile={section.hideImageOnMobile ?? false}
              onToggleHideOnMobile={(hidden) => updateLayoutSectionField(section.id, 'hideImageOnMobile', hidden)}
            />

            {/* Structural Layout Settings */}
            <div className="border-t border-[var(--surface-border)] pt-3 space-y-3">
              <span className="text-[10px] text-[var(--brand-gradient-start)] font-bold uppercase tracking-wider block">Configurações de Layout</span>
              
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Ordem das Colunas</label>
                  <select
                    value={section.settings?.columnOrder || (section.imagePosition === 'left' ? 'media-first' : 'text-first')}
                    onChange={(e) => {
                      updateLayoutSectionField(section.id, 'settings.columnOrder', e.target.value);
                      updateLayoutSectionField(section.id, 'imagePosition', e.target.value === 'media-first' ? 'left' : 'right');
                    }}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="text-first">Texto | Imagem</option>
                    <option value="media-first">Imagem | Texto</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Proporção da Foto</label>
                  <select
                    value={section.settings?.imageAspectRatio || 'square'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.imageAspectRatio', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="square">Quadrada (1:1)</option>
                    <option value="portrait">Retrato (3:4)</option>
                    <option value="rounded">Circular</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etiqueta Seção (Badge)</label>
              <Input
                type="text"
                id={`${section.id}.badge`}
                className={`brand-input text-xs ${focusedField === `${section.id}.badge` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.badge || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'badge', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.badge`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título Principal</label>
              <Input
                type="text"
                id={`${section.id}.title`}
                className={`brand-input text-xs ${focusedField === `${section.id}.title` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.title || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'title', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.title`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição</label>
              <textarea
                rows={3}
                id={`${section.id}.description`}
                className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === `${section.id}.description` ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                value={section.description || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'description', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.description`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Texto Botão CTA (Opcional)</label>
              <Input
                type="text"
                id={`${section.id}.ctaText`}
                className={`brand-input text-xs ${focusedField === `${section.id}.ctaText` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.ctaText || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'ctaText', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.ctaText`)}
              />
            </div>
          </div>
        );
      case 'text-block':
      case 'cta-banner':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etiqueta Seção (Badge)</label>
              <Input
                type="text"
                id={`${section.id}.badge`}
                className={`brand-input text-xs ${focusedField === `${section.id}.badge` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.badge || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'badge', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.badge`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título Principal</label>
              <Input
                type="text"
                id={`${section.id}.title`}
                className={`brand-input text-xs ${focusedField === `${section.id}.title` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.title || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'title', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.title`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição / Mensagem</label>
              <textarea
                rows={3}
                id={`${section.id}.description`}
                className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === `${section.id}.description` ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                value={section.description || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'description', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.description`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Texto do Botão CTA (Principal)</label>
              <Input
                type="text"
                id={`${section.id}.ctaText`}
                className={`brand-input text-xs ${focusedField === `${section.id}.ctaText` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.ctaText || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'ctaText', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.ctaText`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Subtexto do Botão (Garantia/Segurança)</label>
              <Input
                type="text"
                id={`${section.id}.ctaSubtext`}
                className={`brand-input text-xs ${focusedField === `${section.id}.ctaSubtext` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.ctaSubtext || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'ctaSubtext', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.ctaSubtext`)}
              />
            </div>

            {/* Layout parameters */}
            <div className="border-t border-[var(--surface-border)] pt-3 space-y-3">
              <span className="text-[10px] text-[var(--brand-gradient-start)] font-bold uppercase tracking-wider block">Configurações do CTA</span>
              
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Estilo de Fundo</label>
                  <select
                    value={section.settings?.bgStyle || 'gradient'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.bgStyle', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="gradient">Gradiente da Marca</option>
                    <option value="card">Card Destacado</option>
                    <option value="minimal">Minimalista (Livre)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Alinhamento</label>
                  <select
                    value={section.settings?.alignment || 'center'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.alignment', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="center">Centralizado</option>
                    <option value="left">Esquerda</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1.5 text-left">
                <input
                  type="checkbox"
                  id={`${section.id}.showSecondaryCta`}
                  checked={section.settings?.showSecondaryCta || false}
                  onChange={(e) => updateLayoutSectionField(section.id, 'settings.showSecondaryCta', e.target.checked)}
                  className="rounded border-[var(--surface-border)] brand-input text-[var(--brand-gradient-start)] focus:ring-[var(--brand-gradient-start)] h-3.5 w-3.5 cursor-pointer"
                />
                <label htmlFor={`${section.id}.showSecondaryCta`} className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold uppercase cursor-pointer">
                  Exibir botão secundário de WhatsApp
                </label>
              </div>
            </div>
          </div>
        );

      case 'cta-split':
        return (
          <div className="space-y-4">
            <ImageUploader
              id={`${section.id}.image`}
              label="Foto / Imagem de Destaque"
              value={section.image || ''}
              onChange={(url) => updateLayoutSectionField(section.id, 'image', url)}
              onFocus={() => setFocusedField(`${section.id}.image`)}
              isFocused={focusedField === `${section.id}.image`}
              tenantId={page.tenantId}
              aspectRatio={3 / 4}
              targetWidth={600}
              targetHeight={800}
            />

            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etiqueta Seção (Badge)</label>
              <Input
                type="text"
                id={`${section.id}.badge`}
                className={`brand-input text-xs ${focusedField === `${section.id}.badge` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.badge || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'badge', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.badge`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título Principal</label>
              <Input
                type="text"
                id={`${section.id}.title`}
                className={`brand-input text-xs ${focusedField === `${section.id}.title` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.title || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'title', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.title`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição Explicativa</label>
              <textarea
                rows={3}
                id={`${section.id}.description`}
                className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === `${section.id}.description` ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                value={section.description || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'description', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.description`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Texto do Botão Principal (Triagem)</label>
              <Input
                type="text"
                id={`${section.id}.ctaText`}
                className={`brand-input text-xs ${focusedField === `${section.id}.ctaText` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.ctaText || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'ctaText', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.ctaText`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Texto do Botão Secundário (WhatsApp)</label>
              <Input
                type="text"
                id={`${section.id}.ctaSecondaryText`}
                className={`brand-input text-xs ${focusedField === `${section.id}.ctaSecondaryText` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.ctaSecondaryText || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'ctaSecondaryText', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.ctaSecondaryText`)}
              />
            </div>

            {/* Layout parameters */}
            <div className="border-t border-[var(--surface-border)] pt-3 space-y-3">
              <span className="text-[10px] text-[var(--brand-gradient-start)] font-bold uppercase tracking-wider block">Configurações de Layout</span>
              
              <div className="grid grid-cols-3 gap-2 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Foto Lado</label>
                  <select
                    value={section.settings?.imagePosition || 'right'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.imagePosition', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="right">Direita</option>
                    <option value="left">Esquerda</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Proporção</label>
                  <select
                    value={section.settings?.imageAspectRatio || 'portrait'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.imageAspectRatio', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="portrait">Retrato (3:4)</option>
                    <option value="square">Quadrada (1:1)</option>
                    <option value="rounded">Circular</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Estilo Bloco</label>
                  <select
                    value={section.settings?.cardStyle || 'glass'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.cardStyle', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="glass">Cartão Elevado</option>
                    <option value="bordered">Contorno Fino</option>
                    <option value="flat">Sem Fundo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'quote':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Texto da Citação / Frase</label>
              <textarea
                rows={4}
                id={`${section.id}.title`}
                className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === `${section.id}.title` ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                value={section.title || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'title', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.title`)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Autor da Frase</label>
              <Input
                type="text"
                id={`${section.id}.author`}
                className={`brand-input text-xs ${focusedField === `${section.id}.author` ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                value={section.author || ''}
                onChange={(e) => updateLayoutSectionField(section.id, 'author', e.target.value)}
                onFocus={() => setFocusedField(`${section.id}.author`)}
              />
            </div>

            {/* Layout parameters */}
            <div className="border-t border-[var(--surface-border)] pt-3 space-y-3">
              <span className="text-[10px] text-[var(--brand-gradient-start)] font-bold uppercase tracking-wider block">Configurações de Layout</span>
              
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Estilo Bloco</label>
                  <select
                    value={section.settings?.style || 'elegant'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.style', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="elegant">Citação Clássica</option>
                    <option value="card">Card Elevado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-semibold uppercase">Alinhamento</label>
                  <select
                    value={section.settings?.alignment || 'center'}
                    onChange={(e) => updateLayoutSectionField(section.id, 'settings.alignment', e.target.value)}
                    className="w-full text-xs p-2 brand-input rounded-lg outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="center">Centralizado</option>
                    <option value="left">Esquerda</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Currently focused field key (e.g. 'hero.titlePart1')
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Iframe ref for postMessage communication
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sidebar collapsed and width states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // Custom font upload modal states
  const [isCustomFontModalOpen, setIsCustomFontModalOpen] = useState(false);
  const [customFontTarget, setCustomFontTarget] = useState<'heading' | 'body'>('heading');
  const [fontUploading, setFontUploading] = useState(false);

  const handleUploadCustomFont = async (file: File) => {
    if (!page || !file) return;
    setFontUploading(true);
    try {
      const { validateFontFile, sanitizeFontFamily } = await import('@psi/image-utils');
      const validation = await validateFontFile(file);
      if (!validation.valid) {
        alert(validation.error || 'Arquivo de fonte inválido.');
        setFontUploading(false);
        return;
      }

      const { url } = await api.uploadImage(file, 'font');
      const cleanFontName = sanitizeFontFamily(file.name.split('.')[0] || 'CustomFont');

      if (customFontTarget === 'heading') {
        const updatedTypography = {
          ...(page.siteConfig?.theme?.typography || {}),
          customHeadingFontUrl: url,
          customHeadingFontName: cleanFontName,
          customHeadingFontFormat: validation.format,
          headingFont: cleanFontName,
        };
        setPage({
          ...page,
          siteConfig: {
            ...page.siteConfig,
            theme: {
              ...(page.siteConfig?.theme || {}),
              typography: updatedTypography
            }
          }
        });
      } else {
        const updatedTypography = {
          ...(page.siteConfig?.theme?.typography || {}),
          customBodyFontUrl: url,
          customBodyFontName: cleanFontName,
          customBodyFontFormat: validation.format,
          bodyFont: cleanFontName,
        };
        setPage({
          ...page,
          siteConfig: {
            ...page.siteConfig,
            theme: {
              ...(page.siteConfig?.theme || {}),
              typography: updatedTypography
            }
          }
        });
      }

      setHasUnsavedChanges(true);
      setIsCustomFontModalOpen(false);
    } catch (err: any) {
      alert('Erro ao enviar fonte: ' + (err.message || 'Falha no servidor.'));
    } finally {
      setFontUploading(false);
    }
  };

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      // Limit width between 280px and 600px, accounting for screen padding (24px)
      const newWidth = Math.max(280, Math.min(600, mouseMoveEvent.clientX - 24));
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // History tracking state for Ctrl+Z Undo/Redo
  interface HistoryState {
    page: any;
    nodes: any[];
    edges: any[];
  }

  const historyRef = useRef<{
    past: HistoryState[];
    future: HistoryState[];
    lastSavedTime: number;
  }>({
    past: [],
    future: [],
    lastSavedTime: 0
  });

  const ignoreHistoryUpdateRef = useRef(false);

  const pushToHistory = useCallback((
    newPage: any | null,
    newNodes: any[],
    newEdges: any[],
    force = false
  ) => {
    if (!newPage) return;
    
    const history = historyRef.current;
    const now = Date.now();
    
    const snapshot: HistoryState = {
      page: JSON.parse(JSON.stringify(newPage)),
      nodes: JSON.parse(JSON.stringify(newNodes)),
      edges: JSON.parse(JSON.stringify(newEdges))
    };
    
    if (history.past.length === 0) {
      history.past.push(snapshot);
      history.lastSavedTime = now;
      return;
    }
    
    const lastState = history.past[history.past.length - 1];
    
    // Check structural changes in page, nodes, or edges
    const isStructural = 
      lastState.page.formFlow?.nodes?.length !== newPage.formFlow?.nodes?.length ||
      lastState.page.formFlow?.edges?.length !== newPage.formFlow?.edges?.length ||
      lastState.nodes?.length !== newNodes?.length ||
      lastState.edges?.length !== newEdges?.length;

    const hasPageChanged = JSON.stringify(lastState.page) !== JSON.stringify(newPage);
    const hasNodesChanged = JSON.stringify(lastState.nodes) !== JSON.stringify(newNodes);
    const hasEdgesChanged = JSON.stringify(lastState.edges) !== JSON.stringify(newEdges);
    
    if (!hasPageChanged && !hasNodesChanged && !hasEdgesChanged) {
      return; // Nothing changed
    }
    
    const isQuickConsecutive = now - history.lastSavedTime < 1000;
    
    if (!isStructural && isQuickConsecutive && !force) {
      // Overwrite last state to debounce rapid typing or dragging
      history.past[history.past.length - 1] = snapshot;
    } else {
      history.past.push(snapshot);
      if (history.past.length > 50) {
        history.past.shift();
      }
    }
    
    history.future = [];
    history.lastSavedTime = now;
    setHasUnsavedChanges(true);
    setError('');
  }, []);

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (history.past.length <= 1) return; // Keep initial state

    const currentState = history.past.pop();
    if (currentState) {
      history.future.push(currentState);
    }

    const previousState = history.past[history.past.length - 1];
    if (previousState) {
      ignoreHistoryUpdateRef.current = true;
      setPage(JSON.parse(JSON.stringify(previousState.page)));
      setNodes(JSON.parse(JSON.stringify(previousState.nodes)));
      setEdges(JSON.parse(JSON.stringify(previousState.edges)));
      
      setTimeout(() => {
        ignoreHistoryUpdateRef.current = false;
      }, 50);
    }
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    if (history.future.length === 0) return;

    const nextState = history.future.pop();
    if (nextState) {
      history.past.push(nextState);
      
      ignoreHistoryUpdateRef.current = true;
      setPage(JSON.parse(JSON.stringify(nextState.page)));
      setNodes(JSON.parse(JSON.stringify(nextState.nodes)));
      setEdges(JSON.parse(JSON.stringify(nextState.edges)));
      
      setTimeout(() => {
        ignoreHistoryUpdateRef.current = false;
      }, 50);
    }
  }, [setNodes, setEdges]);

  const historyTimeoutRef = useRef<any>(null);

  const recordHistory = useCallback((
    newPage: any,
    newNodes: any[],
    newEdges: any[],
    force = false
  ) => {
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
      historyTimeoutRef.current = null;
    }

    if (force) {
      pushToHistory(newPage, newNodes, newEdges, true);
    } else {
      historyTimeoutRef.current = setTimeout(() => {
        pushToHistory(newPage, newNodes, newEdges, false);
      }, 600); // 600ms debounce
    }
  }, [pushToHistory]);

  // Monitor changes and push to history (debounced to prevent performance lag)
  useEffect(() => {
    if (!page || ignoreHistoryUpdateRef.current) return;
    recordHistory(page, nodes, edges, false);
  }, [page, nodes, edges, recordHistory]);

  // Autosave draft to database (debounced)
  useEffect(() => {
    if (!page || loading) return;
    if (ignoreHistoryUpdateRef.current) return;

    const timer = setTimeout(async () => {
      // Reconstruct formFlow config from React Flow current nodes/edges
      const compiledNodes = nodes.map(n => {
        const originalNode = page.formFlow?.nodes?.find((on: any) => on.id === n.id);
        return {
          id: n.id,
          type: originalNode?.type || n.type || 'texto',
          position: n.position,
          data: originalNode?.data || { title: 'Etapa sem título', isRequired: true }
        };
      });

      const compiledEdges = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined
      }));

      const updatedFlow = {
        ...page.formFlow,
        nodes: compiledNodes,
        edges: compiledEdges
      };

      try {
        await api.updateCapturePage(page.id, {
          titleDraft: page.title,
          slugDraft: page.slug,
          customDomainDraft: page.customDomain,
          seoConfigDraft: page.seoConfig,
          siteConfigDraft: page.siteConfig,
          dictionaryDraft: page.dictionary,
          formFlowDraft: updatedFlow
        });
      } catch (err) {
        console.error('Erro ao salvar rascunho automático:', err);
      }
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [
    page?.title,
    page?.slug,
    page?.customDomain,
    JSON.stringify(page?.seoConfig),
    JSON.stringify(page?.siteConfig),
    JSON.stringify(page?.dictionary),
    nodes,
    edges,
    loading
  ]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Node Drag Stop helper to force push position history
  const onNodeDragStop = useCallback(() => {
    if (page) {
      recordHistory(page, nodes, edges, true);
    }
  }, [page, nodes, edges, recordHistory]);

  // Safe helper to update dictionary fields nested in specific sections
  const updateDictField = (section: string, field: string, value: any) => {
    if (!page) return;
    setPage(prev => {
      if (!prev) return null;
      return {
        ...prev,
        dictionary: {
          ...prev.dictionary,
          [section]: {
            ...prev.dictionary[section],
            [field]: value
          }
        }
      };
    });
  };

  // Safe helper to update layout section fields
  const updateLayoutSectionField = useCallback((sectionId: string, fieldPath: string, value: any) => {
    if (!page) return;
    const currentSections = (page.siteConfig.sections || defaultSections).map((sec: any) => {
      if (sec.id === sectionId) {
        const updated = { ...sec };
        const parts = fieldPath.split('.');
        let current = updated;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (Array.isArray(current[part])) {
            current[part] = [...current[part]];
          } else {
            current[part] = { ...current[part] };
          }
          current = current[part];
        }
        current[parts[parts.length - 1]] = value;
        return updated;
      }
      return sec;
    });

    setPage({
      ...page,
      siteConfig: {
        ...page.siteConfig,
        sections: currentSections
      }
    });
    setHasUnsavedChanges(true);
  }, [page, defaultSections]);


  // Safe helper to update dictionary fields nested in process steps
  const updateProcessStepField = (step: 'step1' | 'step2' | 'step3', field: string, value: any) => {
    if (!page) return;
    setPage(prev => {
      if (!prev) return null;
      return {
        ...prev,
        dictionary: {
          ...prev.dictionary,
          process: {
            ...prev.dictionary.process,
            [step]: {
              ...prev.dictionary.process[step],
              [field]: value
            }
          }
        }
      };
    });
  };

  // Listen for 'EDIT_ELEMENT' messages from the iframe preview
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'EDIT_ELEMENT') {
        const { field } = event.data;
        let targetField = field;
        if (field === 'hero.titlePart1' || field === 'hero.titlePart2') {
          targetField = 'hero.title';
        }
        setFocusedField(targetField);

        // Determine which section contains this field and expand it
        if (targetField.startsWith('hero.') || targetField === 'siteConfig.images.hero') {
          setOpenSection('hero');
        } else if (targetField.startsWith('diagnostic.')) {
          setOpenSection('diagnostic');
        } else if (targetField.startsWith('about.') || targetField === 'siteConfig.images.portrait') {
          setOpenSection('about');
        } else if (targetField.startsWith('process.')) {
          setOpenSection('process');
        } else if (
          targetField.startsWith('space.') || 
          targetField.startsWith('professional.') || 
          targetField === 'siteConfig.images.officeSpace'
        ) {
          setOpenSection('space');
        } else if (targetField.startsWith('faq.')) {
          setOpenSection('faq');
        } else if (targetField.startsWith('footer.')) {
          setOpenSection('footer');
        } else {
          // If it contains a dot, check if prefix is a dynamic layout section ID
          const dotIndex = targetField.indexOf('.');
          if (dotIndex > -1) {
            const prefix = targetField.substring(0, dotIndex);
            setOpenSection(prefix);
          }
        }

        // Switch to the design tab since text inputs are in the layout tab
        if (targetField === 'siteConfig.logoUrl' || targetField === 'siteConfig.faviconUrl') {
          setActiveTab('theme');
        } else {
          setActiveTab('layout');
        }

        // Delay slightly to allow the DOM/accordion to render, then scroll to input and focus it
        setTimeout(() => {
          const inputEl = document.getElementById(targetField);
          if (inputEl) {
            inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputEl.focus();
          }
        }, 150);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Broadcast updates to preview iframe on state changes
  useEffect(() => {
    if (page && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'SYNC_DATA',
        page: {
          title: page.title,
          dictionary: page.dictionary,
          siteConfig: page.siteConfig,
        },
        tenant
      }, '*');
    }
  }, [page?.title, page?.dictionary, page?.siteConfig, tenant]);

  // Monitor real differences to set hasUnsavedChanges state
  useEffect(() => {
    if (!page || !lastPublishedPage) return;

    const compiledNodes = (page.formFlow?.nodes || []).map((n: any) => {
      const flowNode = nodes.find((fn: any) => fn.id === n.id);
      return {
        ...n,
        position: flowNode ? {
          x: Math.round(flowNode.position?.x || 0),
          y: Math.round(flowNode.position?.y || 0)
        } : n.position
      };
    });

    const compiledEdges = edges.map(e => {
      const item: any = {
        id: e.id,
        source: e.source,
        target: e.target
      };
      if (e.sourceHandle) {
        item.sourceHandle = e.sourceHandle;
      }
      return item;
    });

    const originalNodes = lastPublishedPage.formFlow?.nodes || [];
    const originalEdges = lastPublishedPage.formFlow?.edges || [];

    const flowChanged = 
      safeJsonStringify(compiledNodes) !== safeJsonStringify(originalNodes) ||
      safeJsonStringify(compiledEdges) !== safeJsonStringify(originalEdges);

    const isDifferent =
      page.title !== lastPublishedPage.title ||
      page.slug !== lastPublishedPage.slug ||
      page.customDomain !== lastPublishedPage.customDomain ||
      safeJsonStringify(page.seoConfig) !== safeJsonStringify(lastPublishedPage.seoConfig) ||
      safeJsonStringify(page.siteConfig) !== safeJsonStringify(lastPublishedPage.siteConfig) ||
      safeJsonStringify(page.dictionary) !== safeJsonStringify(lastPublishedPage.dictionary) ||
      flowChanged;

    setHasUnsavedChanges(isDifferent);
  }, [
    page?.title,
    page?.slug,
    page?.customDomain,
    safeJsonStringify(page?.seoConfig),
    safeJsonStringify(page?.siteConfig),
    safeJsonStringify(page?.dictionary),
    safeJsonStringify(page?.formFlow),
    nodes,
    edges,
    lastPublishedPage
  ]);

  const handleIframeLoad = () => {
    if (page && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'SYNC_DATA',
        page: {
          title: page.title,
          dictionary: page.dictionary,
          siteConfig: page.siteConfig,
        },
        tenant
      }, '*');
    }
  };

  // Fetch page data and contracts templates
  const loadData = useCallback(async () => {
    setError('');
    try {
      const pageData = await api.getCapturePage(pageId);
      
      // Load draft fields if they exist, fallback to published values
      const pageWithDrafts: CapturePage = {
        ...pageData,
        title: pageData.titleDraft || pageData.title,
        slug: pageData.slugDraft || pageData.slug,
        customDomain: pageData.customDomainDraft || pageData.customDomain,
        seoConfig: pageData.seoConfigDraft || pageData.seoConfig,
        siteConfig: pageData.siteConfigDraft || pageData.siteConfig,
        dictionary: pageData.dictionaryDraft || pageData.dictionary,
        formFlow: pageData.formFlowDraft || pageData.formFlow,
      };
      
      setPage(pageWithDrafts);

      // Save last published copy to compare drafts against
      const lastPublished: CapturePage = {
        ...pageData,
        title: pageData.title,
        slug: pageData.slug,
        customDomain: pageData.customDomain,
        seoConfig: pageData.seoConfig,
        siteConfig: pageData.siteConfig,
        dictionary: pageData.dictionary,
        formFlow: pageData.formFlow,
      };
      setLastPublishedPage(lastPublished);

      // Check if there are unsaved draft changes from previous session
      const hasDraft = 
        pageData.titleDraft !== null ||
        pageData.slugDraft !== null ||
        pageData.customDomainDraft !== null ||
        pageData.seoConfigDraft !== null ||
        pageData.siteConfigDraft !== null ||
        pageData.dictionaryDraft !== null ||
        pageData.formFlowDraft !== null;
      setHasUnsavedChanges(hasDraft);

      if (pageData.tenantId) {
        const contractList = await api.getContractTemplates(pageData.tenantId);
        setContracts(contractList);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar os dados da página.');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formFlowNodes = page?.formFlow?.nodes;
  const formFlowEdges = page?.formFlow?.edges;

  // Sync state dictionary/configs to React Flow states when page is loaded (optimized to ignore text edits)
  useEffect(() => {
    if (!page) return;

    // Build flow nodes for React Flow canvas
    const flowNodes = (formFlowNodes || []).map((node: any) => {
      const contract = contracts.find(c => c.id === node.data.contractTemplateId);
      return {
        id: node.id,
        type: node.type === 'start' ? 'start' : node.type === 'seletor' ? 'seletor' : node.type === 'contrato' ? 'contrato' : 'input',
        position: node.position || { x: 100, y: 100 },
        data: {
          node,
          isSelected: selectedNodeId === node.id,
          contractTitle: contract?.title,
          onDelete: handleDeleteNode,
        }
      };
    });

    const flowEdges = (formFlowEdges || []).map((edge: any) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || 'source',
      targetHandle: 'target',
      type: 'default',
      style: { stroke: 'var(--brand-gradient-start)', strokeWidth: 2 }
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [formFlowNodes, formFlowEdges, contracts, selectedNodeId]);

  // Connect visual nodes in React Flow
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({
      ...params,
      style: { stroke: 'var(--brand-gradient-start)', strokeWidth: 2 }
    }, eds));
  }, [setEdges]);

  const handleToggleActive = async (id: string, currentVal: boolean) => {
    if (!page) return;
    try {
      const updated = await api.updateCapturePage(id, { isActive: !currentVal });
      setPage(prev => prev ? { ...prev, isActive: updated.isActive } : null);
    } catch (err: any) {
      setError('Falha ao alternar status da página: ' + err.message);
    }
  };

  // Save changes to database
  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    setError('');
    setSuccess('');

    // Reconstruct formFlow config from React Flow current nodes/edges
    const compiledNodes = (page.formFlow?.nodes || []).map((n: any) => {
      const flowNode = nodes.find((fn: any) => fn.id === n.id);
      return {
        ...n,
        position: flowNode ? {
          x: Math.round(flowNode.position?.x || 0),
          y: Math.round(flowNode.position?.y || 0)
        } : n.position
      };
    });

    const compiledEdges = edges.map(e => {
      const item: any = {
        id: e.id,
        source: e.source,
        target: e.target
      };
      if (e.sourceHandle) {
        item.sourceHandle = e.sourceHandle;
      }
      return item;
    });

    const updatedFlow = {
      ...page.formFlow,
      nodes: compiledNodes,
      edges: compiledEdges
    };

    try {
      const res = await api.updateCapturePage(page.id, {
        title: page.title,
        slug: page.slug,
        isActive: page.isActive,
        customDomain: page.customDomain,
        seoConfig: page.seoConfig,
        siteConfig: page.siteConfig,
        dictionary: page.dictionary,
        formFlow: updatedFlow,
        titleDraft: null,
        slugDraft: null,
        customDomainDraft: null,
        seoConfigDraft: null,
        siteConfigDraft: null,
        dictionaryDraft: null,
        formFlowDraft: null
      });

      setPage(res);
      setLastPublishedPage(res);
      setHasUnsavedChanges(false);
      setSuccess('Configurações salvas e publicadas com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  // Node modifications inside graph editor
  const handleAddNode = (type: string) => {
    if (!page) return;
    const id = `${type}_${Math.random().toString(36).substring(2, 6)}`;
    const newNodeData = {
      id,
      type,
      position: { x: 300, y: 150 },
      data: {
        title: type === 'contrato' ? 'Termo de Aceite Legal' : type === 'emergencia' ? 'Contato de Emergência' : 'Escreva a pergunta da etapa...',
        isRequired: true,
        placeholder: type === 'celular' ? '(11) 99999-9999' : 'Responda aqui...',
        options: type === 'seletor' ? [{ label: 'Opção A', value: 'a' }] : undefined
      }
    };

    const updatedNodes = [...page.formFlow.nodes, newNodeData];
    setPage({
      ...page,
      formFlow: { ...page.formFlow, nodes: updatedNodes }
    });
    setSelectedNodeId(id);
  };

  const handleDeleteNode = (id: string) => {
    if (!page || id === 'start') return;
    
    const updatedNodes = page.formFlow.nodes.filter((n: any) => n.id !== id);
    const updatedEdges = page.formFlow.edges.filter((e: any) => e.source !== id && e.target !== id);

    setPage({
      ...page,
      formFlow: { ...page.formFlow, nodes: updatedNodes, edges: updatedEdges }
    });
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Selected node config field editor helpers
  const selectedNode = page?.formFlow.nodes.find((n: any) => n.id === selectedNodeId);

  const updateSelectedNodeData = (field: string, value: any) => {
    if (!page || !selectedNode) return;

    const updatedNodes = page.formFlow.nodes.map((n: any) => {
      if (n.id === selectedNodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            [field]: value
          }
        };
      }
      return n;
    });

    setPage({
      ...page,
      formFlow: { ...page.formFlow, nodes: updatedNodes }
    });
  };

  // Memoize nodeTypes mapping to avoid canvas issues
  const nodeTypes = useMemo(() => ({
    start: CustomStartNode,
    input: CustomInputNode,
    contrato: CustomContractNode,
    seletor: CustomSelectorNode,
  }), []);

  if (loading || !page) {
    const logoUrl =
      theme === 'light'
        ? (tenant?.logoLightUrl || tenant?.logoDarkUrl)
        : (tenant?.logoDarkUrl || tenant?.logoLightUrl);
    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 select-none"
        style={{
          backgroundColor: 'var(--brand-bg-color, #09090B)',
          animation: 'fadeIn 0.25s ease-out forwards',
        }}
      >
        {error ? (
          <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
            <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center text-xl">
              ⚠️
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--brand-text-color)' }}>Falha ao Carregar</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{error}</p>
            <div className="flex gap-3 mt-2">
              <Link href="/dashboard/captacao" className="px-4 h-9 glass-sm border border-[var(--surface-border)] hover:bg-[var(--surface-hover)] text-slate-800 dark:text-white text-xs font-semibold rounded-xl flex items-center justify-center cursor-pointer transition-colors">
                Voltar
              </Link>
              <button
                type="button"
                onClick={() => { setLoading(true); loadData(); }}
                className="px-4 h-9 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white text-xs font-semibold rounded-xl flex items-center justify-center cursor-pointer hover:opacity-90 transition-all border-none"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8" style={{ animation: 'fadeIn 0.4s ease-out forwards' }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={tenant?.name || 'Logo'}
                className="max-h-12 max-w-[180px] object-contain"
                style={{ animation: 'fadeIn 0.6s ease-out forwards' }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="h-12 w-12 rounded-xl bg-gradient-to-tr from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] flex items-center justify-center font-bold text-white text-xl">
                  Ψ
                </span>
                <span className="font-serif text-sm tracking-wider mt-1" style={{ color: 'var(--brand-text-color)' }}>{tenant?.name || 'Psi App'}</span>
              </div>
            )}
            {/* Spinner com cores do tenant */}
            <div className="relative h-10 w-10">
              <div
                className="absolute inset-0 rounded-full border-2 animate-spin"
                style={{
                  borderColor: 'transparent',
                  borderTopColor: 'var(--brand-gradient-start, #4F46E5)',
                  borderRightColor: 'var(--brand-gradient-end, #06B6D4)',
                }}
              />
              <div className="absolute inset-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface-hover)] animate-pulse" />
            </div>
          </div>
        )}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // Preview Iframe URL Resolve
  const landingBaseUrl = process.env.NEXT_PUBLIC_LANDING_BASE_URL || '';

  const pageSlugForPreview = page.slug || '_root_';

  const previewIframeUrl = tenant 
    ? `${landingBaseUrl}/p/${tenant.slug}/${pageSlugForPreview}?preview=true&key=${previewKey}`
    : '#';

  // External Preview URL (without preview=true)
  const externalPreviewUrl = tenant 
    ? `${landingBaseUrl}/p/${tenant.slug}/${pageSlugForPreview}`
    : '#';

  return (
    <div className={`fixed inset-0 z-[9999] bg-[var(--brand-bg-color)] flex flex-col h-screen w-screen overflow-hidden`} style={{ animation: 'editorFadeIn 0.3s ease-out forwards' }}>
      <style>{`
        @keyframes editorFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        /* Override hardcoded brand accent to adapt to tenant primary color */
        .text-\\[\\var(--brand-gradient-start)\\] {
          color: var(--brand-gradient-start, var(--brand-gradient-start)) !important;
        }
        .bg-\\[\\var(--brand-gradient-start)\\] {
          background-color: var(--brand-gradient-start, var(--brand-gradient-start)) !important;
        }
        .border-\\[\\var(--brand-gradient-start)\\] {
          border-color: var(--brand-gradient-start, var(--brand-gradient-start)) !important;
        }
        .bg-\\[\\var(--brand-gradient-start)\\]\\/10 {
          background-color: color-mix(in srgb, var(--brand-gradient-start, var(--brand-gradient-start)) 10%, transparent) !important;
        }
        .bg-\\[\\var(--brand-gradient-start)\\]\\/20 {
          background-color: color-mix(in srgb, var(--brand-gradient-start, var(--brand-gradient-start)) 20%, transparent) !important;
        }
        .bg-\\[\\var(--brand-gradient-start)\\]\\/40 {
          background-color: color-mix(in srgb, var(--brand-gradient-start, var(--brand-gradient-start)) 40%, transparent) !important;
        }
        .border-\\[\\var(--brand-gradient-start)\\]\\/20 {
          border-color: color-mix(in srgb, var(--brand-gradient-start, var(--brand-gradient-start)) 20%, transparent) !important;
        }
        .border-\\[\\var(--brand-gradient-start)\\]\\/30 {
          border-color: color-mix(in srgb, var(--brand-gradient-start, var(--brand-gradient-start)) 30%, transparent) !important;
        }
        .accent-\\[\\var(--brand-gradient-start)\\] {
          accent-color: var(--brand-gradient-start, var(--brand-gradient-start)) !important;
        }
        .focus\\:border-\\[\\var(--brand-gradient-start)\\]:focus {
          border-color: var(--brand-gradient-start, var(--brand-gradient-start)) !important;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-gradient-start, var(--brand-gradient-start)) 20%, transparent) !important;
        }
        .focus\\:ring-\\[\\var(--brand-gradient-start)\\]:focus {
          --tw-ring-color: var(--brand-gradient-start, var(--brand-gradient-start)) !important;
        }
      `}</style>
      
      {/* Top action bar */}
      {!sidebarCollapsed && (
        <div className="flex items-center justify-between border-b border-[var(--surface-border)] px-3 py-1.5 shrink-0 brand-toolbar">
          <div className="flex items-center gap-4">
            <a 
              href="/dashboard/captacao" 
              className="p-1.5 rounded-lg glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors flex items-center gap-1.5"
              title="Sair do Editor"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-semibold hidden md:inline">Sair</span>
            </a>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className="p-1.5 rounded-lg glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors flex items-center"
              title={sidebarCollapsed ? 'Expandir Painel' : 'Recolher Painel'}
            >
              {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate leading-none shrink-0 max-w-[180px]">
                {page.title}
              </h1>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(page.id)}
                className="text-[9px] text-slate-600 dark:text-slate-400 font-mono glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] rounded px-1.5 py-0.5 truncate max-w-[140px] cursor-pointer transition-colors shrink-0"
                title="Clique para copiar o ID"
              >
                {page.id}
              </button>
            </div>
          </div>

          {/* Tab Buttons */}
          <div className="flex items-center gap-0.5 glass-sm border border-[var(--surface-border)] p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('layout')}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'layout' ? 'brand-accent shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layout className="h-3 w-3" />
              Conteúdo e Seções
            </button>
            <button
              onClick={() => setActiveTab('theme')}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'theme' ? 'brand-accent shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Palette className="h-3 w-3" />
              Cores e Estilo
            </button>
            <button
              onClick={() => setActiveTab('flow')}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'flow' ? 'brand-accent shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GitBranch className="h-3 w-3" />
              Perguntas da Triagem
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'settings' ? 'brand-accent shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Settings className="h-3 w-3" />
              Configurações
            </button>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-1.5">
            {/* Undo/Redo Buttons */}
            <div className="flex items-center gap-0.5 glass-sm border border-[var(--surface-border)] p-0.5 rounded-lg">
              <button
                onClick={undo}
                disabled={historyRef.current.past.length <= 1}
                className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-all"
                title="Desfazer (Ctrl+Z)"
              >
                <Undo className="h-3 w-3" />
              </button>
              <button
                onClick={redo}
                disabled={historyRef.current.future.length === 0}
                className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-all"
                title="Refazer (Ctrl+Shift+Z / Ctrl+Y)"
              >
                <Redo className="h-3 w-3" />
              </button>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="h-7 w-7 rounded-lg glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all flex items-center justify-center shrink-0"
              title={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>
            {error && (
              <div className="h-9 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs flex items-center gap-1.5 max-w-[240px] animate-fade-in" title={error}>
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}
            <div
              className={`h-7 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center whitespace-nowrap border transition-all ${
                hasUnsavedChanges 
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}
            >
              {hasUnsavedChanges ? 'Pendente' : 'Salvo'}
            </div>
            <button
              type="button"
              onClick={() => window.open(externalPreviewUrl, '_blank')}
              className="h-7 px-2 rounded-lg glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
              title="Abrir Preview em Nova Guia"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="text-[10px] font-semibold hidden lg:inline">Preview</span>
            </button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="brand-accent text-[10px] font-bold uppercase h-7 px-3 flex items-center gap-1.5 cursor-pointer border-none"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      )}

      {/* Split Workspace Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Left Side: Parameters Editor Panel */}
        <div 
          className={`glass-md border-r border-[var(--surface-border)] flex flex-col overflow-y-auto shrink-0 min-h-0 editor-scrollbar ${
            sidebarCollapsed ? 'p-0 w-0 overflow-hidden' : 'p-3'
          }`}
          style={{
            width: sidebarCollapsed ? 0 : `${sidebarWidth}px`,
            transition: isResizing ? 'none' : 'width 300ms ease, padding 300ms ease'
          }}
        >
          
          {/* TAB 1: DESIGN & LAYOUT */}
          {activeTab === 'layout' && (
            <div className="space-y-4">
              
              {/* Tip Banner */}
              <div className="p-3 rounded-xl glass-sm border border-[var(--surface-border)] text-slate-700 dark:text-slate-300 text-[10px] leading-relaxed flex items-start gap-2.5 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-[var(--brand-gradient-start)] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Dica de Design & Destaque</span>
                  Você pode colorir palavras em qualquer <strong>Título</strong> envolvendo-as com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[9px]">*equilíbrio*</code>
                </div>
              </div>
              
              {/* SECTION 1: HERO & IDENTIFICAÇÃO */}
              <div className={`border rounded-xl glass-sm overflow-hidden transition-all duration-200 ${
                openSection === 'hero' ? 'border-[var(--brand-gradient-start)]/20 shadow-md' : 'border-[var(--surface-border)]'
              }`}>
                <button
                  type="button"
                  onClick={() => setOpenSection(openSection === 'hero' ? null : 'hero')}
                  className="w-full px-4 py-3 glass-sm flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider hover:bg-[var(--surface-hover)] transition-colors bg-transparent border-none cursor-pointer"
                >
                  <span className={`flex items-center gap-2 transition-colors ${openSection === 'hero' ? 'text-[var(--brand-gradient-start)] font-extrabold' : 'text-slate-900 dark:text-white'}`}>
                    <Sparkles className="h-3.5 w-3.5 text-yellow-500/70" />
                    1. Início & Apresentação (Hero)
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openSection === 'hero' ? 'rotate-180 text-[var(--brand-gradient-start)]' : ''}`} />
                </button>
                {openSection === 'hero' && (
                  <div className="p-4 space-y-4 border-t border-[var(--surface-border)] animate-in fade-in duration-200">
                    <ImageUploader
                      id="siteConfig.images.hero"
                      label="Foto de Destaque da Hero"
                      value={page.siteConfig.images?.hero || ''}
                      onChange={(url) => {
                        const updated = { ...page.siteConfig, images: { ...page.siteConfig.images, hero: url } };
                        setPage({ ...page, siteConfig: updated });
                        setHasUnsavedChanges(true);
                      }}
                      onFocus={() => setFocusedField('siteConfig.images.hero')}
                      isFocused={focusedField === 'siteConfig.images.hero'}
                      tenantId={page.tenantId}
                      aspectRatio={3 / 4}
                      targetWidth={600}
                      targetHeight={800}
                      hideOnMobile={page.siteConfig.images?.hideHeroOnMobile ?? false}
                      onToggleHideOnMobile={(hidden) => {
                        const updated = { ...page.siteConfig, images: { ...page.siteConfig.images, hideHeroOnMobile: hidden } };
                        setPage({ ...page, siteConfig: updated });
                        setHasUnsavedChanges(true);
                      }}
                    />
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Etiqueta Principal (Badge)</label>
                      <Input
                        type="text"
                        id="hero.badge"
                        className={`brand-input text-xs ${focusedField === 'hero.badge' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={page.dictionary.hero?.badge || ''}
                        onChange={(e) => updateDictField('hero', 'badge', e.target.value)}
                        onFocus={() => setFocusedField('hero.badge')}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título Principal</label>
                        <span className="text-[8px] text-slate-500 font-mono">hero.title</span>
                      </div>
                      <textarea
                        rows={2}
                        id="hero.title"
                        className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'hero.title' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                        value={
                          page.dictionary.hero?.title !== undefined 
                            ? page.dictionary.hero.title 
                            : `${page.dictionary.hero?.titlePart1 || ''} *${page.dictionary.hero?.titlePart2 || ''}*`
                        }
                        onChange={(e) => updateDictField('hero', 'title', e.target.value)}
                        onFocus={() => setFocusedField('hero.title')}
                      />
                      <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                        💡 <strong>Palavras coloridas:</strong> Envolva as palavras com asteriscos. Ex: <code className="text-[var(--brand-gradient-start)] bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">*equilíbrio interior*</code>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição Principal</label>
                      <textarea
                        rows={3}
                        id="hero.description"
                        className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'hero.description' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                        value={page.dictionary.hero?.description || ''}
                        onChange={(e) => updateDictField('hero', 'description', e.target.value)}
                        onFocus={() => setFocusedField('hero.description')}
                      />
                      <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                        💡 <strong>Negrito:</strong> Envolva o texto com dois asteriscos. Ex: <code className="text-slate-900 dark:text-white bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">**texto**</code>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Texto Botão Primário (CTA)</label>
                      <Input
                        type="text"
                        id="hero.ctaPrimary"
                        className={`brand-input text-xs ${focusedField === 'hero.ctaPrimary' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={page.dictionary.hero?.ctaPrimary || ''}
                        onChange={(e) => updateDictField('hero', 'ctaPrimary', e.target.value)}
                        onFocus={() => setFocusedField('hero.ctaPrimary')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Texto Botão Secundário</label>
                      <Input
                        type="text"
                        id="hero.ctaSecondary"
                        className={`brand-input text-xs ${focusedField === 'hero.ctaSecondary' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={page.dictionary.hero?.ctaSecondary || ''}
                        onChange={(e) => updateDictField('hero', 'ctaSecondary', e.target.value)}
                        onFocus={() => setFocusedField('hero.ctaSecondary')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Selo CRP</label>
                      <Input
                        type="text"
                        id="hero.badgeCrp"
                        className={`brand-input text-xs ${focusedField === 'hero.badgeCrp' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={page.dictionary.hero?.badgeCrp || ''}
                        onChange={(e) => updateDictField('hero', 'badgeCrp', e.target.value)}
                        onFocus={() => setFocusedField('hero.badgeCrp')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Selo Abordagem</label>
                      <Input
                        type="text"
                        id="hero.badgeApproach"
                        className={`brand-input text-xs ${focusedField === 'hero.badgeApproach' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={page.dictionary.hero?.badgeApproach || ''}
                        onChange={(e) => updateDictField('hero', 'badgeApproach', e.target.value)}
                        onFocus={() => setFocusedField('hero.badgeApproach')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Selo Sigilo Ético</label>
                      <Input
                        type="text"
                        id="hero.badgeEthic"
                        className={`brand-input text-xs ${focusedField === 'hero.badgeEthic' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={page.dictionary.hero?.badgeEthic || ''}
                        onChange={(e) => updateDictField('hero', 'badgeEthic', e.target.value)}
                        onFocus={() => setFocusedField('hero.badgeEthic')}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Reorderable Sections */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activeSections.map((s: any) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {activeSections.map((section: any, index: number) => (
                      <SortableSectionItem
                        key={section.id}
                        section={section}
                        index={index}
                        openSection={openSection}
                        setOpenSection={setOpenSection}
                        toggleSectionActive={toggleSectionActive}
                        focusedField={focusedField}
                        setFocusedField={setFocusedField}
                        updateLayoutSectionField={updateLayoutSectionField}
                        getSectionNameByType={getSectionNameByType}
                        renderSectionEditorContent={renderSectionEditorContent}
                        page={page}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Add Section Button */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full border-dashed border-[var(--surface-border)] hover:border-slate-400 glass-sm hover:bg-[var(--surface-hover)] text-slate-800 dark:text-white font-bold py-3 text-xs flex items-center justify-center gap-2 rounded-xl transition-all cursor-pointer h-12"
                >
                  <Plus className="h-4 w-4 text-[var(--brand-gradient-start)]" />
                  Adicionar Seção
                </Button>
              </div>

              {/* SECTION 7: RODAPÉ */}
              <div className={`border rounded-xl glass-sm overflow-hidden transition-all duration-200 ${
                openSection === 'footer' ? 'border-[var(--brand-gradient-start)]/20 shadow-md' : 'border-[var(--surface-border)]'
              }`}>
                <button
                  type="button"
                  onClick={() => setOpenSection(openSection === 'footer' ? null : 'footer')}
                  className="w-full px-4 py-3 glass-sm flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider hover:bg-[var(--surface-hover)] transition-colors bg-transparent border-none cursor-pointer"
                >
                  <span className={`flex items-center gap-2 transition-colors ${openSection === 'footer' ? 'text-[var(--brand-gradient-start)] font-extrabold' : 'text-slate-900 dark:text-white'}`}>
                    <Layout className="h-3.5 w-3.5 text-blue-500/70 shrink-0" />
                    7. Rodapé
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openSection === 'footer' ? 'rotate-180 text-[var(--brand-gradient-start)]' : ''}`} />
                </button>
                {openSection === 'footer' && (
                  <div className="p-4 space-y-4 border-t border-[var(--surface-border)] animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição Rodapé</label>
                      <textarea
                        rows={2}
                        id="footer.description"
                        className={`w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none ${focusedField === 'footer.description' ? 'ring-2 ring-blue-500 border-transparent' : 'focus:border-[var(--brand-gradient-start)]'}`}
                        value={page.dictionary.footer?.description || ''}
                        onChange={(e) => updateDictField('footer', 'description', e.target.value)}
                        onFocus={() => setFocusedField('footer.description')}
                      />
                      <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                        💡 <strong>Negrito:</strong> Envolva o texto com dois asteriscos. Ex: <code className="text-slate-900 dark:text-white bg-black/10 dark:bg-black/30 px-1 rounded font-bold font-mono text-[8px]">**texto**</code>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título de Seção Navegação</label>
                      <Input
                        type="text"
                        id="footer.navHeader"
                        className={`brand-input text-xs ${focusedField === 'footer.navHeader' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={page.dictionary.footer?.navHeader || ''}
                        onChange={(e) => updateDictField('footer', 'navHeader', e.target.value)}
                        onFocus={() => setFocusedField('footer.navHeader')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título de Seção Especialidades</label>
                      <Input
                        type="text"
                        id="footer.serviceHeader"
                        className={`brand-input text-xs ${focusedField === 'footer.serviceHeader' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={page.dictionary.footer?.serviceHeader || ''}
                        onChange={(e) => updateDictField('footer', 'serviceHeader', e.target.value)}
                        onFocus={() => setFocusedField('footer.serviceHeader')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Selo CRP</label>
                      <Input
                        type="text"
                        id="footer.crpLabel"
                        className={`brand-input text-xs ${focusedField === 'footer.crpLabel' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={page.dictionary.footer?.crpLabel || ''}
                        onChange={(e) => updateDictField('footer', 'crpLabel', e.target.value)}
                        onFocus={() => setFocusedField('footer.crpLabel')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Direitos Autorais (Copyright)</label>
                      <Input
                        type="text"
                        id="footer.rights"
                        className={`brand-input text-xs ${focusedField === 'footer.rights' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                        value={page.dictionary.footer?.rights || ''}
                        onChange={(e) => updateDictField('footer', 'rights', e.target.value)}
                        onFocus={() => setFocusedField('footer.rights')}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section Templates Modal */}
              <BrandModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="max-w-md">
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2 border-b border-[var(--surface-border)] pb-3">
                    <Sparkles className="h-5 w-5 text-[var(--brand-gradient-start)]" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Modelos de Seção</h3>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400">Adicione novos blocos de layout ou reative seções padrão do site</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {/* Part 1: Layouts livres */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block px-1">Layouts Livres</span>
                      {[
                        {
                          type: 'grid',
                          name: 'Grade de Cards / Serviços',
                          desc: 'Estrutura flexível de 2 a 4 colunas ideal para listar benefícios, especialidades ou diferenciais.',
                          icon: Sparkles
                        },
                        {
                          type: 'two-columns',
                          name: 'Duas Colunas de Texto',
                          desc: 'Duas colunas de texto paralelas para descrever conceitos ou abordagens de forma direta.',
                          icon: Layout
                        },
                        {
                          type: 'text-image',
                          name: 'Texto e Imagem Lateral',
                          desc: 'Um bloco de texto corrido com uma foto de apoio (esquerda/direita) com proporções ajustáveis.',
                          icon: ImageIcon
                        }
                      ].map((tmpl) => {
                        const IconComp = tmpl.icon;
                        return (
                          <div
                            key={tmpl.type}
                            onClick={() => addSection(tmpl.type)}
                            className="p-3 rounded-xl border border-[var(--surface-border)] flex gap-3 items-start transition-all cursor-pointer text-left glass-sm hover:bg-[var(--surface-hover)] border-solid"
                          >
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)]">
                              <IconComp className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block">{tmpl.name}</span>
                              <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-1 leading-normal">{tmpl.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Part 2: Chamadas & CTAs */}
                    <div className="space-y-2 border-t border-[var(--surface-border)] pt-3">
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block px-1">Chamadas & CTAs</span>
                      {[
                        {
                          type: 'cta-banner',
                          name: 'Chamada para Ação (CTA Banner)',
                          desc: 'Bloco de alta conversão para agendamentos. Suporta fundos com gradiente ou cartões elevados.',
                          icon: Play
                        },
                        {
                          type: 'cta-split',
                          name: 'CTA Dividido com Foto',
                          desc: 'Convite direto para triagem emparelhando sua foto com botões de agendamento e WhatsApp.',
                          icon: GitBranch
                        },
                        {
                          type: 'quote',
                          name: 'Frase / Citação de Destaque',
                          desc: 'Exiba frases marcantes de psicólogos renomados ou um manifesto autoral elegante.',
                          icon: HelpCircle
                        }
                      ].map((tmpl) => {
                        const IconComp = tmpl.icon;
                        return (
                          <div
                            key={tmpl.type}
                            onClick={() => addSection(tmpl.type)}
                            className="p-3 rounded-xl border border-[var(--surface-border)] flex gap-3 items-start transition-all cursor-pointer text-left glass-sm hover:bg-[var(--surface-hover)] border-solid"
                          >
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)]">
                              <IconComp className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block">{tmpl.name}</span>
                              <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-1 leading-normal">{tmpl.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Part 2: Reativar seções do template padrão */}
                    {(() => {
                      const currentSections = page?.siteConfig?.sections || defaultSections;
                      const inactiveTemplateSections = currentSections.filter((s: any) => !s.isActive && ['diagnostic', 'about', 'process', 'space', 'faq'].includes(s.type));
                      
                      if (inactiveTemplateSections.length === 0) return null;

                      return (
                        <div className="space-y-2 border-t border-[var(--surface-border)] pt-3">
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block px-1">Seções Originais Inativas (Reativar)</span>
                          {inactiveTemplateSections.map((s: any) => {
                            const iconMap: any = {
                              diagnostic: Sparkles,
                              about: ImageIcon,
                              process: Play,
                              space: MapPin,
                              faq: HelpCircle
                            };
                            const IconComp = iconMap[s.type] || HelpCircle;

                            return (
                              <div
                                key={s.id}
                                onClick={() => addSection(s.type)}
                                className="p-3 rounded-xl border border-emerald-500/20 flex gap-3 items-start transition-all cursor-pointer text-left bg-emerald-500/5 hover:bg-emerald-500/10 border-solid"
                              >
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  <IconComp className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{s.name || getSectionNameByType(s.type)}</span>
                                  <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-1 leading-normal">
                                    Reative a seção {s.name || getSectionNameByType(s.type)} original do seu template de site.
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="flex justify-end pt-2 border-t border-[var(--surface-border)]">
                    <Button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-800 dark:text-white text-xs px-4 h-9 cursor-pointer font-semibold"
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </BrandModal>

            </div>
          )}

          {/* TAB 2: TRIAGEM GRAPH FLOW EDITOR */}
          {activeTab === 'flow' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Estrutura de Etapas</h3>
                <span className="text-[10px] glass-sm border border-[var(--surface-border)] text-[var(--brand-gradient-start)] font-bold px-2 py-0.5 rounded-lg">
                  {page.formFlow.nodes.length} blocos
                </span>
              </div>

              {/* Node Spawner Toolbar */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Adicionar Bloco de Coleta</span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleAddNode('texto')}
                    className="cursor-pointer h-9 text-[10px] font-semibold glass-sm border border-[var(--surface-border)] hover:bg-[var(--surface-hover)] text-slate-800 dark:text-white flex items-center justify-start gap-1"
                  >
                    <Plus className="h-3 w-3 text-[var(--brand-gradient-start)]" />
                    Texto Curto
                  </Button>
                  <Button
                    onClick={() => handleAddNode('paragrafo')}
                    className="cursor-pointer h-9 text-[10px] font-semibold glass-sm border border-[var(--surface-border)] hover:bg-[var(--surface-hover)] text-slate-800 dark:text-white flex items-center justify-start gap-1"
                  >
                    <Plus className="h-3 w-3 text-[var(--brand-gradient-start)]" />
                    Parágrafo Longo
                  </Button>
                  <Button
                    onClick={() => handleAddNode('seletor')}
                    className="cursor-pointer h-9 text-[10px] font-semibold glass-sm border border-[var(--surface-border)] hover:bg-[var(--surface-hover)] text-slate-800 dark:text-white flex items-center justify-start gap-1"
                  >
                    <Plus className="h-3 w-3 text-[var(--brand-gradient-start)]" />
                    Seletor Múltiplo
                  </Button>
                </div>
              </div>

              {/* Selected Node Editor Form */}
              {selectedNode ? (
                <div className="space-y-4 border-t border-[var(--surface-border)] pt-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-900 dark:text-white">Editar Bloco: {selectedNode.id}</span>
                    <button
                      onClick={() => setSelectedNodeId(null)}
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      Limpar Seleção
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Pergunta / Título do Campo</label>
                      <Input
                        type="text"
                        className="brand-input"
                        value={selectedNode.data.title || ''}
                        onChange={(e) => updateSelectedNodeData('title', e.target.value)}
                      />
                    </div>

                    {selectedNode.type !== 'start' && selectedNode.type !== 'contrato' && selectedNode.type !== 'maioridade' && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Placeholder de Escrita</label>
                        <Input
                          type="text"
                          className="brand-input"
                          value={selectedNode.data.placeholder || ''}
                          onChange={(e) => updateSelectedNodeData('placeholder', e.target.value)}
                        />
                      </div>
                    )}

                    {/* Checkbox template resolver for contracts template node */}
                    {selectedNode.type === 'contrato' && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Modelo de Contrato Clínico</label>
                        <select
                          value={selectedNode.data.contractTemplateId || ''}
                          onChange={(e) => updateSelectedNodeData('contractTemplateId', e.target.value || undefined)}
                          className="w-full h-10 px-3 rounded-xl brand-input text-slate-900 dark:text-white text-xs outline-none focus:border-[var(--brand-gradient-start)]"
                        >
                          <option value="">-- Selecionar modelo --</option>
                          {contracts.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Options list editor for selector node */}
                    {selectedNode.type === 'seletor' && (
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider block">Opções de Seleção</label>
                        <div className="space-y-2">
                          {(selectedNode.data.options || []).map((opt: any, idx: number) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Input
                                type="text"
                                className="brand-input flex-1 text-xs h-8"
                                value={opt.label}
                                onChange={(e) => {
                                  const updatedOptions = [...(selectedNode.data.options || [])];
                                  updatedOptions[idx] = { ...opt, label: e.target.value, value: e.target.value.toLowerCase() };
                                  updateSelectedNodeData('options', updatedOptions);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedOptions = (selectedNode.data.options || []).filter((_: any, oIdx: number) => oIdx !== idx);
                                  updateSelectedNodeData('options', updatedOptions);
                                }}
                                className="text-slate-500 hover:text-red-500 dark:hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            onClick={() => {
                              const updatedOptions = [...(selectedNode.data.options || []), { label: `Opção ${(selectedNode.data.options || []).length + 1}`, value: `op_${Math.random().toString(36).substring(2, 5)}` }];
                              updateSelectedNodeData('options', updatedOptions);
                            }}
                            className="w-full cursor-pointer h-7 text-[10px] glass-sm border border-[var(--surface-border)] text-slate-800 dark:text-white"
                          >
                            + Adicionar Opção
                          </Button>
                        </div>
                      </div>
                    )}

                    <label className="flex items-center gap-2 pt-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedNode.data.isRequired ?? true}
                        onChange={(e) => updateSelectedNodeData('isRequired', e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-[var(--surface-border)] text-[var(--brand-gradient-start)]"
                      />
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Resposta Obrigatória</span>
                    </label>

                    {selectedNode.type !== 'start' && (
                      <div className="pt-4">
                        <Button
                          onClick={() => handleDeleteNode(selectedNode.id)}
                          className="w-full cursor-pointer h-9 text-xs font-bold uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25 hover:bg-red-500/20"
                        >
                          Excluir Etapa
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] text-center text-xs text-slate-600 dark:text-slate-400 italic">
                  Selecione um bloco no fluxograma ao lado para editar seus dados detalhadamente.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: THEME, COLORS & TYPOGRAPHY */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div className="border-b border-[var(--surface-border)] pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Cores e Estilo Visual</h3>
                <p className="text-[10px] text-slate-600 dark:text-slate-400">Personalize as cores e fontes que combinam com seu estilo de atendimento.</p>
              </div>

              {/* Seção 1: Cores */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[var(--brand-gradient-start)] uppercase tracking-wider block">🎨 Paleta de Cores</span>
                {[
                  { key: 'primaryStart', label: 'Cor Principal (Início do Gradiente)', default: 'var(--brand-gradient-start)' },
                  { key: 'primaryEnd', label: 'Cor Secundária (Fim do Gradiente)', default: '#AA5533' },
                  { key: 'contrast', label: 'Cor dos Botões de Agendamento', default: '#FFFFFF' },
                  { key: 'bgDark', label: 'Cor de Fundo da Página', default: '#09090B' },
                  { key: 'textDark', label: 'Cor dos Textos Gerais', default: '#F4F4F5' },
                ].map((colorOpt) => {
                  const currentValue = page.siteConfig.theme?.colors?.[colorOpt.key] || colorOpt.default;
                  return (
                    <div key={colorOpt.key} className="space-y-1 glass-sm p-3 rounded-xl border border-[var(--surface-border)]">
                      <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider block">
                        {colorOpt.label}
                      </label>
                      <div className="flex items-center gap-2">
                        {/* Seletor Visual */}
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[var(--surface-border)] shrink-0 cursor-pointer">
                          <input
                            type="color"
                            value={currentValue}
                            onChange={(e) => {
                              const updatedColors = {
                                ...(page.siteConfig.theme?.colors || {}),
                                [colorOpt.key]: e.target.value
                              };
                              setPage({
                                ...page,
                                siteConfig: {
                                  ...page.siteConfig,
                                  theme: {
                                    ...(page.siteConfig.theme || {}),
                                    colors: updatedColors
                                  }
                                }
                              });
                              setHasUnsavedChanges(true);
                            }}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          />
                          <div 
                            className="w-full h-full rounded-lg" 
                            style={{ backgroundColor: currentValue }}
                          />
                        </div>
                        {/* Input Texto Hexadecimal */}
                        <Input
                          type="text"
                          className="brand-input text-xs flex-1 uppercase"
                          value={currentValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updatedColors = {
                              ...(page.siteConfig.theme?.colors || {}),
                              [colorOpt.key]: val
                            };
                            setPage({
                              ...page,
                              siteConfig: {
                                ...page.siteConfig,
                                theme: {
                                  ...(page.siteConfig.theme || {}),
                                  colors: updatedColors
                                }
                              }
                            });
                            setHasUnsavedChanges(true);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Seção 2: Fontes */}
              <div className="space-y-4 border-t border-[var(--surface-border)] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--brand-gradient-start)] uppercase tracking-wider block">🔤 Tipografia e Fontes</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFontTarget('heading');
                      setIsCustomFontModalOpen(true);
                    }}
                    className="text-[10px] text-[var(--brand-gradient-start)] hover:text-slate-900 dark:hover:text-white font-bold flex items-center gap-1 cursor-pointer transition-colors glass-sm px-2.5 py-1 rounded-lg border border-[var(--surface-border)]"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Subir Fonte (.ttf/.otf)</span>
                  </button>
                </div>

                {/* FontPicker Títulos Grandes */}
                <FontPicker
                  label="Fonte dos Títulos Grandes"
                  value={page.siteConfig.theme?.typography?.headingFont || 'Playfair Display'}
                  type="heading"
                  customFontName={page.siteConfig.theme?.typography?.customHeadingFontName}
                  onChange={(fontName) => {
                    const updatedTypography = {
                      ...(page.siteConfig.theme?.typography || {}),
                      headingFont: fontName
                    };
                    setPage({
                      ...page,
                      siteConfig: {
                        ...page.siteConfig,
                        theme: {
                          ...(page.siteConfig.theme || {}),
                          typography: updatedTypography
                        }
                      }
                    });
                    setHasUnsavedChanges(true);
                  }}
                  onOpenCustomFontModal={() => {
                    setCustomFontTarget('heading');
                    setIsCustomFontModalOpen(true);
                  }}
                />

                {/* Heading Weight / Espessura do Texto */}
                <div className="space-y-1 glass-sm p-3 rounded-xl border border-[var(--surface-border)]">
                  <label className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider block">Espessura / Destaque dos Títulos</label>
                  <select
                    value={page.siteConfig.theme?.typography?.headingWeight || '400'}
                    onChange={(e) => {
                      const updatedTypography = {
                        ...(page.siteConfig.theme?.typography || {}),
                        headingWeight: e.target.value
                      };
                      setPage({
                        ...page,
                        siteConfig: {
                          ...page.siteConfig,
                          theme: {
                            ...(page.siteConfig.theme || {}),
                            typography: updatedTypography
                          }
                        }
                      });
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full text-xs p-2.5 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors cursor-pointer"
                  >
                    {[
                      { value: '300', label: '🪶 Fino / Delicado (Light)' },
                      { value: '400', label: '📄 Normal / Elegante (Regular - Padrão)' },
                      { value: '500', label: '📝 Médio (Medium)' },
                      { value: '600', label: '🖊️ Semi-Negrito (Semi-Bold)' },
                      { value: '700', label: '🖋️ Negrito Marcante (Bold)' },
                      { value: '800', label: '💥 Extra-Negrito (Extra Bold)' }
                    ].map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* FontPicker Parágrafos e Textos */}
                <FontPicker
                  label="Fonte dos Parágrafos e Textos"
                  value={page.siteConfig.theme?.typography?.bodyFont || 'Inter'}
                  type="body"
                  customFontName={page.siteConfig.theme?.typography?.customBodyFontName}
                  onChange={(fontName) => {
                    const updatedTypography = {
                      ...(page.siteConfig.theme?.typography || {}),
                      bodyFont: fontName
                    };
                    setPage({
                      ...page,
                      siteConfig: {
                        ...page.siteConfig,
                        theme: {
                          ...(page.siteConfig.theme || {}),
                          typography: updatedTypography
                        }
                      }
                    });
                    setHasUnsavedChanges(true);
                  }}
                  onOpenCustomFontModal={() => {
                    setCustomFontTarget('body');
                    setIsCustomFontModalOpen(true);
                  }}
                />

                {/* Custom uploaded font badges if present */}
                {(page.siteConfig.theme?.typography?.customHeadingFontName || page.siteConfig.theme?.typography?.customBodyFontName) && (
                  <div className="space-y-2 glass-sm p-3 rounded-xl border border-[var(--surface-border)]">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Fontes Personalizadas Ativas</span>
                    {page.siteConfig.theme?.typography?.customHeadingFontName && (
                      <div className="flex items-center justify-between p-2 rounded-lg glass-sm border border-[var(--surface-border)] text-xs text-slate-900 dark:text-white">
                        <span>📌 Títulos: <strong>{page.siteConfig.theme.typography.customHeadingFontName}</strong></span>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedTypography = {
                              ...(page.siteConfig.theme?.typography || {}),
                              customHeadingFontUrl: undefined,
                              customHeadingFontName: undefined,
                              headingFont: 'Playfair Display'
                            };
                            setPage({ ...page, siteConfig: { ...page.siteConfig, theme: { ...(page.siteConfig.theme || {}), typography: updatedTypography } } });
                            setHasUnsavedChanges(true);
                          }}
                          className="text-[9px] text-red-500 dark:text-red-400 hover:underline font-semibold cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                    {page.siteConfig.theme?.typography?.customBodyFontName && (
                      <div className="flex items-center justify-between p-2 rounded-lg glass-sm border border-[var(--surface-border)] text-xs text-slate-900 dark:text-white">
                        <span>📄 Textos: <strong>{page.siteConfig.theme.typography.customBodyFontName}</strong></span>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedTypography = {
                              ...(page.siteConfig.theme?.typography || {}),
                              customBodyFontUrl: undefined,
                              customBodyFontName: undefined,
                              bodyFont: 'Inter'
                            };
                            setPage({ ...page, siteConfig: { ...page.siteConfig, theme: { ...(page.siteConfig.theme || {}), typography: updatedTypography } } });
                            setHasUnsavedChanges(true);
                          }}
                          className="text-[9px] text-red-500 dark:text-red-400 hover:underline font-semibold cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Font Live Preview Box */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Pré-visualização do Estilo das Fontes
                  </span>
                  <div className="p-4 rounded-xl glass-sm border border-[var(--surface-border)] space-y-2 select-none shadow-inner">
                    <div>
                      <span className="text-[9px] text-slate-500 font-semibold block uppercase">Título Grande:</span>
                      <h4 
                        className="text-base text-slate-900 dark:text-white truncate"
                        style={{
                          fontFamily: `'${page.siteConfig.theme?.typography?.headingFont || 'Playfair Display'}', serif`,
                          fontWeight: page.siteConfig.theme?.typography?.headingWeight || '400'
                        }}
                      >
                        {page.title || 'Dra. Geovanna Santos'}
                      </h4>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-semibold block uppercase">Parágrafo do Site:</span>
                      <p 
                        className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-light"
                        style={{
                          fontFamily: `'${page.siteConfig.theme?.typography?.bodyFont || 'Inter'}', sans-serif`
                        }}
                      >
                        Um espaço acolhedor e ético focado no seu bem-estar emocional.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

                {/* Seção 3: Identidade Visual */}
                <div className="space-y-4 border-t border-[var(--surface-border)] pt-4">
                  <span className="text-[10px] font-bold text-[var(--brand-gradient-start)] uppercase tracking-wider block">🖼️ Identidade Visual</span>

                  {/* Logotipo */}
                  <ImageUploader
                    id="siteConfig.logoUrl"
                    label="Logotipo da Página"
                    value={page.siteConfig.logoUrl || ''}
                    onChange={(url) => {
                      setPage({
                        ...page,
                        siteConfig: {
                          ...page.siteConfig,
                          logoUrl: url,
                        }
                      });
                      setHasUnsavedChanges(true);
                    }}
                    onFocus={() => setFocusedField('siteConfig.logoUrl')}
                    isFocused={focusedField === 'siteConfig.logoUrl'}
                    tenantId={page.tenantId}
                    aspectRatio={undefined}
                    targetWidth={400}
                    targetHeight={150}
                    allowTransparency={true}
                  />

                  {/* Favicon */}
                  <ImageUploader
                    id="siteConfig.faviconUrl"
                    label="Ícone da Aba (Favicon)"
                    value={page.siteConfig.faviconUrl || ''}
                    onChange={(url) => {
                      setPage({
                        ...page,
                        siteConfig: {
                          ...page.siteConfig,
                          faviconUrl: url,
                        }
                      });
                      setHasUnsavedChanges(true);
                    }}
                    onFocus={() => setFocusedField('siteConfig.faviconUrl')}
                    isFocused={focusedField === 'siteConfig.faviconUrl'}
                    tenantId={page.tenantId}
                    aspectRatio={1 / 1}
                    targetWidth={64}
                    targetHeight={64}
                    allowTransparency={true}
                  />
                </div>
            </div>
          )}

          {/* TAB 3: CONFIGURATIONS & SEO */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-[var(--surface-border)] pb-2">Configurações Gerais & SEO</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between glass-sm p-4 rounded-xl border border-[var(--surface-border)]">
                  <div>
                    <label className="text-xs text-slate-900 dark:text-white font-bold uppercase tracking-wider block">Status da Página</label>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400">Se a página está ativa ou pausada para acesso público.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage({ ...page, isActive: !page.isActive })}
                    className={`h-8 px-3 rounded-lg text-xs font-bold uppercase cursor-pointer transition-all ${
                      page.isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'glass-sm text-slate-500 border border-[var(--surface-border)]'
                    }`}
                  >
                    {page.isActive ? 'Ativa' : 'Pausada'}
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Nome da Psicóloga / Título da Página</label>
                  <Input
                    type="text"
                    className="brand-input"
                    placeholder="Ex: Dra. Geovanna Santos"
                    value={page.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setPage({
                        ...page,
                        title: newTitle,
                        siteConfig: {
                          ...page.siteConfig,
                          professional: {
                            ...page.siteConfig.professional,
                            name: newTitle,
                          },
                          logoConfig: {
                            ...page.siteConfig.logoConfig,
                            text: newTitle,
                          }
                        }
                      });
                      setHasUnsavedChanges(true);
                    }}
                  />
                  <p className="text-[10px] text-slate-500">
                    O nome definido aqui é exibido nos títulos do site, no logotipo e na aba do navegador.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider block">
                    Endereço da Página no seu site
                  </label>
                  
                  <div className="flex items-center">
                    <span className="h-10 px-3 flex items-center glass-sm border border-r-0 border-[var(--surface-border)] rounded-l-xl text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-white/5 truncate max-w-[240px]">
                      https://{tenant?.domain || `${tenant?.slug || 'site'}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app'}`}/
                    </span>
                    <Input
                      type="text"
                      className="brand-input rounded-l-none text-xs font-mono"
                      placeholder="ex: terapia (ou deixe em branco)"
                      value={page.slug || ''}
                      onChange={(e) => {
                        const cleanVal = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setPage({ ...page, slug: cleanVal });
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                    💡 <strong>Deixe em branco</strong> para que esta seja a <strong>Página Principal (Home)</strong> do seu site, ou digite o nome que deseja usar no endereço (ex: terapia, consultas).
                  </p>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-[var(--surface-border)] pt-4 pb-2">🔍 SEO & Mecanismos de Busca</h3>
                
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Título no Google (Meta Title)</label>
                  <Input
                    type="text"
                    className="brand-input"
                    placeholder={`${page.title || 'Dra. Geovanna Santos'} | Atendimento Psicológico`}
                    value={page.seoConfig.metaTitle || ''}
                    onChange={(e) => {
                      setPage({ ...page, seoConfig: { ...page.seoConfig, metaTitle: e.target.value } });
                      setHasUnsavedChanges(true);
                    }}
                  />
                  <p className="text-[10px] text-slate-500">
                    Título que aparece nos resultados de busca do Google e ao compartilhar o link no WhatsApp.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Descrição no Google (Meta Description)</label>
                  <textarea
                    rows={3}
                    className="w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none focus:border-[var(--brand-gradient-start)]"
                    placeholder={`Agende sua consulta de psicologia com ${page.title || 'Dra. Geovanna Santos'}.`}
                    value={page.seoConfig.metaDescription || ''}
                    onChange={(e) => {
                      setPage({ ...page, seoConfig: { ...page.seoConfig, metaDescription: e.target.value } });
                      setHasUnsavedChanges(true);
                    }}
                  />
                  <p className="text-[10px] text-slate-500">
                    Resumo do site exibido logo abaixo do título nas pesquisas do Google.
                  </p>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-[var(--surface-border)] pt-4 pb-2">Redirecionamento Pós-Triagem</h3>
                
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Mensagem Padrão Whatsapp</label>
                  <textarea
                    rows={3}
                    className="w-full text-xs p-3 brand-input rounded-xl outline-none text-slate-900 dark:text-white transition-colors resize-none focus:border-[var(--brand-gradient-start)]"
                    placeholder="Olá, preenchi a triagem pelo site. Meu nome é {{nome}}."
                    value={page.formFlow.settings?.whatsappMessageTemplate || ''}
                    onChange={(e) => {
                      const updatedSettings = { ...page.formFlow.settings, whatsappMessageTemplate: e.target.value };
                      setPage({ ...page, formFlow: { ...page.formFlow, settings: updatedSettings } });
                    }}
                  />
                  <p className="text-[9px] text-slate-500 pt-0.5 leading-relaxed">
                    Você pode usar o marcador <code className="text-slate-600 dark:text-slate-350 font-bold">{"{{nome}}"}</code> para inserir dinamicamente a resposta digitada pelo paciente.
                  </p>
                </div>

                {/* Danger Zone: Delete Page */}
                <div className="pt-6 border-t border-red-500/20 space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir esta Página
                    </span>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Esta ação exclui permanentemente esta página de captação e todas as suas configurações de forma irreversível.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 text-red-400 text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Excluir Página Definitivamente</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resize Handle — no toggle button here anymore */}
        {!sidebarCollapsed && (
          <div 
            onMouseDown={startResizing}
            className="w-2 hover:w-3 cursor-col-resize brand-sidebar border-x border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)]/20 active:border-[var(--brand-gradient-start)]/40 transition-all self-stretch h-full shrink-0 select-none relative group flex items-center justify-center"
          >
            {/* Visual pill indicator */}
            <div className="w-[2px] h-10 bg-slate-300 dark:bg-white/10 group-hover:bg-[var(--brand-gradient-start)]/60 group-active:bg-[var(--brand-gradient-start)] rounded-full transition-colors" />
          </div>
        )}

        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl glass-sm border border-[var(--surface-border)] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all z-50"
            title="Expandir Painel"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Right Side: Split Canvas workspace */}
        <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 bg-[var(--brand-bg-color)]">
          {/* Overlay to capture mouse events when dragging over iframe */}
          {isResizing && (
            <div className="absolute inset-0 z-50 cursor-col-resize bg-transparent" />
          )}
          
          {/* TAB 1 & 3: IFRAME LIVE PREVIEW PREVIEW */}
          {activeTab !== 'flow' && (
            <div className="w-full h-full flex flex-col relative">
              <div className="h-10 border-b border-[var(--surface-border)] brand-toolbar flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-700 dark:text-slate-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
                    <Eye className="h-3 w-3 text-[var(--brand-gradient-start)]" />
                    Visualização
                  </span>
                  {tenant && (
                    <span className="text-[9px] font-mono text-slate-500 hidden sm:inline border-l border-[var(--surface-border)] pl-2">
                      {tenant.slug}/{page.slug}
                    </span>
                  )}
                </div>

                {/* Preview Actions Bar */}
                <div className="flex items-center gap-1.5">
                  {/* Device Selector Switcher */}
                  <div className="flex items-center gap-0.5 glass-sm border border-[var(--surface-border)] p-0.5 rounded-lg">
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        previewMode === 'desktop'
                          ? 'bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Visualização Desktop"
                    >
                      <Monitor className="h-3 w-3" />
                      Desktop
                    </button>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        previewMode === 'mobile'
                          ? 'bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Visualização Mobile"
                    >
                      <Smartphone className="h-3 w-3" />
                      Mobile
                    </button>
                  </div>

                  {/* Expand / Collapse Actions & Theme Toggle */}
                  <div className="flex items-center gap-0.5 glass-sm border border-[var(--surface-border)] p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[var(--surface-hover)] cursor-pointer transition-all flex items-center justify-center"
                      title={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
                    >
                      {theme === 'dark' ? (
                        <Sun className="h-3.5 w-3.5" />
                      ) : (
                        <Moon className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[var(--surface-hover)] cursor-pointer transition-all flex items-center justify-center"
                      title={sidebarCollapsed ? "Minimizar Preview (Exibir Editor)" : "Expandir Preview (Ocultar Editor)"}
                    >
                      {sidebarCollapsed ? (
                        <Minimize2 className="h-3.5 w-3.5" />
                      ) : (
                        <Maximize2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div 
                className="flex-1 w-full bg-[var(--brand-bg-color)] overflow-y-auto flex items-center justify-center p-6 relative custom-scrollbar"
                style={{
                  backgroundImage: 'radial-gradient(var(--surface-border) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              >
                {previewMode === 'desktop' ? (
                  <iframe
                    ref={iframeRef}
                    onLoad={handleIframeLoad}
                    src={previewIframeUrl}
                    className="w-full h-full border border-[var(--surface-border)] bg-white dark:bg-[#09090B] rounded-lg shadow-inner"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="relative w-[375px] h-[760px] max-h-full bg-black border-[10px] border-zinc-800 rounded-[46px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden transition-all duration-300 ring-1 ring-white/10 shrink-0">
                    {/* Notch overlay — sits on top of the iframe, doesn't shift layout */}
                    <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pointer-events-none">
                      <div className="w-28 h-6 bg-black rounded-b-2xl flex items-center justify-center">
                        <div className="w-12 h-1 bg-zinc-800 rounded-full" />
                      </div>
                    </div>
                    {/* Iframe fills entire inner device area */}
                    <iframe
                      ref={iframeRef}
                      onLoad={handleIframeLoad}
                      src={previewIframeUrl}
                      className="w-full h-full border-0 bg-white"
                      style={{ display: 'block' }}
                      sandbox="allow-scripts allow-same-origin"
                    />
                    {/* Home indicator bar */}
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-700 rounded-full z-20 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REACT FLOW WORKSPACE */}
          {activeTab === 'flow' && (
            <div className="w-full h-full relative" style={{ height: '100%' }}>
              <div className="absolute top-4 left-4 z-10 glass-md border border-[var(--surface-border)] rounded-xl p-3 max-w-xs space-y-1 shadow-xl">
                <h4 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">Editor de Fluxograma</h4>
                <p className="text-[9px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Crie blocos e arraste as conexões do lado direito (Handles vermelhos) para o lado esquerdo de outros blocos para definir a ordem das perguntas.
                </p>
              </div>

              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                fitView
                className="bg-[#0c0c0e]"
              >
                <Controls />
                <Background color="#ffffff" gap={16} className="opacity-[0.03]" />
              </ReactFlow>
            </div>
          )}
        </div>
      </div>

      {/* Custom Font Upload Modal Popup */}
      <BrandModal
        isOpen={isCustomFontModalOpen}
        onClose={() => setIsCustomFontModalOpen(false)}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-left p-1">
          <div className="flex items-center gap-2.5 border-b border-[var(--surface-border)] pb-3">
            <div className="p-2 rounded-lg bg-[var(--brand-gradient-start)]/10 border border-[var(--brand-gradient-start)]/20 text-[var(--brand-gradient-start)]">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Subir Fonte Personalizada</h3>
              <p className="text-[10px] text-slate-600 dark:text-slate-400">Envie arquivos de fonte própria (.ttf ou .otf) para o seu site</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Onde você deseja aplicar essa fonte?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCustomFontTarget('heading')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                    customFontTarget === 'heading'
                      ? 'bg-[var(--brand-gradient-start)]/15 border-[var(--brand-gradient-start)] text-slate-900 dark:text-white shadow-md'
                      : 'glass-sm border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block">📌 Títulos Grandes</span>
                  <span className="text-[10px] leading-tight opacity-80">Aplica nos títulos e cabeçalhos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomFontTarget('body')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                    customFontTarget === 'body'
                      ? 'bg-[var(--brand-gradient-start)]/15 border-[var(--brand-gradient-start)] text-slate-900 dark:text-white shadow-md'
                      : 'glass-sm border-[var(--surface-border)] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block">📄 Parágrafos e Textos</span>
                  <span className="text-[10px] leading-tight opacity-80">Aplica nos textos e descrições</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]">
              <input
                type="file"
                id="custom-font-file-input"
                className="hidden"
                accept=".woff2,.woff,.ttf,.otf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadCustomFont(file);
                }}
              />

              <button
                type="button"
                disabled={fontUploading}
                onClick={() => document.getElementById('custom-font-file-input')?.click()}
                className="w-full py-3 px-4 rounded-xl glass-sm border border-[var(--surface-border)] hover:border-[var(--brand-gradient-start)] text-slate-900 dark:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                {fontUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-gradient-start)]" />
                    <span>Validando e enviando arquivo...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-[var(--brand-gradient-start)]" />
                    <span>Selecionar Arquivo de Fonte (.ttf / .otf)</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-500 text-center">
                Formatos aceitos: TrueType (.ttf), OpenType (.otf), WOFF e WOFF2 (Máximo 5MB).
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-[var(--surface-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCustomFontModalOpen(false)}
              className="text-xs h-9 px-4 cursor-pointer"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </BrandModal>

      {/* Delete Page Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteCurrentPage}
        title="Excluir Página de Captação"
        description={`Tem certeza que deseja excluir permanentemente a página "${page?.title || ''}"? Esta ação é irreversível.`}
        confirmText={deleting ? "Excluindo..." : "Excluir Definitivamente"}
        cancelText="Cancelar"
        variant="danger"
      />

    </div>
  );
}

// Simple fallback spinner for component loader since loading states are handled cleanly
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand-gradient-start)]" />
);
