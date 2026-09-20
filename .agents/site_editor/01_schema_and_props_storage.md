# 📐 Schema de Armazenamento de Elementos & Propriedades (CanvasData v2.0)

> **Scope**: Definição detalhada das estruturas de dados JSON, hierarquia de contêineres, armazenamento de estilos, layout, bordas, propriedades funcionais, overrides mobile e imutabilidade no estado do editor.

---

## 1. Scope & Triggers

Leia este arquivo quando trabalhar em:
- Tipagem e interfaces do editor (`packages/canvas-renderer/src/types.ts`)
- Manipulação de estado e hooks (`usePageEditor.ts`, `canvasHelpers.ts`)
- Serialização e desserialização de dados JSON no PostgreSQL (`public.capture_pages`)
- Adição de novos atributos a elementos atômicos ou contêineres

---

## 2. Inviolable Directives (ALWAYS / NEVER)

1. **ALWAYS enforce strict 2-level structural hierarchy**:
   - Nível 0: `CanvasData` (Objeto Raiz da Página).
   - Nível 1: `Section[]` (Exclusivamente Seções Verticais da Página).
   - Nível 2: `Component[]` (`DivComponent` como contêiner flexbox OU `AtomicComponent`).
   - Nível 3: `AtomicComponent[]` (Apenas dentro de um `DivComponent`).
   - **NEVER** permitir aninhamento de `Section` dentro de `Section`, `Section` dentro de `Div`, ou `Div` dentro de `Div` (Profundidade Máxima de Divs = 1).
2. **ALWAYS separate visual styles from functional props**:
   - Estilos visuais e tipográficos pertencem a `style`, `layout`, `border` e `background`.
   - Propriedades funcionais de conteúdo (ex: `text`, `html`, `src`, `form_id`, `destinationType`, `url`, `whatsappNumber`, `items`) pertencem estritamente ao objeto `props`.
3. **ALWAYS write viewport overrides to `element.mobile` when `viewportMode === 'mobile'`**:
   - Quando o usuário edita um elemento no modo mobile, as alterações devem ser gravadas no objeto `mobile` do elemento (`element.mobile.style`, `element.mobile.layout`, `element.mobile.hidden`), preservando intactos os valores base do desktop.
4. **ALWAYS mutate canvas state immutably**:
   - **NEVER** mutar diretamente arrays ou objetos de `canvasData`. Utilize sempre as funções auxiliares puras de `_editor/utils/canvasHelpers.ts` que retornam uma nova cópia imutável da árvore de dados.

---

## 3. Schema Data Definitions (TypeScript Interfaces)

```typescript
export interface CanvasGlobalStyles {
  typography?: {
    headingFont?: string;
    bodyFont?: string;
  };
  buttonTemplates?: Record<string, {
    backgroundColor?: string;
    color?: string;
    borderStyle?: string;
    borderWidth?: string;
    borderColor?: string;
    borderRadius?: string;
    padding?: string;
    fontSize?: string;
    fontWeight?: string;
  }>;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    contrastColor?: string;
    siteBg?: string;
  };
}

export interface ComponentEffect {
  type: 'shadow' | 'scale' | 'translate' | 'rotate' | 'opacity' | 'blur' | 'skew';
  enabled?: boolean;
  params?: Record<string, any>;
}

export interface ElementMobileOverride {
  hidden?: boolean;
  style?: Record<string, any>;
  layout?: Record<string, any>;
  border?: Record<string, any>;
  background?: Record<string, any>;
  props?: Record<string, any>;
}

export interface AtomicComponent {
  id: string;
  type: 'heading' | 'paragraph' | 'label' | 'button' | 'image' | 'video' | 'form' | 'map' | 'card' | 'testimonial' | 'stat_counter' | 'faq_item' | 'list' | 'icon' | 'divider' | 'social_links' | 'carousel';
  style?: {
    fontSize?: string;
    fontWeight?: string;
    fontFamily?: string;
    lineHeight?: string;
    letterSpacing?: string;
    textTransform?: string;
    textAlign?: string;
    color?: string;
    backgroundColor?: string;
    gradientString?: string;
    borderRadius?: string;
    borderWidth?: string;
    borderColor?: string;
    borderStyle?: string;
    boxShadow?: string;
    opacity?: number;
    width?: string;
    height?: string;
    marginTop?: string;
    marginBottom?: string;
    paddingTop?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    paddingRight?: string;
    hoverBackgroundColor?: string;
    hoverColor?: string;
    hoverBorderColor?: string;
    hoverBorderWidth?: string;
    hoverBorderRadius?: string;
    hoverBoxShadow?: string;
    hoverOpacity?: number;
    hoverScale?: number;
    transitionDurationMs?: number;
    transitionTimingFunction?: string;
    effects?: ComponentEffect[];
  };
  layout?: {
    display?: string;
    flexDirection?: string;
    alignItems?: string;
    justifyContent?: string;
    alignSelf?: string;
    gap?: string;
    width?: string;
    height?: string;
  };
  border?: {
    style?: string;
    width?: string;
    color?: string;
    borderRadius?: string;
  };
  background?: {
    type?: 'none' | 'color' | 'image' | 'gradient';
    color?: string;
    gradientString?: string;
    imageUrl?: string;
    imageOverlayColor?: string;
    backdropBlur?: string;
  };
  props?: Record<string, any>;
  mobile?: ElementMobileOverride;
}

export interface DivComponent {
  id: string;
  type: 'div';
  name?: string;
  components: AtomicComponent[];
  style?: Record<string, any>;
  layout?: Record<string, any>;
  border?: Record<string, any>;
  background?: Record<string, any>;
  mobile?: ElementMobileOverride;
}

export interface Section {
  id: string;
  name?: string;
  type?: 'header' | 'hero' | 'features' | 'about' | 'services' | 'testimonials' | 'faq' | 'cta' | 'footer' | 'custom';
  components: (DivComponent | AtomicComponent)[];
  style?: Record<string, any>;
  layout?: Record<string, any>;
  border?: Record<string, any>;
  background?: Record<string, any>;
  mobile?: ElementMobileOverride;
  stickyScope?: 'none' | 'page' | 'parent';
}

export interface CanvasData {
  version: '2.0';
  sections: Section[];
  globalStyles?: CanvasGlobalStyles;
}

/**
 * 🚀 Estado Normalizado (State by ID - Flat Hash Table)
 * Utilizado internamente no usePageEditor para acesso O(1) e histório delta leve com Immer.
 */
export interface CanvasNode {
  id: string;
  type: 'root' | 'section' | 'div' | 'carousel' | 'global_instance' | AtomicComponentType;
  parentId: string | null;
  childrenIds: string[];
  name?: string;
  label?: string;
  props?: Record<string, any>;
  style?: Record<string, any>;
  layout?: Record<string, any>;
  border?: Record<string, any>;
  background?: Record<string, any>;
  mobile?: Record<string, any>;
}

export interface NormalizedCanvasData {
  version: '2.0';
  rootNodeId: 'root';
  nodes: Record<string, CanvasNode>;
  globalStyles?: CanvasGlobalStyles;
  globalComponentsMap?: Record<string, GlobalComponentMaster>;
  navbar?: NavbarConfig;
}
```

