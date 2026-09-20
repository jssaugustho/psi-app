'use client';

import React from 'react';
import { Component, DivComponent, CarouselComponent, AtomicComponent, GlobalInstanceComponent, ViewportMode, CanvasData } from './types';
import { DivWrapper } from './DivWrapper';
import { CarouselWrapper } from './CarouselWrapper';
import { AtomicComponentWrapper } from './AtomicComponentWrapper';
import { resolveGlobalInstance } from './utils/resolveGlobalInstance';

interface ComponentWrapperProps {
  component: Component;
  selectedId?: string | null;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  viewportMode?: ViewportMode;
  page?: any;
  canvasData?: CanvasData | null;
  onSelect?: (id: string, type: any) => void;
  onRemove?: (id: string) => void;
  onUpdateComponent?: (id: string, patch: any) => void;
  onAddComponent?: (parentId: string, comp: any) => void;
  onMoveElement?: (elementId: string, targetParentId: string) => void;
  onMoveElementBeforeOrAfter?: (elementId: string, targetElementId: string, position: 'before' | 'after') => void;
  onAddComponentBeforeOrAfter?: (targetElementId: string, comp: any, position: 'before' | 'after') => void;
  onContextMenu?: (e: React.MouseEvent, id: string, type: string) => void;
  onCtaClick?: () => void;
  isPublicView?: boolean;
}

export function ComponentWrapper({
  component,
  selectedId = null,
  hoveredId = null,
  onHover,
  viewportMode = 'desktop',
  page,
  canvasData,
  onSelect,
  onRemove,
  onUpdateComponent,
  onAddComponent,
  onMoveElement,
  onMoveElementBeforeOrAfter,
  onAddComponentBeforeOrAfter,
  onContextMenu,
  onCtaClick,
  isPublicView = false,
}: ComponentWrapperProps) {
  if (component.type === 'global_instance') {
    const instance = component as GlobalInstanceComponent;
    const masterName = (canvasData?.globalComponentsMap?.[instance.globalComponentId]?.name) || 'Elemento Global';
    const resolvedComponent = resolveGlobalInstance(instance, canvasData?.globalComponentsMap);
    const isInstanceSelected = !isPublicView && selectedId === instance.id;

    return (
      <div
        className={`relative transition-all duration-150 ${
          isInstanceSelected ? 'outline outline-2 outline-purple-500 dark:outline-purple-400 -outline-offset-2 rounded-lg shadow-lg shadow-purple-500/10' : ''
        }`}
        onClick={(e) => {
          if (!isPublicView && onSelect) {
            e.stopPropagation();
            onSelect(instance.id, 'global_instance');
          }
        }}
      >
        {isInstanceSelected && (
          <div className="absolute -top-7 left-2 z-30 flex items-center gap-1.5 px-2.5 py-0.5 rounded-t-md bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white text-[10px] font-extrabold shadow-md pointer-events-none select-none">
            <span className="animate-pulse">✨</span>
            <span>Elemento Global: {masterName}</span>
          </div>
        )}
        <ComponentWrapper
          component={resolvedComponent}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onHover={onHover}
          viewportMode={viewportMode}
          page={page}
          canvasData={canvasData}
          onSelect={(id, type) => {
            if (!isPublicView && onSelect) {
              onSelect(instance.id, 'global_instance');
            }
          }}
          onRemove={onRemove}
          onUpdateComponent={onUpdateComponent}
          onAddComponent={onAddComponent}
          onMoveElement={onMoveElement}
          onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
          onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
          onContextMenu={(e) => {
            if (!isPublicView && onContextMenu) {
              e.stopPropagation();
              onContextMenu(e, instance.id, 'global_instance');
            }
          }}
          onCtaClick={onCtaClick}
          isPublicView={isPublicView}
        />
      </div>
    );
  }

  if (component.type === 'carousel') {
    return (
      <CarouselWrapper
        carouselComponent={component as CarouselComponent}
        selectedId={selectedId}
        viewportMode={viewportMode}
        page={page}
        canvasData={canvasData}
        onSelect={onSelect}
        onRemove={onRemove}
        onUpdateComponent={onUpdateComponent}
        onAddComponent={onAddComponent}
        onMoveElement={onMoveElement}
        onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
        onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
        onContextMenu={onContextMenu}
        onCtaClick={onCtaClick}
        isPublicView={isPublicView}
      />
    );
  }

  if (component.type === 'div') {
    return (
      <DivWrapper
        divComponent={component as DivComponent}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onHover={onHover}
        viewportMode={viewportMode}
        page={page}
        canvasData={canvasData}
        onSelect={onSelect}
        onRemove={onRemove}
        onUpdateComponent={onUpdateComponent}
        onAddComponent={onAddComponent}
        onMoveElement={onMoveElement}
        onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
        onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
        onContextMenu={onContextMenu}
        onCtaClick={onCtaClick}
        isPublicView={isPublicView}
      />
    );
  }

  return (
    <AtomicComponentWrapper
      component={component as AtomicComponent}
      isSelected={!isPublicView && selectedId === component.id}
      hoveredId={hoveredId}
      onHover={onHover}
      viewportMode={viewportMode}
      page={page}
      canvasData={canvasData}
      onSelect={onSelect}
      onRemove={onRemove}
      onUpdateComponent={onUpdateComponent}
      onMoveElementBeforeOrAfter={onMoveElementBeforeOrAfter}
      onAddComponentBeforeOrAfter={onAddComponentBeforeOrAfter}
      onContextMenu={onContextMenu}
      onCtaClick={onCtaClick}
      isPublicView={isPublicView}
    />
  );
}

