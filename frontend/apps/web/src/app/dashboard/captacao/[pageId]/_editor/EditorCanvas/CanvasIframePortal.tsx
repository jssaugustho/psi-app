'use client';

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { CanvasRenderer as SharedCanvasRenderer, CanvasData, ViewportMode } from '@psi/canvas-renderer';

export interface CanvasIframePortalProps {
  canvasData: CanvasData | null;
  viewportMode: ViewportMode;
  page?: any;
  isPublicView?: boolean;
}

export interface CanvasIframePortalRef {
  iframeEl: HTMLIFrameElement | null;
  iframeDoc: Document | null;
  iframeWin: Window | null;
}

export const CanvasIframePortal = forwardRef<CanvasIframePortalRef, CanvasIframePortalProps>(
  ({ canvasData, viewportMode, page, isPublicView = false }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
    const [iframeDoc, setIframeDoc] = useState<Document | null>(null);

    useImperativeHandle(ref, () => ({
      iframeEl: iframeRef.current,
      iframeDoc: iframeRef.current?.contentDocument || null,
      iframeWin: iframeRef.current?.contentWindow || null,
    }));

    // Copia estilos, links de CSS e variáveis do documento pai para o <head> do iframe
    const syncIframeStyles = (doc: Document) => {
      if (!doc || !doc.head) return;

      // Injeta estilos das tags <style> e <link rel="stylesheet"> do pai
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach((styleNode, idx) => {
        if (!doc.head.querySelector(`[data-style-idx="${idx}"]`)) {
          const clone = styleNode.cloneNode(true) as HTMLElement;
          clone.setAttribute('data-style-idx', String(idx));
          doc.head.appendChild(clone);
        }
      });

      // Configura html e body do iframe para transparência e 100% de largura
      if (doc.documentElement) {
        doc.documentElement.style.margin = '0';
        doc.documentElement.style.padding = '0';
        doc.documentElement.style.minHeight = '100%';
        doc.documentElement.style.backgroundColor = 'transparent';
      }

      if (doc.body) {
        doc.body.style.margin = '0';
        doc.body.style.padding = '0';
        doc.body.style.minHeight = '100%';
        doc.body.style.overflowX = 'hidden';
        doc.body.style.backgroundColor = 'transparent';
      }
    };

    useEffect(() => {
      // Suprime avisos de ResizeObserver loop no window.onerror do pai
      const prevOnError = window.onerror;
      window.onerror = (msg, url, line, col, err) => {
        if (typeof msg === 'string' && msg.includes('ResizeObserver loop')) {
          return true; // Cancela propagação para o modal do Next.js
        }
        if (prevOnError) return prevOnError(msg, url, line, col, err);
        return false;
      };

      const handleParentError = (e: ErrorEvent) => {
        if (e.message && e.message.includes('ResizeObserver loop')) {
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      };
      window.addEventListener('error', handleParentError);

      const iframe = iframeRef.current;
      if (!iframe) return;

      const initIframe = () => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          const win = iframe.contentWindow;

          if (!doc || !win || !doc.body) return;

          syncIframeStyles(doc);
          setIframeDoc(doc);
          setMountNode(doc.body);

          // Helper de ativação da edição inline de texto
          const activateInlineTextEdit = (el: HTMLElement, nodeId: string) => {
            let textContainer: HTMLElement = el;
            const textChild = el.querySelector('h1, h2, h3, h4, h5, h6, p, span, a, button, label');
            if (textChild && textChild instanceof HTMLElement) {
              textContainer = textChild;
            }

            if (textContainer.isContentEditable) return;

            textContainer.contentEditable = 'true';
            textContainer.spellcheck = false;
            textContainer.style.outline = '2px dashed #9333ea';
            textContainer.style.outlineOffset = '2px';
            textContainer.style.cursor = 'text';

            textContainer.focus();

            try {
              const range = doc.createRange();
              range.selectNodeContents(textContainer);
              const sel = win.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            } catch (_) {}

            const handlePaste = (pe: ClipboardEvent) => {
              pe.preventDefault();
              const plainText = pe.clipboardData?.getData('text/plain') || '';
              doc.execCommand('insertText', false, plainText);
            };

            const isSingleLine =
              ['button', 'badge', 'label', 'a'].includes(el.tagName.toLowerCase()) ||
              textContainer.tagName.toLowerCase() === 'span' ||
              textContainer.tagName.toLowerCase() === 'button';

            const handleKeyDown = (ke: KeyboardEvent) => {
              if (ke.key === 'Escape') {
                textContainer.blur();
              }
              if (ke.key === 'Enter' && isSingleLine) {
                ke.preventDefault();
                textContainer.blur();
              }
            };

            const handleBlur = () => {
              textContainer.contentEditable = 'false';
              textContainer.style.outline = '';
              textContainer.style.outlineOffset = '';
              textContainer.style.cursor = '';

              textContainer.removeEventListener('paste', handlePaste);
              textContainer.removeEventListener('keydown', handleKeyDown);
              textContainer.removeEventListener('blur', handleBlur);

              const updatedText = textContainer.innerText || textContainer.textContent || '';
              const updatedHtml = textContainer.innerHTML;

              win.parent.postMessage(
                {
                  type: 'TEXT_EDIT_COMMITTED',
                  payload: {
                    nodeId,
                    text: updatedText,
                    html: updatedHtml,
                  },
                },
                '*'
              );
            };

            textContainer.addEventListener('paste', handlePaste);
            textContainer.addEventListener('keydown', handleKeyDown);
            textContainer.addEventListener('blur', handleBlur);
          };

          // Escuta comando de ativação de texto vindo do pai
          const handleActivateMessage = (ev: MessageEvent) => {
            if (ev.data?.type === 'ACTIVATE_TEXT_EDIT' && ev.data.payload?.nodeId) {
              const el = doc.querySelector(`[data-node-id="${ev.data.payload.nodeId}"]`) as HTMLElement | null;
              if (el) {
                activateInlineTextEdit(el, ev.data.payload.nodeId);
              }
            }
          };
          win.removeEventListener('message', handleActivateMessage);
          win.addEventListener('message', handleActivateMessage);

          // 1. Desativa formulários, links e botões nativos para evitar navegação durante a edição
          const handlePreventNavigation = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            const interactive = target.closest('a, button, form');
            if (interactive) {
              if (interactive.tagName === 'A' || interactive.tagName === 'FORM') {
                e.preventDefault();
              }
            }
          };

          doc.removeEventListener('click', handlePreventNavigation, true);
          doc.addEventListener('click', handlePreventNavigation, true);

          // 2. Duplo Clique para Ativar Edição Inline de Texto
          const handleDblClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            const closest = target?.closest('[data-node-id]') as HTMLElement | null;
            if (!closest) return;
            const nodeId = closest.getAttribute('data-node-id');
            if (nodeId) {
              activateInlineTextEdit(closest, nodeId);
            }
          };

          doc.removeEventListener('dblclick', handleDblClick);
          doc.addEventListener('dblclick', handleDblClick);

          // 2. Telemetria de Hover (MouseMove / MouseLeave)
          const handleMouseMove = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            const closest = target?.closest('[data-node-id]');
            const nodeId = closest?.getAttribute('data-node-id') || null;
            win.parent.postMessage(
              {
                type: 'CANVAS_ELEMENT_HOVERED',
                payload: { nodeId },
              },
              '*'
            );
          };

          const handleMouseLeave = () => {
            win.parent.postMessage(
              {
                type: 'CANVAS_ELEMENT_HOVERED',
                payload: { nodeId: null },
              },
              '*'
            );
          };

          doc.removeEventListener('mousemove', handleMouseMove);
          doc.addEventListener('mousemove', handleMouseMove, { passive: true });
          doc.removeEventListener('mouseleave', handleMouseLeave);
          doc.addEventListener('mouseleave', handleMouseLeave, { passive: true });

          // 3. Telemetria de Clique / Seleção de Elemento
          const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            const closest = target?.closest('[data-node-id]');
            const nodeId = closest?.getAttribute('data-node-id') || null;
            const type = closest?.tagName.toLowerCase() || null;

            win.parent.postMessage(
              {
                type: 'CANVAS_ELEMENT_CLICKED',
                payload: { nodeId, type },
              },
              '*'
            );
          };

          doc.removeEventListener('click', handleClick);
          doc.addEventListener('click', handleClick);

          // 4. Telemetria de Botão Direito / Menu de Contexto
          const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const target = e.target as HTMLElement | null;
            const closest = target?.closest('[data-node-id]');
            const nodeId = closest?.getAttribute('data-node-id') || null;
            const type = closest?.tagName.toLowerCase() || null;

            const iframeRect = iframe.getBoundingClientRect();
            const x = e.clientX + iframeRect.left;
            const y = e.clientY + iframeRect.top;

            win.parent.postMessage(
              {
                type: 'CANVAS_CONTEXT_MENU',
                payload: { nodeId, type, x, y },
              },
              '*'
            );
          };

          doc.removeEventListener('contextmenu', handleContextMenu);
          doc.addEventListener('contextmenu', handleContextMenu);

          // 5. Telemetria de Drag & Drop (Soltura de Elementos)
          const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            const target = e.target as HTMLElement | null;
            const closest = target?.closest('[data-node-id]') as HTMLElement | null;
            if (!closest) return;

            const sTop = win.scrollY || doc.documentElement.scrollTop || 0;
            const sLeft = win.scrollX || doc.documentElement.scrollLeft || 0;

            // Encontra o container de destino correspondente
            let containerEl: HTMLElement = closest;
            const isClosestContainer = closest.getAttribute('data-is-container') === 'true';

            if (!isClosestContainer) {
              // Se for elemento atômico, o container de destino é o container pai que o contém
              const parentContainer = closest.parentElement?.closest('[data-is-container="true"]') as HTMLElement | null;
              if (parentContainer) {
                containerEl = parentContainer;
              }
            }

            // Coleta os filhos diretos com data-node-id do containerEl
            const allNodes = Array.from(containerEl.querySelectorAll('[data-node-id]')) as HTMLElement[];
            const directChildren = allNodes.filter((child) => {
              if (child === containerEl) return false;
              const nearestContainer = child.parentElement?.closest('[data-is-container="true"]');
              return nearestContainer === containerEl;
            });

            // Determina a orientação do layout do container (horizontal vs vertical)
            const containerStyle = win.getComputedStyle(containerEl);
            let isHorizontal = containerStyle.display.includes('flex') && containerStyle.flexDirection.includes('row');

            // Se houver pelo menos 2 filhos diretos, verifica a orientação pelas posições visuais
            if (directChildren.length >= 2) {
              const r0 = directChildren[0].getBoundingClientRect();
              const r1 = directChildren[1].getBoundingClientRect();
              const dx = Math.abs(r1.left - r0.left);
              const dy = Math.abs(r1.top - r0.top);
              if (dx > dy * 1.5) {
                isHorizontal = true;
              } else if (dy > dx * 1.5) {
                isHorizontal = false;
              }
            }

            let position: 'before' | 'after' | 'inside' = 'inside';
            let targetNodeId = containerEl.getAttribute('data-node-id') || '';
            let top = 0;
            let left = 0;
            let width = 0;
            let height = 4;

            if (directChildren.length === 0) {
              // Container totalmente vazio: exibe indicador inside translúcido
              const cRect = containerEl.getBoundingClientRect();
              position = 'inside';
              targetNodeId = containerEl.getAttribute('data-node-id') || '';
              top = cRect.top + sTop;
              left = cRect.left + sLeft;
              width = cRect.width;
              height = cRect.height;
            } else {
              // Container possui filhos: ordena os filhos conforme a direção do layout
              const sortedChildren = [...directChildren].sort((a, b) => {
                const rA = a.getBoundingClientRect();
                const rB = b.getBoundingClientRect();
                return isHorizontal ? rA.left - rB.left : rA.top - rB.top;
              });

              const firstChild = sortedChildren[0];
              const lastChild = sortedChildren[sortedChildren.length - 1];
              const firstRect = firstChild.getBoundingClientRect();
              const lastRect = lastChild.getBoundingClientRect();
              const containerRect = containerEl.getBoundingClientRect();

              if (!isHorizontal) {
                // ==========================================
                // LAYOUT VERTICAL (COLUNA)
                // ==========================================
                // A linha azul de indicação sempre expande por toda a largura do container
                left = containerRect.left + sLeft;
                width = containerRect.width;
                height = 4;

                // ZONA A: INÍCIO DO CONTAINER (topo do container até 45% do 1º filho ou padding superior)
                const isBeforeFirst =
                  e.clientY <= containerRect.top + 28 ||
                  e.clientY < firstRect.top + Math.max(16, firstRect.height * 0.45);

                // ZONA B: FIM DO CONTAINER (base do container a partir de 55% do último filho ou padding inferior)
                const isAfterLast =
                  e.clientY >= containerRect.bottom - 28 ||
                  e.clientY > lastRect.top + Math.min(lastRect.height * 0.55, lastRect.height - 16);

                if (isBeforeFirst) {
                  targetNodeId = firstChild.getAttribute('data-node-id') || '';
                  position = 'before';
                  top = Math.max(containerRect.top + 4, firstRect.top - 2) + sTop;
                } else if (isAfterLast) {
                  targetNodeId = lastChild.getAttribute('data-node-id') || '';
                  position = 'after';
                  top = Math.min(containerRect.bottom - 6, lastRect.top + lastRect.height - 2) + sTop;
                } else {
                  // ZONA C: ENTRE OS ELEMENTOS DO CONTAINER
                  let chosenChild = sortedChildren[0];
                  let chosenPos: 'before' | 'after' = 'before';
                  let calcTop = firstRect.top - 2;

                  for (let i = 0; i < sortedChildren.length; i++) {
                    const child = sortedChildren[i];
                    const r = child.getBoundingClientRect();

                    if (e.clientY >= r.top && e.clientY < r.top + r.height * 0.5) {
                      chosenChild = child;
                      chosenPos = 'before';
                      calcTop = r.top - 2;
                      break;
                    }
                    if (e.clientY >= r.top + r.height * 0.5 && e.clientY <= r.bottom) {
                      chosenChild = child;
                      chosenPos = 'after';
                      calcTop = r.bottom - 2;
                      break;
                    }

                    if (i < sortedChildren.length - 1) {
                      const nextR = sortedChildren[i + 1].getBoundingClientRect();
                      if (e.clientY > r.bottom && e.clientY < nextR.top) {
                        chosenChild = child;
                        chosenPos = 'after';
                        calcTop = (r.bottom + nextR.top) / 2 - 2;
                        break;
                      }
                    }
                  }

                  targetNodeId = chosenChild.getAttribute('data-node-id') || '';
                  position = chosenPos;
                  top = calcTop + sTop;
                }
              } else {
                // ==========================================
                // LAYOUT HORIZONTAL (LINHA / ROW)
                // ==========================================
                // A linha azul de indicação sempre expande por toda a altura do container
                top = containerRect.top + sTop;
                height = containerRect.height;
                width = 4;

                // ZONA A: INÍCIO DO CONTAINER (esquerda do container até 45% do 1º filho)
                const isBeforeFirst =
                  e.clientX <= containerRect.left + 28 ||
                  e.clientX < firstRect.left + Math.max(16, firstRect.width * 0.45);

                // ZONA B: FIM DO CONTAINER (direita do container a partir de 55% do último filho)
                const isAfterLast =
                  e.clientX >= containerRect.right - 28 ||
                  e.clientX > lastRect.left + Math.min(lastRect.width * 0.55, lastRect.width - 16);

                if (isBeforeFirst) {
                  targetNodeId = firstChild.getAttribute('data-node-id') || '';
                  position = 'before';
                  left = Math.max(containerRect.left + 4, firstRect.left - 2) + sLeft;
                } else if (isAfterLast) {
                  targetNodeId = lastChild.getAttribute('data-node-id') || '';
                  position = 'after';
                  left = Math.min(containerRect.right - 6, lastRect.left + lastRect.width - 2) + sLeft;
                } else {
                  // ZONA C: ENTRE OS ELEMENTOS DO CONTAINER
                  let chosenChild = sortedChildren[0];
                  let chosenPos: 'before' | 'after' = 'before';
                  let calcLeft = firstRect.left - 2;

                  for (let i = 0; i < sortedChildren.length; i++) {
                    const child = sortedChildren[i];
                    const r = child.getBoundingClientRect();

                    if (e.clientX >= r.left && e.clientX < r.left + r.width * 0.5) {
                      chosenChild = child;
                      chosenPos = 'before';
                      calcLeft = r.left - 2;
                      break;
                    }
                    if (e.clientX >= r.left + r.width * 0.5 && e.clientX <= r.right) {
                      chosenChild = child;
                      chosenPos = 'after';
                      calcLeft = r.right - 2;
                      break;
                    }

                    if (i < sortedChildren.length - 1) {
                      const nextR = sortedChildren[i + 1].getBoundingClientRect();
                      if (e.clientX > r.right && e.clientX < nextR.left) {
                        chosenChild = child;
                        chosenPos = 'after';
                        calcLeft = (r.right + nextR.left) / 2 - 2;
                        break;
                      }
                    }
                  }

                  targetNodeId = chosenChild.getAttribute('data-node-id') || '';
                  position = chosenPos;
                  left = calcLeft + sLeft;
                }
              }
            }

            win.parent.postMessage(
              {
                type: 'CANVAS_DRAG_OVER',
                payload: {
                  targetId: targetNodeId,
                  containerId: containerEl.getAttribute('data-node-id') || '',
                  position,
                  top,
                  left,
                  width,
                  height,
                },
              },
              '*'
            );
          };

          const handleDragLeave = (e: DragEvent) => {
            // Ignora o evento dragleave se o cursor ainda estiver sobre algum elemento interno do body do iframe
            if (e.relatedTarget && doc.body && doc.body.contains(e.relatedTarget as Node)) {
              return;
            }
            win.parent.postMessage({ type: 'CANVAS_DRAG_LEAVE' }, '*');
          };

          const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            const raw = e.dataTransfer?.getData('application/json');
            win.parent.postMessage(
              {
                type: 'CANVAS_DROP',
                payload: { raw },
              },
              '*'
            );
          };

          doc.removeEventListener('dragover', handleDragOver);
          doc.addEventListener('dragover', handleDragOver);
          doc.removeEventListener('dragleave', handleDragLeave);
          doc.addEventListener('dragleave', handleDragLeave);
          doc.removeEventListener('drop', handleDrop);
          doc.addEventListener('drop', handleDrop);

          // 6. Ponte de Telemetria de Scroll (Iframe -> Pai)
          const handleScroll = () => {
            win.parent.postMessage(
              {
                type: 'CANVAS_SCROLLED',
                payload: {
                  scrollTop: win.scrollY || doc.documentElement.scrollTop || 0,
                  scrollLeft: win.scrollX || doc.documentElement.scrollLeft || 0,
                },
              },
              '*'
            );
          };

          win.removeEventListener('scroll', handleScroll);
          win.addEventListener('scroll', handleScroll, { passive: true });

          // 7. Filtro global no iframe para suprimir avisos de ResizeObserver
          const handleWindowError = (e: ErrorEvent) => {
            if (e.message && e.message.includes('ResizeObserver loop')) {
              e.stopImmediatePropagation();
              e.preventDefault();
            }
          };
          win.removeEventListener('error', handleWindowError);
          win.addEventListener('error', handleWindowError);

          // 8. Ponte de Mutação de Layout via MutationObserver + Resize Event (Totalmente imune a erros de ResizeObserver)
          const notifyMutation = () => {
            win.requestAnimationFrame(() => {
              try {
                win.parent.postMessage({ type: 'CANVAS_LAYOUT_MUTATED' }, '*');
              } catch (_) {}
            });
          };

          win.removeEventListener('resize', notifyMutation);
          win.addEventListener('resize', notifyMutation, { passive: true });

          if (doc.body) {
            const mutationObserver = new MutationObserver(notifyMutation);
            mutationObserver.observe(doc.body, {
              childList: true,
              subtree: true,
              attributes: true,
            });
          }
        } catch (err) {
          console.error('❌ Erro ao inicializar Iframe Portal:', err);
        }
      };

      // Executa inicialização síncrona se o iframe já possuir o document pronto
      if (iframe.contentDocument && (iframe.contentDocument.readyState === 'interactive' || iframe.contentDocument.readyState === 'complete')) {
        initIframe();
      }

      iframe.addEventListener('load', initIframe);
      return () => {
        iframe.removeEventListener('load', initIframe);
        window.removeEventListener('error', handleParentError);
      };
    }, []);

    return (
      <div className="w-full h-full min-h-full relative flex-1 flex flex-col items-center justify-center">
        <iframe
          ref={iframeRef}
          id="canvas-iframe"
          srcDoc="<!DOCTYPE html><html><head></head><body style='margin:0;padding:0;background:transparent;'></body></html>"
          title="Canvas Live Viewport"
          className="w-full h-full min-h-full border-none bg-transparent select-none transition-all duration-300"
          style={{
            pointerEvents: 'auto',
          }}
        />

        {mountNode &&
          createPortal(
            <SharedCanvasRenderer
              canvasData={canvasData}
              viewportMode={viewportMode}
              page={page}
              isPublicView={true} // Renderiza HTML limpo da página
            />,
            mountNode
          )}
      </div>
    );
  }
);

CanvasIframePortal.displayName = 'CanvasIframePortal';
