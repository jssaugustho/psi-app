import { PropertyControlSpec } from '../../elementRegistry';

export const videoPropControls: PropertyControlSpec[] = [
  { name: 'videoUrl', label: 'URL do Vídeo (YouTube / Vimeo)', type: 'text', defaultValue: '', category: 'content' },
  { name: 'autoplay', label: 'Reprodução Automática', type: 'boolean', defaultValue: false, category: 'content' },
];
