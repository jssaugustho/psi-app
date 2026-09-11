import React from 'react';
import {
  Square,
  Columns2,
  Columns3,
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
  GripVertical
} from 'lucide-react';
import { AtomicComponentType } from '../types';

interface ElementPaletteProps {
  onAddComponent: (type: 'div' | AtomicComponentType, preset?: string) => void;
}

interface PaletteItem {
  type: 'div' | AtomicComponentType;
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
        { type: 'div' as const, preset: 'single', label: 'Container / Seção', icon: Square, desc: 'Nível 1 na raiz = Seção | Nível 2 = Div' },
        { type: 'div' as const, preset: '2col', label: '2 Colunas', icon: Columns2, desc: 'Grade de 2 colunas flex' },
        { type: 'div' as const, preset: '3col', label: '3 Colunas', icon: Columns3, desc: 'Grade de 3 colunas flex' },
      ],
    },
    {
      title: 'TIPOGRAFIA',
      items: [
        { type: 'heading' as const, label: 'Título', icon: Heading, desc: 'H1 a H6 editável' },
        { type: 'paragraph' as const, label: 'Parágrafo', icon: AlignLeft, desc: 'Texto de apresentação' },
        { type: 'label' as const, label: 'Subtítulo / Tag', icon: Type, desc: 'Texto curto de apoio' },
        { type: 'list' as const, label: 'Lista de Itens', icon: List, desc: 'Tópicos com ícone check' },
      ],
    },
    {
      title: 'MÍDIA & VISUAL',
      items: [
        { type: 'image' as const, label: 'Imagem R2', icon: ImageIcon, desc: 'Upload de foto' },
        { type: 'video' as const, label: 'Vídeo Embed', icon: Video, desc: 'YouTube ou Vimeo' },
        { type: 'icon' as const, label: 'Ícone Lucide', icon: Sparkles, desc: 'Vetor customizável' },
        { type: 'divider' as const, label: 'Separador', icon: Minus, desc: 'Linha divisória' },
      ],
    },
    {
      title: 'AÇÃO & CONVERSÃO',
      items: [
        { type: 'button' as const, label: 'Botão CTA', icon: MousePointerClick, desc: 'Ação principal' },
        { type: 'logo' as const, label: 'Logotipo', icon: UserCheck, desc: 'Marca do profissional' },
        { type: 'avatar' as const, label: 'Foto de Perfil', icon: User, desc: 'Avatar circular' },
      ],
    },
    {
      title: 'CARD & ESTRUTURA',
      items: [
        { type: 'badge' as const, label: 'Badge / Tag', icon: Award, desc: 'Chip de destaque' },
        { type: 'testimonial' as const, label: 'Depoimento', icon: MessageSquare, desc: 'Citação de paciente' },
        { type: 'stat_counter' as const, label: 'Contador', icon: BarChart3, desc: 'Métricas de impacto' },
        { type: 'faq_item' as const, label: 'Pergunta FAQ', icon: HelpCircle, desc: 'Acordeão expansível' },
        { type: 'card' as const, label: 'Card Informativo', icon: CreditCard, desc: 'Bloco em cartão' },
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
                  className="p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm hover:border-[var(--brand-gradient-start)] hover:glass-md transition-all text-left flex flex-col justify-between space-y-1.5 group cursor-grab active:cursor-grabbing select-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[var(--brand-gradient-start)]/10 text-[var(--brand-gradient-start)] group-hover:brand-accent group-hover:text-white transition-colors">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.label}
                      </span>
                    </div>
                    <GripVertical className="w-3 h-3 text-slate-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[8px] text-slate-500 truncate">{item.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