---

## 4. Estrutura dos Sub-Objetos de Estilo

| Objeto | Função | Exemplos de Chaves |
|---|---|---|
| **`style`** | Estilos visuais de tipografia, cores e efeitos avançados. | `fontSize`, `color`, `backgroundColor`, `gradientString`, `boxShadow`, `effects`, `hoverColor` |
| **`layout`** | Posicionamento Flexbox e dimensões de caixa. | `display`, `flexDirection`, `justifyContent`, `alignItems`, `gap`, `width`, `height`, `margin` |
| **`border`** | Configurações de contorno plano. | `borderStyle`, `borderWidth`, `borderColor`, `borderRadius` |
| **`background`** | Preenchimento e imagens com efeito blur. | `type`, `color`, `gradientString`, `imageUrl`, `backdropBlur` |
| **`props`** | Atributos funcionais e de conteúdo do elemento. | `text`, `html`, `src`, `form_id`, `destinationType`, `whatsappNumber`, `url`, `items` |
| **`mobile`** | Sobregravação exclusiva de viewport mobile. | `hidden`, `style.fontSize`, `layout.padding`, `layout.width` |

---

## 5. Concrete Code Recipes (Mutação em Estado Normalizado $O(1)$)

### Atualização Direta de Componente por ID com Immer Patches

```typescript
// usePageEditor.ts
const updateComponent = useCallback((componentId: string, patch: Partial<Component>) => {
  updateCanvasState((draft) => {
    if (draft.nodes[componentId]) {
      Object.assign(draft.nodes[componentId], patch);
    }
  }, 'Editou Componente');
}, [updateCanvasState]);
```

### Remoção de Container com Exclusão em Cascata em $O(1)$

```typescript
// canvasHelpers.ts
export function removeNodeCascadeInFlatCanvas(nodes: Record<string, CanvasNode>, nodeId: string) {
  const node = nodes[nodeId];
  if (!node) return;

  if (node.parentId && nodes[node.parentId]) {
    const parentNode = nodes[node.parentId];
    parentNode.childrenIds = (parentNode.childrenIds || []).filter((id: string) => id !== nodeId);
  }

  const idsToDelete: string[] = [];
  const collectDescendants = (id: string) => {
    idsToDelete.push(id);
    const n = nodes[id];
    if (n && Array.isArray(n.childrenIds)) {
      n.childrenIds.forEach((childId: string) => collectDescendants(childId));
    }
  };

  collectDescendants(nodeId);
  idsToDelete.forEach((id: string) => {
    delete nodes[id];
  });
}
```

---

## 6. Anti-Patterns & Proibições

### ❌ Errado (Percorrer a árvore recursivamente para alterar um nó)
```typescript
// NUNCA faça busca em profundidade (DFS/map) na árvore inteira para atualizar uma simples propriedade!
setCanvasData((prev) => updateComponentInCanvasTree(prev, id, patch));
```

### ❌ Errado (Salvar snapshots completos da árvore a cada evento do slider)
```typescript
// NUNCA armazene a cópia inteira do CanvasData a cada evento onChange do slider de padding/tamanho!
history.push(fullCanvasSnapshot); // Consome centenas de MB de RAM e polui a pilha com 100 passos de undo
```

### ✅ Correto (Acesso O(1) na Hash Table Flat + Immer Patch Deltas)
```typescript
// Acesso O(1) direto por ID com patches delta e batching no PointerUp
updateCanvasState((draft) => {
  if (draft.nodes[selectedId]) {
    draft.nodes[selectedId].props.text = "Novo Título";
  }
}, 'Editou Título');
```
