import { PropertyControlSpec } from '../../elementRegistry';

export const testimonialPropControls: PropertyControlSpec[] = [
  { name: 'quote', label: 'Depoimento / Citação', type: 'textarea', defaultValue: 'Excelente profissional, me ajudou muito no meu processo de autoconhecimento.', category: 'content' },
  { name: 'authorName', label: 'Nome do Paciente / Cliente', type: 'text', defaultValue: 'M. S.', category: 'content' },
  { name: 'authorRole', label: 'Detalhes (ex: Paciente há 1 ano)', type: 'text', defaultValue: 'Atendimento Online', category: 'content' },
];
