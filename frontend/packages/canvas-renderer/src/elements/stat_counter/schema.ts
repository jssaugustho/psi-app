import { PropertyControlSpec } from '../../elementRegistry';

export const statCounterPropControls: PropertyControlSpec[] = [
  { name: 'value', label: 'Valor Numérico', type: 'text', defaultValue: '500+', category: 'content' },
  { name: 'label', label: 'Rótulo / Descrição', type: 'text', defaultValue: 'Pacientes Atendidos', category: 'content' },
];
