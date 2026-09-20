import { PropertyControlSpec } from '../../elementRegistry';

export const iconPropControls: PropertyControlSpec[] = [
  {
    name: 'iconName',
    label: 'Ícone Lucide',
    type: 'icon',
    defaultValue: 'Sparkles',
    category: 'content',
  },
  {
    name: 'size',
    label: 'Tamanho do Ícone',
    type: 'slider',
    defaultValue: 24,
    min: 12,
    max: 120,
    step: 2,
    unit: 'px',
    category: 'appearance',
  },
  {
    name: 'color',
    label: 'Cor do Ícone',
    type: 'color',
    defaultValue: 'var(--brand-gradient-start)',
    category: 'appearance',
  },
];
