import { PropertyControlSpec } from '../../elementRegistry';

export const faqItemPropControls: PropertyControlSpec[] = [
  { name: 'question', label: 'Pergunta (Título)', type: 'text', defaultValue: 'Como funciona o primeiro atendimento?', category: 'content' },
  { name: 'answer', label: 'Resposta (Explicação)', type: 'textarea', defaultValue: 'No primeiro encontro realizamos uma anamnese completa...', category: 'content' },
];
