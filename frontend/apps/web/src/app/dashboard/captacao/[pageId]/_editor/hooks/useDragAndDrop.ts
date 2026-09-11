import { useCallback } from 'react';
import {
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CanvasData, ComponentType } from '../types';
import { validateCanvasOperation, moveSection, findElementInCanvas } from '../utils/canvasHelpers';
import { createDefaultSection, createDefaultDiv, createDefaultComponent } from '../constants';

interface UseDragAndDropProps {
  canvasData: CanvasData | null;
  onUpdateCanvas: (newCanvas: CanvasData) => void;
  onSelectElement: (id: string | null, type?: any) => void;
}

export function useDragAndDrop({
  canvasData,
  onUpdateCanvas,
  onSelectElement,
}: UseDragAndDropProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || !canvasData) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      // 1. SOLTAR ITEM DA SIDEBAR NO CANVAS (NOVO ELEMENTO)
      if (activeData?.isSidebarItem) {
        const itemType = activeData.type as ComponentType | 'section';
        const sectionTemplate = activeData.sectionTemplate;

        // 1.1 Seção vinda da Sidebar
        if (itemType === 'section') {
          const newSec = createDefaultSection(activeData.label || 'Nova Seção');
          if (sectionTemplate === '2-cols') {
            const div1 = createDefaultDiv('Coluna 1');
            const div2 = createDefaultDiv('Coluna 2');
            div1.layout.flexBasis = '50%';
            div2.layout.flexBasis = '50%';
            newSec.components = [div1, div2];
            newSec.layout.flexDirection = 'row';
          } else if (sectionTemplate === '3-cols') {
            const div1 = createDefaultDiv('Coluna 1');
            const div2 = createDefaultDiv('Coluna 2');
            const div3 = createDefaultDiv('Coluna 3');
            div1.layout.flexBasis = '33.33%';
            div2.layout.flexBasis = '33.33%';
            div3.layout.flexBasis = '33.33%';
            newSec.components = [div1, div2, div3];
            newSec.layout.flexDirection = 'row';
          }

          const sections = [...canvasData.sections];
          sections.push(newSec);
          onUpdateCanvas({ ...canvasData, sections });
          onSelectElement(newSec.id, 'section');
          return;
        }

        // 1.2 Componente (Div ou Atômico) vindo da Sidebar
        const targetParentId = overData?.parentId || over.id;
        const parentFound = findElementInCanvas(canvasData, targetParentId);
        if (!parentFound) return;

        const parentType = parentFound.element.type === 'section' ? 'section' : 'div';
        if (!validateCanvasOperation(itemType, parentType)) {
          return; // Operação inválida (ex: div dentro de div)
        }

        const newComp = itemType === 'div'
          ? createDefaultDiv('Container (Div)')
          : createDefaultComponent(itemType as any);

        const sections = canvasData.sections.map((sec) => {
          if (sec.id === targetParentId) {
            return { ...sec, components: [...sec.components, newComp] };
          }
          if (sec.components.some((c) => c.id === targetParentId)) {
            const updatedComps = sec.components.map((c) => {
              if (c.id === targetParentId && c.type === 'div') {
                return { ...c, components: [...c.components, newComp as any] };
              }
              return c;
            });
            return { ...sec, components: updatedComps };
          }
          return sec;
        });

        onUpdateCanvas({ ...canvasData, sections });
        onSelectElement(newComp.id, newComp.type);
        return;
      }

      // 2. REORDENAÇÃO DE SEÇÕES NO CANVAS
      if (activeData?.type === 'section' && overData?.type === 'section') {
        const fromIndex = canvasData.sections.findIndex((s) => s.id === active.id);
        const toIndex = canvasData.sections.findIndex((s) => s.id === over.id);
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          const updated = moveSection(canvasData, fromIndex, toIndex);
          onUpdateCanvas(updated);
        }
      }
    },
    [canvasData, onUpdateCanvas, onSelectElement]
  );

  return {
    sensors,
    handleDragEnd,
  };
}
