'use client';

import React from 'react';
import {
  Layout,
  Compass,
  Sparkles,
  Square,
  GalleryHorizontal,
  Heading,
  AlignLeft,
  Type,
  List,
  Image as ImageIcon,
  Video,
  Minus,
  MousePointerClick,
  UserCheck,
  User,
  Award,
  MessageSquare,
  BarChart3,
  HelpCircle,
  CreditCard,
  ArrowUpDown,
  GripVertical,
  PanelBottom,
  Share2,
  Globe
} from 'lucide-react';
import { AccordionItem } from '../PropertiesPanel/components/AccordionSection';
import { createSectionFromPreset, Section, AtomicComponentType, GlobalComponentMaster } from '@psi/canvas-renderer';

interface AddPaletteProps {
  onAddSection: (label?: string) => void;
  onAddCustomSection?: (section: Section) => void;
  onAddComponent: (type: 'div' | 'carousel' | 'global_instance' | AtomicComponentType, preset?: string) => void;
  globalComponentsMap?: Record<string, GlobalComponentMaster> | null;
  onAddGlobalInstance?: (globalComponentId: string) => void;
}

interface PaletteItem {
  type: 'section' | 'div' | 'carousel' | 'global_instance' | AtomicComponentType;
  preset?: string;
  globalComponentId?: string;
  label: string;
  icon: React.ComponentType<any>;
  desc: string;
}

