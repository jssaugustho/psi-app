'use client';

import React, { useState, useEffect, useCallback, useMemo, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBrand } from '@/context/BrandContext';
import { api, CapturePage } from '@/lib/api';
import { Card, Button, Input, BrandModal, ConfirmModal } from '@psi/ui';
import { MediaLibraryModal } from '@/components/media-library-modal';
import { LogoOptionModal } from '@/components/logo-option-modal';
import { LogoBuilderModal } from '@/components/logo-builder-modal';
import { FontPicker } from '@/components/FontPicker';
import { TypeformPreviewModal } from '@/components/TypeformPreviewModal';
import {
  ArrowLeft, Save, Sparkles, AlertCircle, Layout, GitBranch, Settings, Palette,
  Plus, Trash2, ExternalLink, RefreshCw, Eye, HelpCircle, Check, Play, Maximize2, Minimize2, Globe,
  Monitor, Smartphone, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Undo, Redo,
  Upload, Image as ImageIcon, Loader2, MapPin, ArrowUp, ArrowDown, GripVertical,
  PanelLeft, PanelLeftClose, Sun, Moon, User, Phone, Mail, CheckSquare, FileText, MessageSquare,
  ShieldCheck, Sliders, AlignLeft, X
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
  type EdgeChange,
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
        resolution={{
          width: targetWidth || 800,
          height: targetHeight || (aspectRatio ? Math.round((targetWidth || 800) / aspectRatio) : 800)
        }}
        type={allowTransparency || isLogo ? 'logotipo' : 'imagem'}
        onSelectImage={(asset: any) => {
          const url = typeof asset === 'string' ? asset : (asset?.url || asset);
          onChange(url);
          setLibraryOpen(false);
        }}
        uploadType={allowTransparency ? (id?.includes('favicon') ? 'icon' : 'logo') : 'asset'}
        usageContext={id}
      />
    </div>
  );
};

// React Flow Custom Node Compon// Helper to get Typebot block configuration & theme
const getNodeConfig = (type: string) => {
  switch (type) {
    case 'start':
      return {
        label: 'Início do Formulário',
        accentBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        icon: Sparkles,
        isStrictRequired: true,
      };
    case 'nome':
      return {
        label: 'Nome Completo',
        accentBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        icon: User,
        isStrictRequired: true,
      };
    case 'celular':
    case 'contato':
      return {
        label: 'WhatsApp / Celular',
        accentBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        icon: Phone,
        isStrictRequired: true,
      };
    case 'maioridade':
      return {
        label: 'Validação de Maioridade',
        accentBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        icon: ShieldCheck,
        isStrictRequired: true,
      };
    case 'email':
      return {
        label: 'E-mail de Contato',
        accentBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
        icon: Mail,
        isStrictRequired: false,
      };
    case 'cpf':
      return {
        label: 'CPF do Paciente',
        accentBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        icon: Sliders,
        isStrictRequired: false,
      };
    case 'contrato':
      return {
        label: 'Termo de Consentimento / Contrato',
        accentBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        icon: FileText,
        isStrictRequired: false,
      };
    case 'emergencia':
      return {
        label: 'Contato de Emergência',
        accentBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
        icon: AlertCircle,
        isStrictRequired: false,
      };
    case 'seletor':
    case 'escolha':
    case 'escolha_multipla':
      return {
        label: 'Escolha de Opção',
        accentBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        icon: CheckSquare,
        isStrictRequired: false,
      };
    case 'paragrafo':
      return {
        label: 'Parágrafo Longo',
        accentBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
        icon: AlignLeft,
        isStrictRequired: false,
      };
    default:
      return {
        label: 'Texto Curto',
        accentBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        icon: MessageSquare,
        isStrictRequired: false,
      };
  }
};

