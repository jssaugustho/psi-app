import { PropertyControlSpec } from '../../elementRegistry';

export const imagePropControls: PropertyControlSpec[] = [
  {
    name: 'src',
    label: 'Imagem (Upload ou URL)',
    type: 'image',
    defaultValue: '',
    category: 'content',
  },
  {
    name: 'alt',
    label: 'Texto Alternativo (ALT)',
    type: 'text',
    defaultValue: 'Imagem de exibição',
    category: 'content',
  },
  {
    name: 'objectFit',
    label: 'Ajuste da Imagem (Object Fit)',
    type: 'select',
    defaultValue: 'cover',
    options: [
      { label: 'Cobrir (Cover)', value: 'cover' },
      { label: 'Conter (Contain)', value: 'contain' },
      { label: 'Preencher (Fill)', value: 'fill' },
    ],
    category: 'appearance',
  },
  {
    name: 'aspectRatio',
    label: 'Proporção de Tela',
    type: 'select',
    defaultValue: 'auto',
    options: [
      { label: 'Automática', value: 'auto' },
      { label: 'Quadrado (1:1)', value: '1/1' },
      { label: 'Horizontal (16:9)', value: '16/9' },
      { label: 'Retrato (4:5)', value: '4/5' },
    ],
    category: 'appearance',
  },
];
