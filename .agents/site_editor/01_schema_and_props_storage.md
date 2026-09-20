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

## 5. Concrete Code Recipes (Mutação Imutável de Estado)

### Atualização Inteligente de Propriedade de Componente

```typescript
// usePageEditor.ts ou canvasHelpers.ts
export function updateComponentInCanvas(
  canvasData: CanvasData,
  componentId: string,
  updater: (comp: any) => any
): CanvasData {
  return {
    ...canvasData,
    sections: canvasData.sections.map((section) => ({
      ...section,
      components: section.components.map((item) => {
        // Se o item for o próprio componente (atômico no nível da seção)
        if (item.id === componentId) {
          return updater(item);
        }
        // Se o item for um Div contêiner com filhos
        if (item.type === 'div' && Array.isArray((item as DivComponent).components)) {
          return {
            ...item,
            components: (item as DivComponent).components.map((child) =>
              child.id === componentId ? updater(child) : child
            ),
          };
        }
        return item;
      }),
    })),
  };
}
```

---

## 6. Anti-Patterns & Proibições

### ❌ Errado (Mutação Direta do Objeto)
```typescript
// NUNCA altere propriedades diretamente na referência do estado!
const comp = canvasData.sections[0].components[0];
comp.props.text = "Novo Título"; // QUEBRA a reatividade do React e do histórico Undo/Redo
```

### ✅ Correto (Atualização Imutável via Helper)
```typescript
setCanvasData((prev) =>
  updateComponentInCanvas(prev, selectedId, (comp) => ({
    ...comp,
    props: { ...comp.props, text: "Novo Título" },
  }))
);
```
