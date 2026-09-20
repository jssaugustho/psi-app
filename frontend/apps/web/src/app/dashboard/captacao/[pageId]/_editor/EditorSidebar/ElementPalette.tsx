import React from 'react';
import {
  Square,
  Columns2,
  Columns3,
  GalleryHorizontal,
  Heading,
  AlignLeft,
  Type,
  List,
  Image as ImageIcon,
  Video,
  Sparkles,
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
  Share2,
  Compass,
} from 'lucide-react';
import { AtomicComponentType } from '../types';

interface ElementPaletteProps {
  onAddComponent: (type: 'div' | 'carousel' | AtomicComponentType, preset?: string) => void;
}

interface PaletteItem {
  type: 'div' | 'carousel' | AtomicComponentType;
  preset?: string;
  label: string;
  icon: React.ComponentType<any>;
  desc: string;
}

export function ElementPalette({ onAddComponent }: ElementPaletteProps) {
  const categories: Array<{ title: string; items: PaletteItem[] }> = [
    {
      title: 'CONTAINERS & SEÇÕES',
      items: [
        { type: 'div' as const, preset: 'single', label: 'Container', icon: Square, desc: 'Container flexível de seção' },
        { type: 'div' as const, preset: '2col', label: '2 Colunas', icon: Columns2, desc: 'Grade de 2 colunas flex' },
        { type: 'div' as const, preset: '3col', label: '3 Colunas', icon: Columns3, desc: 'Grade de 3 colunas flex' },
        { type: 'carousel' as const, label: 'Galeria / Carrossel', icon: GalleryHorizontal, desc: 'Carrossel coringa multi-itens' },
      ],
    },
    {
      title: 'NAVEGAÇÃO & BRANDING',
      items: [
        { type: 'logo' as const, label: 'Logotipo', icon: UserCheck, desc: 'Marca do profissional' },
        { type: 'navbar_links' as const, label: 'Menu de Links', icon: Compass, desc: 'Links de navegação do site' },
        { type: 'avatar' as const, label: 'Avatar', icon: User, desc: 'Foto de perfil circular' },
        { type: 'social_links' as const, label: 'Redes Sociais', icon: Share2, desc: 'Ícones de redes sociais' },
      ],
    },
    {
      title: 'TIPOGRAFIA',
      items: [
        { type: 'heading' as const, label: 'Título', icon: Heading, desc: 'H1 a H6 editável' },
        { type: 'paragraph' as const, label: 'Parágrafo', icon: AlignLeft, desc: 'Texto de apresentação' },
        { type: 'label' as const, label: 'Subtítulo', icon: Type, desc: 'Texto curto de apoio' },
        { type: 'list' as const, label: 'Lista', icon: List, desc: 'Tópicos com ícone check' },
      ],
    },
    {
      title: 'MÍDIA & VISUAL',
      items: [
        { type: 'image' as const, label: 'Imagem', icon: ImageIcon, desc: 'Upload de foto R2' },
        { type: 'video' as const, label: 'Vídeo', icon: Video, desc: 'YouTube ou Vimeo' },
        { type: 'icon' as const, label: 'Ícone', icon: Sparkles, desc: 'Vetor Lucide customizável' },
        { type: 'divider' as const, label: 'Separador', icon: Minus, desc: 'Linha divisória' },
      ],
    },
    {
      title: 'AÇÃO & CONVERSÃO',
      items: [
        { type: 'button' as const, label: 'Botão CTA', icon: MousePointerClick, desc: 'Ação principal' },
        { type: 'badge' as const, label: 'Badge', icon: Award, desc: 'Chip de destaque' },
        { type: 'testimonial' as const, label: 'Depoimento', icon: MessageSquare, desc: 'Citação de paciente' },
        { type: 'stat_counter' as const, label: 'Contador', icon: BarChart3, desc: 'Métricas de impacto' },
        { type: 'faq_item' as const, label: 'FAQ', icon: HelpCircle, desc: 'Acordeão expansível' },
        { type: 'card' as const, label: 'Card', icon: CreditCard, desc: 'Bloco em cartão' },
        { type: 'spacer' as const, label: 'Espaçador', icon: ArrowUpDown, desc: 'Espaço em branco' },
      ],
    },
  ];

  const handleDragStart = (e: React.DragEvent, item: { type: string; preset?: string }) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ itemType: item.type, preset: item.preset }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="p-4 space-y-5">
      {categories.map((cat, idx) => (
        <div key={idx} className="space-y-2">
          <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {cat.title}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {cat.items.map((item, itemIdx) => {
              const Icon = item.icon;
              return (
                <div
                  key={`${item.type}-${itemIdx}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onClick={() => onAddComponent(item.type as any, item.preset)}
                  className="p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm hover:border-[var(--brand-gradient-start)] hover:glass-md transition-all text-left flex flex-col justify-between space-y-1.5 group/card cursor-grab active:cursor-grabbing select-none min-w-0"
                >
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] group-hover/card:brand-accent group-hover/card:text-white transition-colors shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0" title={item.label}>
                        {item.label}
                      </span>
                    </div>
                    <GripVertical className="w-3 h-3 text-slate-300 dark:text-zinc-600 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0 ml-1" />
                  </div>
                  <span className="text-[9px] text-slate-500 truncate block w-full" title={item.desc}>{item.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
