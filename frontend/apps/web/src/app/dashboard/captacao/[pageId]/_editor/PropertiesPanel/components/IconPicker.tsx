'use client';

import React, { useState } from 'react';
import {
  Brain,
  Heart,
  HeartHandshake,
  Shield,
  Calendar,
  Check,
  Sparkles,
  User,
  UserCheck,
  Phone,
  Mail,
  Award,
  Zap,
  BookOpen,
  Smile,
  Activity,
  Headphones,
  Star,
  MessageSquare,
  HelpCircle,
  Clock,
  MapPin,
  CreditCard,
  ArrowRight,
  Lock,
  Compass,
  Sun,
  Moon,
  Feather,
  Target,
  TrendingUp,
  ThumbsUp,
  Search,
  CheckCircle,
  FileText,
  Video,
  Layers,
  LucideIcon
} from 'lucide-react';
import { Input } from '@psi/ui';

export const POPULAR_ICONS: Array<{ name: string; icon: LucideIcon; category: string }> = [
  // Psicologia & Saúde
  { name: 'Brain', icon: Brain, category: 'Psicologia & Saúde' },
  { name: 'Heart', icon: Heart, category: 'Psicologia & Saúde' },
  { name: 'HeartHandshake', icon: HeartHandshake, category: 'Psicologia & Saúde' },
  { name: 'Smile', icon: Smile, category: 'Psicologia & Saúde' },
  { name: 'Activity', icon: Activity, category: 'Psicologia & Saúde' },
  { name: 'Feather', icon: Feather, category: 'Psicologia & Saúde' },
  { name: 'Sun', icon: Sun, category: 'Psicologia & Saúde' },
  { name: 'Moon', icon: Moon, category: 'Psicologia & Saúde' },

  // Atendimento & Acolhimento
  { name: 'User', icon: User, category: 'Atendimento' },
  { name: 'UserCheck', icon: UserCheck, category: 'Atendimento' },
  { name: 'Calendar', icon: Calendar, category: 'Atendimento' },
  { name: 'Phone', icon: Phone, category: 'Atendimento' },
  { name: 'Mail', icon: Mail, category: 'Atendimento' },
  { name: 'Headphones', icon: Headphones, category: 'Atendimento' },
  { name: 'Video', icon: Video, category: 'Atendimento' },
  { name: 'MessageSquare', icon: MessageSquare, category: 'Atendimento' },
  { name: 'Clock', icon: Clock, category: 'Atendimento' },
  { name: 'MapPin', icon: MapPin, category: 'Atendimento' },

  // Confiança & Qualidade
  { name: 'Shield', icon: Shield, category: 'Confiança' },
  { name: 'Check', icon: Check, category: 'Confiança' },
  { name: 'CheckCircle', icon: CheckCircle, category: 'Confiança' },
  { name: 'Award', icon: Award, category: 'Confiança' },
  { name: 'Star', icon: Star, category: 'Confiança' },
  { name: 'Sparkles', icon: Sparkles, category: 'Confiança' },
  { name: 'Lock', icon: Lock, category: 'Confiança' },
  { name: 'ThumbsUp', icon: ThumbsUp, category: 'Confiança' },

  // Ação & CTA
  { name: 'Zap', icon: Zap, category: 'Ação & Geral' },
  { name: 'Target', icon: Target, category: 'Ação & Geral' },
  { name: 'BookOpen', icon: BookOpen, category: 'Ação & Geral' },
  { name: 'TrendingUp', icon: TrendingUp, category: 'Ação & Geral' },
  { name: 'CreditCard', icon: CreditCard, category: 'Ação & Geral' },
  { name: 'ArrowRight', icon: ArrowRight, category: 'Ação & Geral' },
  { name: 'HelpCircle', icon: HelpCircle, category: 'Ação & Geral' },
  { name: 'Compass', icon: Compass, category: 'Ação & Geral' },
  { name: 'FileText', icon: FileText, category: 'Ação & Geral' },
  { name: 'Layers', icon: Layers, category: 'Ação & Geral' },
];

export function getLucideIcon(iconName?: string): LucideIcon {
  if (!iconName) return Sparkles;
  const found = POPULAR_ICONS.find((item) => item.name.toLowerCase() === iconName.toLowerCase());
  return found ? found.icon : Sparkles;
}

interface IconPickerProps {
  selectedName?: string;
  onSelectIcon: (iconName: string) => void;
}

export function IconPicker({ selectedName = 'Sparkles', onSelectIcon }: IconPickerProps) {
  const [search, setSearch] = useState('');

  const filteredIcons = POPULAR_ICONS.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ícone (ex: Heart, Calendar, Shield)..."
          className="pl-8 text-xs"
        />
      </div>

      <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 border border-[var(--surface-border)] rounded-xl glass-sm custom-scrollbar">
        {filteredIcons.map((item) => {
          const IconComp = item.icon;
          const isSelected = item.name.toLowerCase() === selectedName.toLowerCase();
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onSelectIcon(item.name)}
              className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-[var(--surface-hover)]'
              }`}
              title={`${item.name} (${item.category})`}
            >
              <IconComp className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
