import { PropertyControlSpec } from '../../elementRegistry';

export const spacerPropControls: PropertyControlSpec[] = [
  { name: 'height', label: 'Altura do Espaçador', type: 'slider', defaultValue: 32, min: 8, max: 160, step: 4, unit: 'px', category: 'layout' },
];
