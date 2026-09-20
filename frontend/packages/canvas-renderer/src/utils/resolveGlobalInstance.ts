import { Component, GlobalInstanceComponent, GlobalComponentMaster, DivComponent } from '../types';

/**
 * Utilitário para resolver o valor de uma propriedade aninhada via path em notação de ponto.
 * Exemplo de path: "root.props.text", "components[0].props.src", "style.backgroundColor"
 */
export function getDeepPropertyByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (part === 'root') continue; // 'root' aponta para o nó principal
    if (current === undefined || current === null) return undefined;
    
    // Suporte a notação de array [index] ou propriedade direta
    const matchArray = part.match(/^(\w+)\[(\d+)\]$/);
    if (matchArray) {
      const [, propName, indexStr] = matchArray;
      current = current[propName]?.[parseInt(indexStr, 10)];
    } else {
      current = current[part];
    }
  }
  return current;
}

/**
 * Utilitário imutável/seguro para definir uma propriedade aninhada via path.
 */
export function setDeepPropertyByPath(obj: any, path: string, value: any): void {
  if (!obj || !path) return;
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part === 'root') continue;

    const matchArray = part.match(/^(\w+)\[(\d+)\]$/);
    if (matchArray) {
      const [, propName, indexStr] = matchArray;
      const idx = parseInt(indexStr, 10);
      if (!current[propName]) current[propName] = [];
      if (!current[propName][idx]) current[propName][idx] = {};
      current = current[propName][idx];
    } else {
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
  }

  const lastPart = parts[parts.length - 1];
  const matchArray = lastPart.match(/^(\w+)\[(\d+)\]$/);
  if (matchArray) {
    const [, propName, indexStr] = matchArray;
    if (!current[propName]) current[propName] = [];
    current[propName][parseInt(indexStr, 10)] = value;
  } else {
    current[lastPart] = value;
  }
}

/**
 * Motor Principal de Herança de Elementos Globais:
 * Mescla o nó master (masterNode) com os overrides permitidos pela instância.
 */
export function resolveGlobalInstance(
  instance: GlobalInstanceComponent,
  globalComponentsMap?: Record<string, GlobalComponentMaster> | null
): Component {
  const master = globalComponentsMap ? globalComponentsMap[instance.globalComponentId] : null;

  // Fallback seguro caso o master não esteja no cache ou tenha sido excluído
  if (!master || !master.masterNode) {
    return {
      id: instance.id,
      type: 'div',
      props: {},
      layout: instance.layout || {
        flexDirection: 'column',
        flexWrap: 'nowrap',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        gap: '8px',
      },
      style: {
        borderWidth: '1px',
        borderColor: '#EF4444',
        borderStyle: 'dashed',
        paddingTop: '16px',
        paddingBottom: '16px',
        paddingLeft: '16px',
        paddingRight: '16px',
        borderRadius: '8px',
      },
      components: [
        {
          id: `${instance.id}-fallback-heading`,
          type: 'heading',
          props: { text: `✨ Elemento Global (${master?.name || 'Não encontrado'})`, level: 4 },
          style: { color: '#EF4444', fontSize: '14px', fontWeight: 'bold' },
        },
      ],
    } as DivComponent;
  }

  // 1. Clonar profundamente o nó master para evitar poluição de memória
  const resolvedNode = structuredClone(master.masterNode);

  // Set com todos os paths autorizados a receber override
  const allowedPaths = new Set(master.customizableProps.map((p) => p.path));

  // 2. Aplicar overrides autorizados
  if (instance.overrides && typeof instance.overrides === 'object') {
    Object.entries(instance.overrides).forEach(([path, value]) => {
      if (allowedPaths.has(path) && value !== undefined) {
        setDeepPropertyByPath(resolvedNode, path, value);
      }
    });
  }

  // 3. Manter o ID do nó da instância no container raiz para permitir seleção e drag-and-drop
  resolvedNode.id = instance.id;
  if (instance.layout && 'layout' in resolvedNode) {
    (resolvedNode as any).layout = { ...((resolvedNode as any).layout || {}), ...instance.layout };
  }

  // 4. Injetar metadados para renderização de edit chrome no canvas
  (resolvedNode as any).__isGlobalInstance = true;
  (resolvedNode as any).__globalMasterId = master.id;
  (resolvedNode as any).__globalMasterName = master.name;
  (resolvedNode as any).__customizableProps = master.customizableProps;
  (resolvedNode as any).__instanceOverrides = instance.overrides || {};

  return resolvedNode;
}
