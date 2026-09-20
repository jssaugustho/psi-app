import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { imagePropControls } from './schema';
import { imageDefaults } from './defaults';

export const imageElementDefinition: ElementDefinition = {
  type: 'image',
  label: 'Imagem / Foto',
  description: 'Upload de foto com ajuste de tamanho e bordas',
  icon: ImageIcon,
  category: 'media',
  features: {
    inlineTextEditable: false,
    supportsTypography: false,
    supportsBackground: false,
    supportsBorder: true,
    supportsHover: true,
    supportsAction: false,
  },
  propControls: imagePropControls,
  defaultProps: imageDefaults.defaultProps,
  defaultStyle: imageDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(imageElementDefinition);
