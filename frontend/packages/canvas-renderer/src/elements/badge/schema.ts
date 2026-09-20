import { PropertyControlSpec } from '../../elementRegistry';

export const badgePropControls: PropertyControlSpec[] = [
  { name: 'text', label: 'Texto do Selo', type: 'text', defaultValue: 'Destaque', category: 'content' },
  { name: 'icon', label: 'Ícone Lucide', type: 'icon', defaultValue: 'Award', category: 'content' },
];