export function AddPalette({ onAddSection, onAddCustomSection, onAddComponent, globalComponentsMap, onAddGlobalInstance }: AddPaletteProps) {
  // Categorias Simplificadas em Acordeões Inteligentes
  const elementCategories: Array<{ title: string; icon: React.ComponentType<any>; items: PaletteItem[] }> = [
    {
      title: 'ESTRUTURA & LAYOUT',
      icon: Layout,
      items: [
        { type: 'section', preset: 'single', label: 'Seção', icon: Layout, desc: 'Container raiz full-width' },
        { type: 'div', preset: 'single', label: 'Container (Div)', icon: Square, desc: 'Container flexível de layout' },
        { type: 'carousel', label: 'Galeria / Carrossel', icon: GalleryHorizontal, desc: 'Carrossel coringa multi-itens' },
        { type: 'spacer', label: 'Espaçador', icon: ArrowUpDown, desc: 'Espaço em branco responsivo' },
        { type: 'divider', label: 'Separador', icon: Minus, desc: 'Linha divisória horizontal' },
        { type: 'section', preset: 'header_classic', label: 'Navbar Clássico', icon: Compass, desc: 'Cabeçalho sticky com logo e links' },
        { type: 'section', preset: 'header_floating', label: 'Navbar Flutuante', icon: Sparkles, desc: 'Cabeçalho suspenso efeito glass' },
        { type: 'section', preset: 'footer', label: 'Rodapé do Site', icon: PanelBottom, desc: 'Rodapé completo com marca e redes' },
      ],
    },
    {
      title: 'TEXTO & MÍDIA',
      icon: Heading,
      items: [
        { type: 'heading', label: 'Título', icon: Heading, desc: 'H1 a H6 editável diretamente' },
        { type: 'paragraph', label: 'Parágrafo', icon: AlignLeft, desc: 'Texto de apresentação e corpo' },
        { type: 'label', label: 'Subtítulo', icon: Type, desc: 'Texto curto de apoio / etiqueta' },
        { type: 'list', label: 'Lista de Tópicos', icon: List, desc: 'Tópicos com ícone check' },
        { type: 'image', label: 'Imagem', icon: ImageIcon, desc: 'Upload R2 ou URL externa' },
        { type: 'video', label: 'Vídeo', icon: Video, desc: 'Player YouTube ou Vimeo' },
        { type: 'icon', label: 'Ícone', icon: Sparkles, desc: 'Vetor Lucide customizável' },
      ],
    },
    {
      title: 'COMPONENTES & MARKETING',
      icon: Sparkles,
      items: [
        { type: 'button', preset: 'primary', label: 'Botão Primário', icon: MousePointerClick, desc: 'CTA principal gradiente' },
        { type: 'button', preset: 'secondary', label: 'Botão Secundário', icon: MousePointerClick, desc: 'CTA secundário outline' },
        { type: 'badge', label: 'Badge', icon: Award, desc: 'Chip de destaque com ícone' },
        { type: 'card', label: 'Card', icon: CreditCard, desc: 'Bloco em cartão com imagem/texto' },
        { type: 'avatar', label: 'Avatar', icon: User, desc: 'Foto de perfil com nome e cargo' },
        { type: 'logo', label: 'Logotipo', icon: UserCheck, desc: 'Marca integrada do profissional' },
        { type: 'social_links', label: 'Redes Sociais', icon: Share2, desc: 'Barra de ícones sociais' },
        { type: 'navbar_links', label: 'Menu de Links', icon: Compass, desc: 'Links de navegação de seções' },
        { type: 'testimonial', label: 'Depoimento', icon: MessageSquare, desc: 'Citação de paciente com avatar' },
        { type: 'stat_counter', label: 'Contador', icon: BarChart3, desc: 'Métrica de impacto destacada' },
        { type: 'faq_item', label: 'FAQ', icon: HelpCircle, desc: 'Acordeão de pergunta e resposta' },
      ],
    },
  ];

  const globalItems: PaletteItem[] = globalComponentsMap
    ? Object.values(globalComponentsMap).map((gc) => ({
        type: 'global_instance',
        globalComponentId: gc.id,
        label: gc.name,
        icon: Sparkles,
        desc: `${gc.customizableProps.length} prop(s) personalizável(is)`,
      }))
    : [];

  const handleDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ itemType: item.type, preset: item.preset, globalComponentId: item.globalComponentId })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="p-3 space-y-3 custom-scrollbar overflow-y-auto">
      {elementCategories.map((cat, idx) => {
        const CategoryIcon = cat.icon;
        return (
          <AccordionItem key={idx} id={`acc-cat-${idx}`} title={cat.title} icon={CategoryIcon} defaultOpen={idx === 0}>
            <div className="grid grid-cols-2 gap-2">
              {cat.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={`${item.type}-${item.preset || ''}-${itemIdx}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={() => {
                      if (item.type === 'section') {
                        const newSec = createSectionFromPreset(item.preset);
                        if (onAddCustomSection) {
                          onAddCustomSection(newSec);
                        } else {
                          onAddSection(item.label);
                        }
                      } else {
                        onAddComponent(item.type as any, item.preset);
                      }
                    }}
                    className="p-2 rounded-xl border border-[var(--surface-border)] glass-sm hover:border-[var(--brand-gradient-start)] hover:glass-md transition-all text-left flex flex-col justify-between space-y-1 group/card cursor-grab active:cursor-grabbing select-none min-w-0"
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className="p-1 rounded-lg bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] group-hover/card:brand-accent group-hover/card:text-white transition-colors shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0" title={item.label}>
                          {item.label}
                        </span>
                      </div>
                      <GripVertical className="w-3 h-3 text-slate-300 dark:text-zinc-600 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <span className="text-[8.5px] text-slate-500 truncate block w-full" title={item.desc}>{item.desc}</span>
                  </div>
                );
              })}
            </div>
          </AccordionItem>
        );
      })}

      {/* 4. Novo Acordeão: ELEMENTOS GLOBAIS */}
      <AccordionItem id="acc-cat-global" title="ELEMENTOS GLOBAIS" icon={Globe} defaultOpen={true}>
        {globalItems.length === 0 ? (
          <div className="p-3 text-center rounded-xl border border-dashed border-purple-500/20 bg-purple-500/5 text-purple-600 dark:text-purple-400 space-y-1">
            <Sparkles className="w-4 h-4 mx-auto animate-pulse" />
            <p className="text-[11px] font-bold">Nenhum Elemento Global criado</p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">
              Clique com botão direito em qualquer elemento no canvas e escolha &quot;Salvar como Global&quot;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {globalItems.map((item, itemIdx) => {
              return (
                <div
                  key={`global-${item.globalComponentId}-${itemIdx}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onClick={() => {
                    if (onAddGlobalInstance && item.globalComponentId) {
                      onAddGlobalInstance(item.globalComponentId);
                    } else {
                      onAddComponent('global_instance', item.globalComponentId);
                    }
                  }}
                  className="p-2 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:border-purple-500 hover:bg-purple-500/10 transition-all text-left flex flex-col justify-between space-y-1 group/card cursor-grab active:cursor-grabbing select-none min-w-0 shadow-sm"
                >
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className="p-1 rounded-lg bg-purple-600 text-white shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0" title={item.label}>
                        {item.label}
                      </span>
                    </div>
                    <GripVertical className="w-3 h-3 text-purple-400 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <span className="text-[8.5px] text-purple-600 dark:text-purple-400 font-medium truncate block w-full" title={item.desc}>
                    {item.desc}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </AccordionItem>
    </div>
  );
}

