import { PropertyControlSpec } from '../../elementRegistry';

export const cardPropControls: PropertyControlSpec[] = [
  { name: 'title', label: 'Título do Card', type: 'text', defaultValue: 'Título do Card', category: 'content' },
  { name: 'description', label: 'Descrição / Conteúdo', type: 'textarea', defaultValue: 'Texto explicativo dentro do card.', category: 'content' },
  { name: 'badgeText', label: 'Selo do Card (Badge)', type: 'text', defaultValue: '', category: 'content' },
  { name: 'icon', label: 'Ícone Lucide', type: 'icon', defaultValue: '', category: 'content' },
];
