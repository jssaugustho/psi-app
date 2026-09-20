import { PropertyControlSpec } from '../../elementRegistry';

export const headingPropControls: PropertyControlSpec[] = [
  {
    name: 'text',
    label: 'Texto do Título',
    type: 'text',
    defaultValue: 'Título Principal',
    category: 'content',
  },
  {
    name: 'level',
    label: 'Nível Hierárquico',
    type: 'select',
    defaultValue: 2,
    options: [
      { label: 'H1 — Título Principal', value: 1 },
      { label: 'H2 — Título Secundário', value: 2 },
      { label: 'H3 — Subtítulo de Seção', value: 3 },
      { label: 'H4 — Subtítulo Pequeno', value: 4 },
    ],
    category: 'content',
  },
];
