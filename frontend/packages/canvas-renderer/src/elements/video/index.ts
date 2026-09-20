import React from 'react';
import { Video } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { videoPropControls } from './schema';
import { videoDefaults } from './defaults';

export const videoElementDefinition: ElementDefinition = {
  type: 'video',
  label: 'Vídeo',
  description: 'Player de vídeo incorporado do YouTube ou Vimeo',
  icon: Video,
  category: 'media',
  features: { inlineTextEditable: false, supportsTypography: false, supportsBackground: false, supportsBorder: true, supportsHover: true, supportsAction: false },
  propControls: videoPropControls,
  defaultProps: videoDefaults.defaultProps,
  defaultStyle: videoDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(videoElementDefinition);
