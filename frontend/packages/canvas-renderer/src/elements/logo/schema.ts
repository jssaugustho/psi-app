import { PropertyControlSpec } from '../../elementRegistry';

export const logoPropControls: PropertyControlSpec[] = [
  { name: 'logoMode', label: 'Modo do Logotipo', type: 'select', defaultValue: 'workspace', options: [{ value: 'workspace', label: 'Marca do Workspace' }, { value: 'custom_text', label: 'Texto Customizado' }, { value: 'custom_image', label: 'Imagem da Marca' }], category: 'content' },
  { name: 'customText', label: 'Texto da Marca', type: 'text', defaultValue: 'PsiApp', category: 'content' },
];
