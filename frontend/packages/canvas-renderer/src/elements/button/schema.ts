import { PropertyControlSpec } from '../../elementRegistry';

export const buttonPropControls: PropertyControlSpec[] = [
  {
    name: 'label',
    label: 'Texto do Botão',
    type: 'text',
    defaultValue: 'Agendar Consulta',
    category: 'content',
  },
  {
    name: 'action',
    label: 'Destino / Ação',
    type: 'action',
    defaultValue: 'cta_primary',
    category: 'action',
  },
  {
    name: 'variant',
    label: 'Variante Visual',
    type: 'select',
    defaultValue: 'primary',
    options: [
      { label: 'Primário (Destaque)', value: 'primary' },
      { label: 'Secundário / Outline', value: 'outline' },
      { label: 'Gradiente da Marca', value: 'gradient' },
      { label: 'Vidro (Glassmorphic)', value: 'glass' },
    ],
    category: 'appearance',
  },
  {
    name: 'icon',
    label: 'Ícone Lucide',
    type: 'icon',
    defaultValue: '',
    category: 'content',
  },
  {
    name: 'iconPosition',
    label: 'Posição do Ícone',
    type: 'select',
    defaultValue: 'left',
    options: [
      { label: 'Esquerda', value: 'left' },
      { label: 'Direita', value: 'right' },
    ],
    category: 'content',
  },
];
