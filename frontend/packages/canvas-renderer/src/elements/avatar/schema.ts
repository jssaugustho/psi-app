import { PropertyControlSpec } from '../../elementRegistry';

export const avatarPropControls: PropertyControlSpec[] = [
  { name: 'src', label: 'Foto de Perfil (Upload / URL)', type: 'image', defaultValue: '', category: 'content' },
  { name: 'name', label: 'Nome do Profissional', type: 'text', defaultValue: 'Dra. Ana Silva', category: 'content' },
  { name: 'role', label: 'Especialidade / Cargo', type: 'text', defaultValue: 'Psicóloga Clínica', category: 'content' },
];