// React Flow Custom Node Components (Estilo Typebot)
const CustomStartNode = ({ data }: any) => {
  const config = getNodeConfig('start');
  const IconComp = config.icon;
  const isSelected = data.isSelected;

  return (
    <div 
      className={`w-[320px] rounded-2xl border transition-all duration-200 shadow-xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-slate-100 relative ${
        isSelected 
          ? 'border-purple-500 ring-2 ring-purple-500/30' 
          : 'border-slate-200/90 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200/80 dark:border-zinc-800/80 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 border ${config.accentBg}`}>
            <IconComp className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {config.label}
          </span>
        </div>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
          Início
        </span>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            Mensagem de Boas-vindas
          </label>
          <input
            type="text"
            className="nodrag nopan w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            value={data.node?.data?.title || data.title || ''}
            onChange={(e) => data.onUpdate('title', e.target.value)}
            placeholder="Ex: Bem-vinda(o) ao Atendimento Psicológico"
          />
        </div>

        <div className="space-y-1">
          <input
            type="text"
            className="nodrag nopan w-full text-[11px] px-3 py-1.5 rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200/70 dark:border-zinc-800/70 text-slate-600 dark:text-slate-300 placeholder:text-slate-400/80 outline-none focus:border-purple-500 transition-all"
            placeholder="Subtítulo ou mensagem de apoio (opcional)..."
            value={data.node?.data?.subtitle || ''}
            onChange={(e) => data.onUpdate('subtitle', e.target.value)}
          />
        </div>

        {/* CTA Button Label */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-medium">Botão Inicial:</span>
          <input
            type="text"
            className="nodrag nopan text-right text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-900 border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 text-purple-600 dark:text-purple-400 focus:border-purple-500 outline-none w-28"
            placeholder="Iniciar ➔"
            value={data.node?.data?.buttonText || ''}
            onChange={(e) => data.onUpdate('buttonText', e.target.value)}
          />
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="!w-3.5 !h-3.5 !bg-emerald-500 border-2 border-white dark:border-zinc-950 shadow-md -right-[7px]"
      />
    </div>
  );
};

const CustomStepNode = ({ data }: any) => {
  const isSelected = data.isSelected;
  const nodeType = data.node?.type || 'texto';
  const config = getNodeConfig(nodeType);
  const IconComp = config.icon;
  const isStrictRequired = config.isStrictRequired;

  return (
    <div 
      className={`w-[320px] rounded-2xl border transition-all duration-200 shadow-xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-slate-100 relative ${
        isSelected 
          ? 'border-purple-500 ring-2 ring-purple-500/30' 
          : 'border-slate-200/90 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!w-3.5 !h-3.5 !bg-purple-600 border-2 border-white dark:border-zinc-950 shadow-md -left-[7px]"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200/80 dark:border-zinc-800/80 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 border ${config.accentBg}`}>
            <IconComp className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isStrictRequired ? (
            <span 
              className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 uppercase tracking-wide flex items-center gap-1 select-none"
              title="Este campo é obrigatório na triagem clínica e não pode ser excluído"
            >
              <ShieldCheck className="w-3 h-3" />
              Obrigatório
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); data.onDelete(data.node.id); }}
              className="nodrag p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Excluir Etapa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-purple-500" />
            Pergunta da Etapa
          </label>
          <input
            type="text"
            className="nodrag nopan w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            value={data.node.data.title || ''}
            onChange={(e) => data.onUpdate('title', e.target.value)}
            placeholder="Digite a pergunta da etapa..."
          />
        </div>

        {/* Subtitle */}
        <div className="space-y-1">
          <input
            type="text"
            className="nodrag nopan w-full text-[11px] px-3 py-1.5 rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200/70 dark:border-zinc-800/70 text-slate-600 dark:text-slate-300 placeholder:text-slate-400/80 outline-none focus:border-purple-500 transition-all"
            placeholder="Instrução adicional (opcional)..."
            value={data.node.data.subtitle || ''}
            onChange={(e) => data.onUpdate('subtitle', e.target.value)}
          />
        </div>

        {/* Specific Input Previews */}
        {nodeType === 'celular' || nodeType === 'contato' ? (
          <div className="space-y-1 pt-1">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Formato de Coleta</label>
            <div className="px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 flex items-center gap-2">
              <span className="text-sm">🇧🇷</span>
              <span className="text-xs font-mono text-slate-500 font-semibold">+55</span>
              <input
                type="text"
                className="nodrag nopan flex-1 text-xs bg-transparent outline-none text-slate-800 dark:text-slate-200 font-mono"
                placeholder="(11) 99999-9999"
                value={data.node.data.placeholder || '(11) 99999-9999'}
                onChange={(e) => data.onUpdate('placeholder', e.target.value)}
              />
            </div>
          </div>
        ) : nodeType === 'maioridade' ? (
          <div className="space-y-1.5 pt-1">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Opções de Triagem</label>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">Sim (18+)</span>
                <span className="text-[9px] text-slate-500 block">Avança fluxo</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">Não (Menor)</span>
                <span className="text-[9px] text-slate-500 block">Coleta Responsável</span>
              </div>
            </div>
          </div>
        ) : nodeType === 'emergencia' ? (
          <div className="space-y-1.5 pt-1">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Campos Inclusos</label>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">• Nome do Contato</div>
              <div className="flex items-center gap-1.5">• Grau de Parentesco</div>
              <div className="flex items-center gap-1.5">• Telefone com WhatsApp</div>
            </div>
          </div>
        ) : (
          <div className="space-y-1 pt-1">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Placeholder (Texto sugerido)</label>
            <input
              type="text"
              className="nodrag nopan w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-purple-500"
              placeholder="Ex: Digite sua resposta..."
              value={data.node.data.placeholder || ''}
              onChange={(e) => data.onUpdate('placeholder', e.target.value)}
            />
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex-1 mr-2">
            <input
              type="text"
              className="nodrag nopan w-full text-[10px] px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-900 border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 text-slate-600 dark:text-slate-400 focus:border-purple-500 outline-none"
              placeholder="Texto do botão (ex: Continuar)"
              value={data.node.data.buttonText || ''}
              onChange={(e) => data.onUpdate('buttonText', e.target.value)}
            />
          </div>
          {!isStrictRequired && (
            <label className="nodrag nopan flex items-center gap-1 cursor-pointer text-[10px] text-slate-500 select-none">
              <input
                type="checkbox"
                checked={data.node.data.isRequired ?? true}
                onChange={(e) => data.onUpdate('isRequired', e.target.checked)}
                className="w-3 h-3 rounded border-slate-300 text-purple-600"
              />
              Obrigatório
            </label>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="!w-3.5 !h-3.5 !bg-purple-600 border-2 border-white dark:border-zinc-950 shadow-md -right-[7px]"
      />
    </div>
  );
};

const CustomMaioridadeNode = ({ data }: any) => {
  const isSelected = data.isSelected;
  const config = getNodeConfig('maioridade');
  const IconComp = config.icon;

  return (
    <div 
      className={`w-[340px] rounded-2xl border transition-all duration-200 shadow-xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-slate-100 relative ${
        isSelected 
          ? 'border-purple-500 ring-2 ring-purple-500/30' 
          : 'border-slate-200/90 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!w-3.5 !h-3.5 !bg-purple-600 border-2 border-white dark:border-zinc-950 shadow-md -left-[7px]"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200/80 dark:border-zinc-800/80 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 border ${config.accentBg}`}>
            <IconComp className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {config.label}
          </span>
        </div>
        <span 
          className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 uppercase tracking-wide flex items-center gap-1 select-none"
          title="Este campo é obrigatório na triagem clínica e não pode ser excluído"
        >
          <ShieldCheck className="w-3 h-3" />
          Obrigatório
        </span>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-amber-500" />
            Pergunta de Maioridade
          </label>
          <input
            type="text"
            className="nodrag nopan w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            value={data.node?.data?.title || ''}
            onChange={(e) => data.onUpdate('title', e.target.value)}
            placeholder="Você é maior de idade?"
          />
        </div>

        {/* Subtitle */}
        <div className="space-y-1">
          <input
            type="text"
            className="nodrag nopan w-full text-[11px] px-3 py-1.5 rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200/70 dark:border-zinc-800/70 text-slate-600 dark:text-slate-300 placeholder:text-slate-400/80 outline-none focus:border-purple-500 transition-all"
            placeholder="Subtítulo ou orientação da etapa..."
            value={data.node?.data?.subtitle || ''}
            onChange={(e) => data.onUpdate('subtitle', e.target.value)}
          />
        </div>

        {/* 2 Saídas Lógicas: Maior de Idade & Menor de Idade */}
        <div className="space-y-2 pt-1">
          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Saídas Lógicas de Resposta
          </label>

          {/* Saída 1: Maior de Idade (Sim) */}
          <div className="relative p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                  Sim, sou maior de 18 anos
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 block">
                  Segue fluxo padrão
                </span>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 mr-1">
              Saída 1 ➔
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="source-maior"
              className="!w-3.5 !h-3.5 !bg-emerald-500 border-2 border-white dark:border-zinc-950 shadow-md"
              style={{ top: '50%', transform: 'translateY(-50%)', right: '-18px' }}
            />
          </div>

          {/* Saída 2: Menor de Idade (Não) */}
          <div className="relative p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block truncate">
                  Não, sou menor de idade
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 block">
                  Coleta responsável legal
                </span>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0 mr-1">
              Saída 2 ➔
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="source-menor"
              className="!w-3.5 !h-3.5 !bg-amber-500 border-2 border-white dark:border-zinc-950 shadow-md"
              style={{ top: '50%', transform: 'translateY(-50%)', right: '-18px' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <input
            type="text"
            className="nodrag nopan w-full text-[10px] px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-900 border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 text-slate-600 dark:text-slate-400 focus:border-purple-500 outline-none"
            placeholder="Texto do botão (ex: Avançar)"
            value={data.node?.data?.buttonText || ''}
            onChange={(e) => data.onUpdate('buttonText', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

const CustomContractNode = ({ data }: any) => {
  const isSelected = data.isSelected;
  const config = getNodeConfig('contrato');
  const IconComp = config.icon;

  return (
    <div 
      className={`w-[320px] rounded-2xl border transition-all duration-200 shadow-xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-slate-100 relative ${
        isSelected 
          ? 'border-purple-500 ring-2 ring-purple-500/30' 
          : 'border-slate-200/90 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!w-3.5 !h-3.5 !bg-purple-600 border-2 border-white dark:border-zinc-950 shadow-md -left-[7px]"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200/80 dark:border-zinc-800/80 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 border ${config.accentBg}`}>
            <IconComp className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {config.label}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onDelete(data.node.id); }}
          className="nodrag p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          title="Excluir Etapa"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3 h-3 text-rose-500" />
            Título do Termo / Contrato
          </label>
          <input
            type="text"
            className="nodrag nopan w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            value={data.node.data.title || ''}
            onChange={(e) => data.onUpdate('title', e.target.value)}
            placeholder="Termo de Consentimento Livre e Esclarecido"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Minuta Jurídica do Termo</label>
          <textarea
            rows={4}
            className="nodrag nopan w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-purple-500 resize-none font-sans"
            placeholder="Escreva os termos de aceite legal do contrato aqui..."
            value={data.node.data.contractText || ''}
            onChange={(e) => data.onUpdate('contractText', e.target.value)}
          />
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex-1 mr-2">
            <input
              type="text"
              className="nodrag nopan w-full text-[10px] px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-900 border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 text-slate-600 dark:text-slate-400 focus:border-purple-500 outline-none"
              placeholder="Texto do botão (ex: Aceitar e Continuar)"
              value={data.node.data.buttonText || ''}
              onChange={(e) => data.onUpdate('buttonText', e.target.value)}
            />
          </div>
          <label className="nodrag nopan flex items-center gap-1 cursor-pointer text-[10px] text-slate-500 select-none">
            <input
              type="checkbox"
              checked={data.node.data.isRequired ?? true}
              onChange={(e) => data.onUpdate('isRequired', e.target.checked)}
              className="w-3 h-3 rounded border-slate-300 text-purple-600"
            />
            Obrigatório
          </label>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="!w-3.5 !h-3.5 !bg-purple-600 border-2 border-white dark:border-zinc-950 shadow-md -right-[7px]"
      />
    </div>
  );
};

const CustomSelectorNode = ({ data }: any) => {
  const isSelected = data.isSelected;
  const options = data.node.data.options || [];
  const config = getNodeConfig('seletor');
  const IconComp = config.icon;

  return (
    <div 
      className={`w-[320px] rounded-2xl border transition-all duration-200 shadow-xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-slate-100 relative ${
        isSelected 
          ? 'border-purple-500 ring-2 ring-purple-500/30' 
          : 'border-slate-200/90 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!w-3.5 !h-3.5 !bg-purple-600 border-2 border-white dark:border-zinc-950 shadow-md -left-[7px]"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200/80 dark:border-zinc-800/80 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 border ${config.accentBg}`}>
            <IconComp className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {data.node.data.isMultiple ? 'Múltipla Escolha' : 'Escolha Única'}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onDelete(data.node.id); }}
          className="nodrag p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          title="Excluir Etapa"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-purple-500" />
            Pergunta ao Paciente
          </label>
          <input
            type="text"
            className="nodrag nopan w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            value={data.node.data.title || ''}
            onChange={(e) => data.onUpdate('title', e.target.value)}
            placeholder="Qual é o seu objetivo principal?"
          />
        </div>

        {/* Subtitle */}
        <div className="space-y-1">
          <input
            type="text"
            className="nodrag nopan w-full text-[11px] px-3 py-1.5 rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200/70 dark:border-zinc-800/70 text-slate-600 dark:text-slate-300 placeholder:text-slate-400/80 outline-none focus:border-purple-500 transition-all"
            placeholder="Instrução adicional (opcional)..."
            value={data.node.data.subtitle || ''}
            onChange={(e) => data.onUpdate('subtitle', e.target.value)}
          />
        </div>

        {/* Options List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Opções de Resposta
            </label>
            <label className="nodrag nopan flex items-center gap-1.5 cursor-pointer text-[10px] text-purple-600 dark:text-purple-400 font-semibold select-none">
              <input
                type="checkbox"
                checked={data.node.data.isMultiple || false}
                onChange={(e) => data.onUpdate('isMultiple', e.target.checked)}
                className="w-3 h-3 rounded border-slate-300 text-purple-600"
              />
              Múltipla Escolha
            </label>
          </div>

          <div className="space-y-1.5">
            {options.map((opt: any, idx: number) => (
              <div key={idx} className="relative flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <input
                  type="text"
                  className="nodrag nopan flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-purple-500"
                  placeholder={`Opção ${idx + 1}`}
                  value={opt.label || ''}
                  onChange={(e) => {
                    const updatedOptions = [...options];
                    updatedOptions[idx] = { ...opt, label: e.target.value, value: e.target.value || `op_${idx + 1}` };
                    data.onUpdate('options', updatedOptions);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const updatedOptions = options.filter((_: any, oIdx: number) => oIdx !== idx);
                    data.onUpdate('options', updatedOptions);
                  }}
                  className="nodrag p-1 text-slate-400 hover:text-red-500 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {/* Individual Source Handle for Branching */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`option-${idx}`}
                  className="!w-3 !h-3 !bg-purple-600 border-2 border-white dark:border-zinc-950 shadow-md"
                  style={{ top: '50%', transform: 'translateY(-50%)', right: '-18px' }}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                const updatedOptions = [...options, { label: `Opção ${options.length + 1}`, value: `op_${options.length + 1}` }];
                data.onUpdate('options', updatedOptions);
              }}
              className="nodrag nopan w-full py-1.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-750 hover:border-purple-500 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-slate-50/50 dark:bg-zinc-900/50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Opção</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex-1 mr-2">
            <input
              type="text"
              className="nodrag nopan w-full text-[10px] px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-900 border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 text-slate-600 dark:text-slate-400 focus:border-purple-500 outline-none"
              placeholder="Texto do botão (ex: Avançar)"
              value={data.node.data.buttonText || ''}
              onChange={(e) => data.onUpdate('buttonText', e.target.value)}
            />
          </div>
          <label className="nodrag nopan flex items-center gap-1 cursor-pointer text-[10px] text-slate-500 select-none">
            <input
              type="checkbox"
              checked={data.node.data.isRequired ?? true}
              onChange={(e) => data.onUpdate('isRequired', e.target.checked)}
              className="w-3 h-3 rounded border-slate-300 text-purple-600"
            />
            Obrigatório
          </label>
        </div>
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
  const { tenant, primaryTenant, theme, toggleTheme } = useBrand();
  const router = useRouter();

  const [workspaceDomain, setWorkspaceDomain] = useState<any>(null);

  useEffect(() => {
    if (tenant?.id) {
      api.getWorkspaceDomain(tenant.id)
        .then(setWorkspaceDomain)
        .catch(err => console.warn('Erro ao carregar domínio do workspace:', err));
    }
  }, [tenant?.id]);

  const [page, setPage] = useState<CapturePage | null>(null);
  const [lastPublishedPage, setLastPublishedPage] = useState<CapturePage | null>(null);
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
  const [isFormPreviewOpen, setIsFormPreviewOpen] = useState(false);
  const [isMissingStepsModalOpen, setIsMissingStepsModalOpen] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Live preview refresh counter
  const [previewKey, setPreviewKey] = useState(0);

  // Token state for iframe preview to avoid SSR hydration mismatch
  const [token, setToken] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('token') || '');
    }
  }, []);

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
        const isDraft = page.siteConfig?.status === 'draft';
        const updatePayload: any = {
          titleDraft: page.title,
          slugDraft: page.slug,
          customDomainDraft: page.customDomain,
          seoConfigDraft: page.seoConfig,
          siteConfigDraft: page.siteConfig,
          dictionaryDraft: page.dictionary,
          formFlowDraft: updatedFlow
        };

        if (isDraft) {
          updatePayload.title = page.title;
          updatePayload.slug = page.slug;
          updatePayload.customDomain = page.customDomain;
          updatePayload.seoConfig = page.seoConfig;
          updatePayload.siteConfig = page.siteConfig;
          updatePayload.dictionary = page.dictionary;
          updatePayload.formFlow = updatedFlow;
        }

        await api.updateCapturePage(page.id, updatePayload);
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

  // Node Drag Stop helper to sync new positions immediately into page.formFlow.nodes and record history
  const onNodeDragStop = useCallback((_: any, draggedNode: Node) => {
    setPage(prev => {
      if (!prev) return prev;
      const updatedNodes = (prev.formFlow?.nodes || []).map((n: any) => {
        if (n.id === draggedNode.id) {
          return {
            ...n,
            position: {
              x: Math.round(draggedNode.position.x),
              y: Math.round(draggedNode.position.y)
            }
          };
        }
        return n;
      });
      return {
        ...prev,
        formFlow: {
          ...prev.formFlow,
          nodes: updatedNodes,
          edges: prev.formFlow?.edges || edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || 'source',
            targetHandle: e.targetHandle || 'target'
          }))
        }
      };
    });
    setHasUnsavedChanges(true);
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

  // Compute missing required nodes for validation & lock UI
  const missingRequiredNodes = useMemo(() => {
    if (!page?.formFlow?.nodes) return [];
    const requiredSpecs = [
      { type: 'start', label: 'Início do Formulário', desc: 'Boas-vindas e início da triagem' },
      { type: 'nome', label: 'Nome Completo', desc: 'Identificação do paciente' },
      { type: 'maioridade', label: 'Maioridade (18+)', desc: 'Validação de maioridade e responsável legal' },
      { type: 'celular', label: 'WhatsApp / Celular', desc: 'Contato telefônico com DDD' },
    ];
    return requiredSpecs.filter(spec => {
      if (spec.type === 'start') {
        return !page.formFlow.nodes.some((n: any) => n.type === 'start' || n.id === 'start');
      }
      if (spec.type === 'celular') {
        return !page.formFlow.nodes.some((n: any) => n.type === 'celular' || n.type === 'contato' || n.id === 'celular');
      }
      return !page.formFlow.nodes.some((n: any) => n.type === spec.type || n.id === spec.type);
    });
  }, [page?.formFlow?.nodes]);

  // Sync state dictionary/configs to React Flow states when page is loaded (preserves canvas positions & prevents jumping)
  useEffect(() => {
    if (!page) return;

    // Detect if saved database nodes have overlaps (e.g. legacy data with overlapping x coordinates)
    const rawPositions = (formFlowNodes || []).map((n: any) => n.position?.x);
    const hasOverlaps = rawPositions.some((x: any, i: number) => {
      if (x === undefined || x === null || x === 0) return true;
      return rawPositions.some((otherX: any, j: number) => i !== j && otherX !== undefined && Math.abs(x - otherX) < 260);
    });

    // Build flow nodes for React Flow canvas
    const flowNodes = (formFlowNodes || []).map((node: any, idx: number) => {
      let nodeType = 'stepNode';
      if (node.type === 'start') nodeType = 'startNode';
      else if (node.type === 'maioridade') nodeType = 'maioridadeNode';
      else if (node.type === 'seletor' || node.type === 'escolha' || node.type === 'escolha_multipla') nodeType = 'selectorNode';
      else if (node.type === 'contrato') nodeType = 'contractNode';

      // Preserve existing position from canvas state if already present, or use clean horizontal layout
      const existing = nodes.find(n => n.id === node.id);
      const defaultX = idx * 380 + 80;
      
      let pos = { x: defaultX, y: 150 };
      if (existing) {
        pos = existing.position;
      } else if (!hasOverlaps && node.position && node.position.x !== undefined && node.position.x !== 0) {
        pos = node.position;
      }

      return {
        id: node.id,
        type: nodeType,
        position: pos,
        data: {
          node,
          isSelected: selectedNodeId === node.id,
          contractTitle: undefined,
          onDelete: handleDeleteNode,
          onUpdate: (field: string, value: any) => updateNodeData(node.id, field, value),
        }
      };
    });

    setNodes(flowNodes);

    // Only update edges if canvas edges are empty or when formFlowEdges has different connections
    setEdges(prevEdges => {
      if (prevEdges.length > 0 && formFlowEdges && formFlowEdges.length > 0) {
        const isSame = prevEdges.length === formFlowEdges.length &&
          prevEdges.every((pe, i) => 
            pe.source === formFlowEdges[i]?.source && 
            pe.target === formFlowEdges[i]?.target &&
            (pe.sourceHandle || 'source') === (formFlowEdges[i]?.sourceHandle || 'source')
          );
        if (isSame) return prevEdges;
      }
      if (formFlowEdges && formFlowEdges.length > 0) {
        return formFlowEdges.map((edge: any, idx: number) => {
          const handleSuffix = edge.sourceHandle ? `-${edge.sourceHandle}` : '';
          return {
            id: edge.id || `e-${edge.source}${handleSuffix}-${edge.target}-${idx}`,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle || 'source',
            targetHandle: edge.targetHandle || 'target',
            type: 'default',
            style: { stroke: 'var(--brand-gradient-start, #9333ea)', strokeWidth: 2 }
          };
        });
      }
      return prevEdges;
    });
  }, [formFlowNodes, formFlowEdges, selectedNodeId]);

  // Connect visual nodes in React Flow & sync immediately to page.formFlow.edges
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => {
      const handleSuffix = params.sourceHandle ? `-${params.sourceHandle}` : '';
      const edgeId = `e-${params.source}${handleSuffix}-${params.target}`;

      // Remove previous edge originating from the EXACT same source AND sourceHandle
      const filteredEds = eds.filter(e => !(e.source === params.source && (e.sourceHandle || 'source') === (params.sourceHandle || 'source')));

      const nextEdges = addEdge({
        ...params,
        id: edgeId,
        type: 'default',
        style: { stroke: 'var(--brand-gradient-start, #9333ea)', strokeWidth: 2 }
      }, filteredEds);

      // Sync immediately into page.formFlow.edges
      setPage(prev => {
        if (!prev) return prev;
        const mappedEdges = nextEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || 'source',
          targetHandle: e.targetHandle || 'target'
        }));
        return {
          ...prev,
          formFlow: {
            ...prev.formFlow,
            edges: mappedEdges
          }
        };
      });
      return nextEdges;
    });
    setHasUnsavedChanges(true);
  }, [setEdges]);

  // Edge changes handler syncing edge removals into page.formFlow.edges
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    setEdges(currentEdges => {
      setPage(prev => {
        if (!prev) return prev;
        const mappedEdges = currentEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || 'source',
          targetHandle: e.targetHandle || 'target'
        }));
        return {
          ...prev,
          formFlow: {
            ...prev.formFlow,
            edges: mappedEdges
          }
        };
      });
      return currentEdges;
    });
    setHasUnsavedChanges(true);
  }, [onEdgesChange, setEdges]);

  const handleToggleActive = async (id: string, currentVal: boolean) => {
    if (!page) return;
    try {
      const updated = await api.updateCapturePage(id, { isActive: !currentVal });
      setPage(prev => prev ? { ...prev, isActive: updated.isActive } : null);
    } catch (err: any) {
      setError('Falha ao alternar status da página: ' + err.message);
    }
  };

  // Publish changes to database
  const handlePublish = async () => {
    if (!page) return;

    // Check mandatory required nodes and open resolution popup
    if (missingRequiredNodes.length > 0) {
      setIsMissingStepsModalOpen(true);
      return;
    }

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
      const isDraft = page.siteConfig?.status === 'draft';
      const updatePayload: any = {
        titleDraft: page.title,
        slugDraft: page.slug,
        customDomainDraft: page.customDomain,
        seoConfigDraft: page.seoConfig,
        siteConfigDraft: page.siteConfig,
        dictionaryDraft: page.dictionary,
        formFlowDraft: updatedFlow
      };

      if (isDraft) {
        updatePayload.title = page.title;
        updatePayload.slug = page.slug;
        updatePayload.customDomain = page.customDomain;
        updatePayload.seoConfig = page.seoConfig;
        updatePayload.siteConfig = page.siteConfig;
        updatePayload.dictionary = page.dictionary;
        updatePayload.formFlow = updatedFlow;
      }

      await api.updateCapturePage(page.id, updatePayload);

      const res = await api.publishCapturePage(page.id);

      setPage(res);
      setLastPublishedPage(res);
      setHasUnsavedChanges(false);
      setSuccess('Página publicada com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao publicar alterações.');
    } finally {
      setSaving(false);
    }
  };

  // Node modifications inside graph editor
  const handleAddNode = (type: string, customPosition?: { x: number; y: number }) => {
    if (!page) return;
    const id = `${type}_${Math.random().toString(36).substring(2, 6)}`;
    
    let title = 'Escreva a pergunta da etapa...';
    let placeholder = 'Responda aqui...';
    let options: any[] | undefined = undefined;

    if (type === 'start') {
      title = 'Triagem Clínica Inicial';
      placeholder = '';
    } else if (type === 'nome') {
      title = 'Qual é o seu nome completo?';
      placeholder = 'Escreva seu nome completo aqui...';
    } else if (type === 'celular' || type === 'contato') {
      title = 'Qual é o seu WhatsApp de contato?';
      placeholder = '(11) 99999-9999';
    } else if (type === 'email') {
      title = 'Qual é o seu melhor e-mail?';
      placeholder = 'seu.email@exemplo.com';
    } else if (type === 'cpf') {
      title = 'Qual é o seu CPF?';
      placeholder = '000.000.000-00';
    } else if (type === 'maioridade') {
      title = 'Você é maior de idade?';
      placeholder = '';
      options = [{ label: 'Sim', value: 'Sim' }, { label: 'Não', value: 'Não' }];
    } else if (type === 'emergencia') {
      title = 'Contato de Emergência';
      placeholder = '';
    } else if (type === 'contrato') {
      title = 'Termo de Consentimento Livre e Esclarecido';
      placeholder = '';
    } else if (type === 'seletor' || type === 'escolha' || type === 'escolha_multipla') {
      title = 'Selecione uma opção...';
      placeholder = '';
      options = [
        { label: 'Opção 1', value: 'op1' },
        { label: 'Opção 2', value: 'op2' }
      ];
    } else if (type === 'paragrafo') {
      title = 'Descreva seu momento atual...';
      placeholder = 'Digite aqui...';
    }

    // Calculate position: custom drop position or next position to the right with 380px spacing
    const currentNodes = page.formFlow?.nodes || [];
    const maxX = currentNodes.reduce((max: number, n: any) => {
      const x = n.position?.x ?? 0;
      return Math.max(max, x);
    }, 0);
    const nextX = currentNodes.length === 0 ? 80 : Math.max(maxX + 380, currentNodes.length * 380 + 80);
    const targetPosition = customPosition || { x: nextX, y: 150 };

    const newNodeData = {
      id,
      type: type === 'escolha' ? 'seletor' : type === 'escolha_multipla' ? 'seletor' : type === 'contato' ? 'celular' : type,
      position: targetPosition,
      data: {
        title,
        isRequired: true,
        placeholder,
        options,
        isMultiple: type === 'escolha_multipla',
        contractText: type === 'contrato' ? 'Ao assinar este termo você concorda com o atendimento clínico.' : undefined,
      }
    };

    const updatedNodes = [...page.formFlow.nodes, newNodeData];
    setPage({
      ...page,
      formFlow: { ...page.formFlow, nodes: updatedNodes }
    });
    setSelectedNodeId(id);
    setHasUnsavedChanges(true);
  };

  // Drag and Drop from Sidebar into React Flow Canvas
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      let position = { x: 200, y: 150 };

      if (reactFlowInstance) {
        if (typeof reactFlowInstance.screenToFlowPosition === 'function') {
          position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });
        } else if (typeof reactFlowInstance.project === 'function') {
          const reactFlowBounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
          position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
          });
        }
      }

      // Offset position slightly so node center aligns comfortably with cursor
      const adjustedPosition = {
        x: Math.round(position.x - 170),
        y: Math.round(position.y - 40),
      };

      handleAddNode(type, adjustedPosition);
    },
    [reactFlowInstance, handleAddNode]
  );

  const handleDeleteNode = (id: string) => {
    if (!page) return;
    const nodeToDelete = page.formFlow?.nodes?.find((n: any) => n.id === id);
    if (!nodeToDelete) return;
    
    // Trava para campos estritamente obrigatórios da triagem clínica
    const isStrict = ['start', 'nome', 'maioridade', 'celular', 'contato'].includes(nodeToDelete.type) || 
                     id === 'start' || id === 'nome' || id === 'maioridade' || id === 'celular';
    if (isStrict) {
      const config = getNodeConfig(nodeToDelete.type);
      setError(`O campo '${config.label || nodeToDelete.id}' é obrigatório para o funcionamento da triagem clínica e não pode ser excluído.`);
      return;
    }
    
    const updatedNodes = page.formFlow.nodes.filter((n: any) => n.id !== id);
    const updatedEdges = (page.formFlow.edges || []).filter((e: any) => e.source !== id && e.target !== id);

    setPage({
      ...page,
      formFlow: { ...page.formFlow, nodes: updatedNodes, edges: updatedEdges }
    });
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
  };

  const updateNodeData = useCallback((nodeId: string, field: string, value: any) => {
    // 1. Direct update to React Flow nodes state for instant responsiveness
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === nodeId) {
          const currentData = (n.data || {}) as any;
          const innerNode = currentData.node || {};
          return {
            ...n,
            data: {
              ...currentData,
              node: {
                ...innerNode,
                data: {
                  ...(innerNode.data || {}),
                  [field]: value
                }
              }
            }
          };
        }
        return n;
      })
    );

    // 2. Update page state preserving current positions from React Flow canvas
    setPage(prev => {
      if (!prev) return prev;
      const currentFlowNodes = prev.formFlow?.nodes || [];
      const updatedNodes = currentFlowNodes.map((n: any) => {
        const flowNode = nodes.find((fn) => fn.id === n.id);
        const currentPos = flowNode ? flowNode.position : n.position;
        if (n.id === nodeId) {
          return {
            ...n,
            position: currentPos || n.position,
            data: {
              ...n.data,
              [field]: value
            }
          };
        }
        return {
          ...n,
          position: currentPos || n.position
        };
      });
      return {
        ...prev,
        formFlow: { ...prev.formFlow, nodes: updatedNodes }
      };
    });
    setHasUnsavedChanges(true);
  }, [nodes]);

  // Memoize nodeTypes mapping to avoid canvas issues
  const nodeTypes = useMemo(() => ({
    startNode: CustomStartNode,
    stepNode: CustomStepNode,
    maioridadeNode: CustomMaioridadeNode,
    contractNode: CustomContractNode,
    selectorNode: CustomSelectorNode,
    // Keep legacy fallback mappings if needed
    start: CustomStartNode,
    input: CustomStepNode,
    maioridade: CustomMaioridadeNode,
    contrato: CustomContractNode,
    seletor: CustomSelectorNode,
  }), []);

  if (loading || !page) {
    const bootLogoUrl =
      theme === 'light'
        ? (tenant?.logoLightUrl || tenant?.logoDarkUrl || primaryTenant?.logoLightUrl || primaryTenant?.logoDarkUrl)
        : (tenant?.logoDarkUrl || tenant?.logoLightUrl || primaryTenant?.logoDarkUrl || primaryTenant?.logoLightUrl);
    const bootBrandName = tenant?.name || primaryTenant?.name || '';
    const spinnerStartColor = tenant?.gradientColorStart || primaryTenant?.gradientColorStart || '#52525B';
    const spinnerEndColor = tenant?.gradientColorEnd || primaryTenant?.gradientColorEnd || '#27272A';

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
            {bootLogoUrl && (
              <img
                src={bootLogoUrl}
                alt={bootBrandName}
                className="max-h-16 max-w-[240px] object-contain"
                style={{ animation: 'fadeIn 0.6s ease-out forwards' }}
              />
            )}
            {/* Spinner com cores do tenant replicado do BrandContext */}
            <div className="relative h-10 w-10">
              <div
                className="absolute inset-0 rounded-full border-2 animate-spin"
                style={{
                  borderColor: 'transparent',
                  borderTopColor: spinnerStartColor,
                  borderRightColor: spinnerEndColor,
                }}
              />
              <div
                className="absolute inset-2 rounded-full animate-pulse"
                style={{
                  border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.05)',
                  backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
                }}
              />
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

  const previewIframeUrl = workspaceDomain?.subdomain 
    ? `${landingBaseUrl}/p/${workspaceDomain.subdomain}/${pageSlugForPreview}?preview=true&key=${previewKey}&token=${token}`
    : '#';

  // External Preview URL (without preview=true)
  const externalPreviewUrl = workspaceDomain?.subdomain 
    ? `${landingBaseUrl}/p/${workspaceDomain.subdomain}/${pageSlugForPreview}`
    : '#';

  const previewUrlWithToken = externalPreviewUrl !== '#'
    ? `${externalPreviewUrl}?staging=true&token=${token}`
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
            {missingRequiredNodes.length > 0 ? (
              <button
                type="button"
                onClick={() => setIsMissingStepsModalOpen(true)}
                className="h-8 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all animate-pulse shadow-sm"
                title="Clique para ver e adicionar as etapas obrigatórias que faltam no formulário"
              >
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="truncate">{missingRequiredNodes.length} {missingRequiredNodes.length === 1 ? 'etapa obrigatória ausente' : 'etapas obrigatórias ausentes'}</span>
              </button>
            ) : error ? (
              <div className="h-8 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5 max-w-[240px] animate-fade-in" title={error}>
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                <span className="truncate flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="text-red-400 hover:text-red-600 dark:hover:text-red-200 cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : null}
            <div
              className={`h-7 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center whitespace-nowrap border transition-all ${
                hasUnsavedChanges 
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}
            >
              {hasUnsavedChanges ? 'Pendente' : 'Salvo'}
            </div>
            {activeTab === 'flow' && (
              <button
                type="button"
                onClick={() => setIsFormPreviewOpen(true)}
                className="h-7 px-2.5 rounded-lg bg-purple-600/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-600/25 cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
                title="Testar Formulário em Modal Popup"
              >
                <Sparkles className="h-3 w-3" />
                <span className="text-[10px] font-bold">Testar Formulário</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => window.open(previewUrlWithToken, '_blank')}
              className="h-7 px-2 rounded-lg glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
              title="Visualizar Staging em Nova Guia"
            >
              <Eye className="h-3 w-3" />
              <span className="text-[10px] font-semibold hidden lg:inline">Visualizar Rascunho</span>
            </button>
            <Button
              onClick={handlePublish}
              disabled={saving}
              className="brand-accent text-[10px] font-bold uppercase h-7 px-3 flex items-center gap-1.5 cursor-pointer border-none"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Globe className="h-3.5 w-3.5" />
              )}
              {saving
                ? 'Publicando...'
                : page.siteConfig?.status === 'published'
                ? 'Publicar Alterações'
                : 'Publicar Página'}
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
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Estrutura de Etapas</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Arraste para o fluxo ou clique para adicionar</p>
                </div>
                <span className="text-[10px] glass-sm border border-[var(--surface-border)] text-purple-600 dark:text-purple-400 font-bold px-2.5 py-1 rounded-lg">
                  {page.formFlow.nodes.length} blocos
                </span>
              </div>

              {/* Step Templates */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block px-1">
                  Templates de Triagem (Arraste para o fluxo)
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { type: 'nome', label: 'Nome Completo', desc: 'Identificação do paciente', icon: User, required: true, color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
                    { type: 'celular', label: 'WhatsApp / Celular', desc: 'Contato com DDI e DDD', icon: Phone, required: true, color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
                    { type: 'maioridade', label: 'Maioridade (18+)', desc: 'Triagem maior/menor de idade', icon: ShieldCheck, required: true, color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
                    { type: 'email', label: 'E-mail de Contato', desc: 'Validação de e-mail', icon: Mail, required: false, color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
                    { type: 'cpf', label: 'CPF do Paciente', desc: 'Validação de documento', icon: Sliders, required: false, color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' },
                    { type: 'contrato', label: 'Contrato / TCLE', desc: 'Termo de consentimento clínico', icon: FileText, required: false, color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
                    { type: 'emergencia', label: 'Contato de Emergência', desc: 'Nome, parentesco e celular', icon: AlertCircle, required: false, color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
                  ].map((tmpl) => {
                    const IconComp = tmpl.icon;
                    const isAdded = page.formFlow.nodes.some((n: any) => n.type === tmpl.type || (tmpl.type === 'celular' && n.type === 'contato'));
                    return (
                      <div
                        key={tmpl.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, tmpl.type)}
                        onClick={() => handleAddNode(tmpl.type)}
                        className="p-2.5 rounded-xl text-left transition-all flex items-center justify-between glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-purple-500/50 cursor-grab active:cursor-grabbing hover:scale-[1.01] active:scale-[0.99] select-none group w-full"
                        title="Arraste para a posição desejada no fluxo ou clique para adicionar"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical className="h-3.5 w-3.5 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-purple-500 shrink-0 transition-opacity" />
                          <div className={`p-1.5 rounded-lg shrink-0 border ${tmpl.color}`}>
                            <IconComp className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold block text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate">
                              {tmpl.label}
                            </span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 block leading-tight truncate">
                              {tmpl.desc}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {tmpl.required && (
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              isAdded 
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' 
                                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                            }`}>
                              {isAdded ? 'Obrigatório' : 'Ausente (Obrigatório)'}
                            </span>
                          )}
                          <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Input Types */}
              <div className="space-y-2 border-t border-[var(--surface-border)] pt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block px-1">
                  Perguntas Personalizadas (Arraste para o fluxo)
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { type: 'escolha', label: 'Escolha Única', desc: 'Botões com ramificação individual', icon: CheckSquare, color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
                    { type: 'escolha_multipla', label: 'Múltipla Escolha', desc: 'Seleção de várias opções', icon: CheckSquare, color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
                    { type: 'texto', label: 'Texto Curto', desc: 'Linha única de resposta livre', icon: MessageSquare, color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' },
                    { type: 'paragrafo', label: 'Parágrafo Longo', desc: 'Área de texto para queixa principal', icon: AlignLeft, color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30' },
                  ].map((inType) => {
                    const IconComp = inType.icon;
                    return (
                      <div
                        key={inType.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, inType.type)}
                        onClick={() => handleAddNode(inType.type)}
                        className="p-2.5 rounded-xl text-left transition-all flex items-center justify-between glass-sm hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] hover:border-purple-500/50 cursor-grab active:cursor-grabbing hover:scale-[1.01] active:scale-[0.99] select-none group w-full"
                        title="Arraste para a posição desejada no fluxo ou clique para adicionar"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical className="h-3.5 w-3.5 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-purple-500 shrink-0 transition-opacity" />
                          <div className={`p-1.5 rounded-lg shrink-0 border ${inType.color}`}>
                            <IconComp className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold block text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate">
                              {inType.label}
                            </span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 block leading-tight truncate">
                              {inType.desc}
                            </span>
                          </div>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-500 shrink-0 ml-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
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
                  
                  <div className="flex items-center flex-1 min-w-0 rounded-xl overflow-hidden border border-[var(--surface-border)] bg-slate-100/60 dark:bg-black/30 shadow-sm focus-within:border-[var(--brand-gradient-start)] transition-all">
                    <span className="h-10 px-3 flex items-center shrink-0 border-r border-[var(--surface-border)] text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-zinc-800/80 select-none whitespace-nowrap">
                      https://{workspaceDomain?.customDomain || `${workspaceDomain?.subdomain || 'site'}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app'}`}/
                    </span>
                    <input
                      type="text"
                      className="h-10 px-3 flex-1 min-w-[120px] bg-transparent text-xs font-mono text-slate-900 dark:text-white outline-none border-none placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                      placeholder="ex: terapia (ou deixe em branco)"
                      value={page.slug || ''}
                      onChange={(e) => {
                        const cleanVal = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setPage({ ...page, slug: cleanVal });
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>

                  {workspaceDomain?.customDomain && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-0.5">
                      🔗 Também disponível no seu endereço gratuito: <span className="font-bold text-indigo-500 dark:text-indigo-400">https://{workspaceDomain.subdomain}.{process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app'}/{page.slug}</span>
                    </p>
                  )}

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
                  {workspaceDomain?.subdomain && (
                    <span className="text-[9px] font-mono text-slate-500 hidden sm:inline border-l border-[var(--surface-border)] pl-2">
                      {workspaceDomain.subdomain}/{page.slug}
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
                {!token ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-gradient-start)]" />
                    <span className="text-xs font-semibold">Carregando pré-visualização...</span>
                  </div>
                ) : previewMode === 'desktop' ? (
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
            <div 
              className="w-full h-full relative" 
              style={{ height: '100%' }}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                <div className="glass-md border border-[var(--surface-border)] rounded-xl p-3 max-w-xs space-y-1 shadow-xl bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
                  <h4 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-purple-500" />
                    Editor de Fluxo
                  </h4>
                  <p className="text-[9px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Arraste etapas da barra lateral para a posição desejada no fluxo e ligue os pontos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFormPreviewOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all flex items-center gap-2 cursor-pointer border border-purple-400/30 hover:scale-[1.02] active:scale-[0.98]"
                  title="Abrir simulação interativa do formulário popup"
                >
                  <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
                  <span>Testar Formulário Popup</span>
                </button>
              </div>

              {/* Floating Alert Banner if required nodes are missing */}
              {missingRequiredNodes.length > 0 && (
                <div className="absolute top-4 right-4 z-20 max-w-sm p-3.5 rounded-2xl bg-amber-500/15 dark:bg-amber-950/90 border border-amber-500/40 text-amber-900 dark:text-amber-200 backdrop-blur-md shadow-2xl space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold">Campos Obrigatórios Ausentes</h4>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug mt-0.5">
                        O formulário exige as seguintes etapas para funcionar corretamente:
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {missingRequiredNodes.map(m => (
                      <button
                        key={m.type}
                        type="button"
                        draggable
                        onDragStart={(e) => onDragStart(e, m.type)}
                        onClick={() => handleAddNode(m.type)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-grab active:cursor-grabbing hover:scale-[1.02] active:scale-[0.98]"
                        title="Arraste para a posição no fluxo ou clique para adicionar"
                      >
                        <GripVertical className="w-3 h-3 opacity-60" />
                        <span>Adicionar {m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={onConnect}
                onNodeDragStop={onNodeDragStop}
                onInit={setReactFlowInstance}
                onDragOver={onDragOver}
                onDrop={onDrop}
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

      {/* Interactive Typeform Popup Preview Modal */}
      <TypeformPreviewModal
        open={isFormPreviewOpen}
        onClose={() => setIsFormPreviewOpen(false)}
        formFlow={page?.formFlow || { nodes: [], edges: [] }}
        brandColors={page?.siteConfig?.theme?.colors}
        whatsappNumber={page?.siteConfig?.whatsappNumber}
      />

      {/* Modal Popup de Etapas Obrigatórias Ausentes com Ações Diretas */}
      <BrandModal
        isOpen={isMissingStepsModalOpen}
        onClose={() => setIsMissingStepsModalOpen(false)}
        maxWidth="max-w-lg"
      >
        <div className="space-y-5 text-left p-1">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-[var(--surface-border)] pb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Etapas Obrigatórias Ausentes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                O formulário precisa conter as etapas essenciais para estar em conformidade clínica e poder ser publicado.
              </p>
            </div>
          </div>

          {/* Missing Steps List */}
          <div className="space-y-2.5">
            {missingRequiredNodes.map((item) => {
              const config = getNodeConfig(item.type);
              const IconComp = config.icon;
              return (
                <div
                  key={item.type}
                  className="p-3.5 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] hover:bg-[var(--surface-hover)] flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 border ${config.accentBg}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                        {item.desc}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      handleAddNode(item.type);
                      setActiveTab('flow');
                      if (missingRequiredNodes.length <= 1) {
                        setIsMissingStepsModalOpen(false);
                      }
                    }}
                    className="brand-accent text-xs font-bold h-8 px-3 flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[var(--surface-border)] flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsMissingStepsModalOpen(false)}
              className="text-xs h-9 px-4 cursor-pointer"
            >
              Fechar
            </Button>

            {missingRequiredNodes.length > 1 && (
              <Button
                type="button"
                onClick={() => {
                  missingRequiredNodes.forEach(m => handleAddNode(m.type));
                  setActiveTab('flow');
                  setIsMissingStepsModalOpen(false);
                }}
                className="brand-accent text-xs font-bold h-9 px-4 flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Adicionar Todas as Etapas</span>
              </Button>
            )}
          </div>
        </div>
      </BrandModal>

    </div>
  );
}

// Simple fallback spinner for component loader since loading states are handled cleanly
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand-gradient-start)]" />
);
