# 🖥️ Canvas Renderer Architecture & Dual Modes (`@psi/canvas-renderer`)

> **Scope**: Arquitetura do pacote monorepo compartilhado `@psi/canvas-renderer`, paridade visual entre Editor (`apps/web`) e Publicado (`apps/sites`), tratamento dos modos de visualização (`isPublicView`), construtor universal de estilos `styleBuilder.ts` e gradientes de texto com `background-clip: text`.

---

## 1. Scope & Triggers

Leia este arquivo quando trabalhar em:
- Pacote compartilhado `@psi/canvas-renderer` (`frontend/packages/canvas-renderer/`)
- Construtor de CSS (`styleBuilder.ts`)
- Wrappers de renderização (`CanvasRenderer.tsx`, `SectionWrapper.tsx`, `DivWrapper.tsx`, `AtomicComponentWrapper.tsx`)
- Componentes de texto inline (`InlineEditableText.tsx`)
- Correções de estilos visuais, bordas, sombras e gradientes no canvas

---

## 2. Inviolable Directives (ALWAYS / NEVER)

1. **ALWAYS enforce 100% visual parity via `@psi/canvas-renderer`**:
   - O criador de páginas (`apps/web`) e o site publicado (`apps/sites`) devem consumir exatamente o mesmo pacote `@psi/canvas-renderer`.
   - A única diferença entre o modo de edição e a produção é a prop boolean `isPublicView`.
2. **ALWAYS use zero-layout-impact outlines (`outline` with `-outline-offset-2`) for editor hover and selection**:
   - **NEVER** adicionar `border` ou `padding` dinâmico quando um elemento é sobrevoado (`isHovered`) ou selecionado (`isSelected`).
   - O uso de `outline: 2px solid ...` com `-outline-offset-2` garante que a moldura roxa/azul seja desenhada por cima do elemento sem alterar nem 1px de sua largura, altura ou fluxo de layout.
3. **ALWAYS support conditional gradient text rendering via `background-clip: text`**:
   - Ao aplicar uma cor de texto que contenha gradiente (`linear-gradient(...)`, `radial-gradient(...)` ou `var(--brand-gradient...)`), o `styleBuilder.ts` e o `AtomicComponentWrapper.tsx` devem aplicar:
     - `color: 'transparent'`
     - `background: <gradient-string>`
     - `backgroundClip: 'text'`
     - `WebkitBackgroundClip: 'text'`
     - `WebkitTextFillColor: 'transparent'`
   - Para botões (`button`) com texto em gradiente, o fundo preenchido do botão é mantido na tag `<button>`, enquanto o gradiente é aplicado exclusivamente na `span` interna do texto (`InlineEditableText`), mantendo os ícones e o fundo do botão visíveis.
4. **ALWAYS resolve flat border colors via `resolveBorderColor`**:
   - Propriedades de borda (`borderColor`) aceitam apenas cores sólidas, variáveis CSS ou `transparent`. Se uma string de gradiente for atribuída à borda, a função `resolveBorderColor` extrai a primeira parada de cor (`stops[0]`), prevenindo bordas transparentes ou sintaxe CSS inválida.

---

## 3. Matriz de Comparação dos Modos e Arquitetura Iframe + CanvasOverlay

O editor utiliza uma **arquitetura desacoplada**: a renderização do site ocorre 100% isolada dentro de um `<iframe id="canvas-iframe">` via `React.createPortal` (`CanvasIframePortal`), enquanto todas as molduras de seleção, barras de ferramentas flutuantes, badges de hover e menus de contexto são renderizados em uma camada transparente `CanvasOverlay` no documento pai.

| Recurso / Comportamento | `isPublicView={false}` (Modo Edição via Iframe + Overlay) | `isPublicView={true}` (Modo Produção Publicado) |
|---|---|---|
| **Renderização do DOM** | Isolado em `<iframe>` via `CanvasIframePortal` (`isPublicView={true}` dentro do iframe). | Renderização limpa direta na página publica em `apps/sites`. |
| **Molduras de Hover / Seleção** | Desenhadas na camada `CanvasOverlay` no pai (`translate3d` sincronizado por scroll). | ❌ Oculto. Renderização limpa sem artefatos visuais. |
| **Toolbar Flutuante de Ações** | Exibe botões no topo do elemento selecionado (Duplicar, Copiar, Colar Estilo, Salvar Global, Excluir). | ❌ Oculto. |
| **Navegação & Interação** | Passa eventos através de `pointer-events: none` no overlay raiz e telemetria via `postMessage`. Previne navegação em links. | Executa a ação final (envio de formulário, scroll de seção, WhatsApp `wa.me`, URL externa). |
| **Indicadores de Soltura (Drop)** | Exibe linha azul pulsante/borda no overlay pai ao arrastar elementos da sidebar sobre o iframe. | ❌ Oculto. |
| **Elementos Ocultos no Mobile** | Exibe com opacidade reduzida (50%) e aviso visual para o editor. | Oculta completamente o elemento via `display: none`. |

---

## 4. Component Wrapper Hierarchy & Responsibilities

```mermaid
graph TD
    CR["CanvasRenderer.tsx (Renderizador Raiz)"] -->|Mapeia sections[]| SW["SectionWrapper.tsx (Seção Nível 1)"]
    SW -->|Itera componentes[]| CW["Component Router"]
    CW -->|div| DW["DivWrapper.tsx (Container Flexbox Nível 2)"]
    CW -->|atômico| ACW1["AtomicComponentWrapper.tsx (Componente Atômico)"]
    DW -->|Itera filhos| ACW2["AtomicComponentWrapper.tsx (Componente Atômico)"]

    ACW1 --> IET1["InlineEditableText.tsx (Suporte a background-clip: text)"]
    ACW2 --> IET2["InlineEditableText.tsx (Suporte a background-clip: text)"]
```

### Detalhamento dos Wrappers:

1. **`CanvasRenderer.tsx`**:
   - Recebe a árvore `canvasData` e a prop `isPublicView`.
   - Gerencia a elevação de contêineres globais fixos (`stickyScope: 'page'`) para a camada raiz do Canvas.
2. **`SectionWrapper.tsx`**:
   - Renderiza a `<section>` com background, padding e alças de arraste/exclusão no editor.
3. **`DivWrapper.tsx`**:
   - Renderiza o container flexbox (`display: flex`, `flexDirection`, `gap`, `justifyContent`, `alignItems`).
4. **`AtomicComponentWrapper.tsx`**:
   - Router que renderiza os 17 tipos atômicos.
   - Aplica os estilos gerados por `buildComponentCssStyle`.
5. **`InlineEditableText.tsx`**:
   - Permite que o usuário clique e edite o texto diretamente no canvas.
   - Garante que estilos de gradiente de texto (`backgroundClip: 'text'`) funcionem em tempo real enquanto o usuário digita.

---

## 5. Algoritmo do Construtor de Estilos (`styleBuilder.ts`)

```typescript
// Exemplo Simplificado do Funcionamento Interno
export function buildComponentCssStyle({
  component,
  viewportMode = 'desktop',
  isHovered = false,
  componentCategory = 'general',
}: BuildComponentCssParams): React.CSSProperties {
  const result: React.CSSProperties = {};

  // 1. Dimensoes e Flexbox Layout
  // 2. Margens e Spacings
  // 3. Backgrounds e Overlays

  // 4. Tratamento Plano de Bordas
  const finalBorderColor = resolveBorderColor(effectiveBorderColor);
  if (finalBorderColor) {
    result.borderColor = finalBorderColor;
  }

  // 5. Tipografia e Cores de Texto (Com Suporte a Gradiente)
  const activeTextColor = isHovered && style.hoverColor ? style.hoverColor : style.color;
  if (activeTextColor) {
    const isGradient = typeof activeTextColor === 'string' && 
      (activeTextColor.includes('gradient') || activeTextColor.includes('var(--brand-gradient'));
    
    if (isGradient) {
      result.color = 'transparent';
      result.background = activeTextColor;
      result.WebkitBackgroundClip = 'text';
      result.backgroundClip = 'text';
      (result as any).WebkitTextFillColor = 'transparent';
    } else {
      result.color = activeTextColor;
    }
  }

  return result;
}
```

---

## 6. Anti-Patterns & Proibições

### ❌ Errado (Duplicar Renderizadores entre Aplicativos)
```tsx
// NUNCA recrie um renderizador de canvas separado em apps/sites!
export function SiteView({ canvasData }) {
  return <MyCustomSiteRenderer data={canvasData} />; // QUEBRA a paridade de design!
}
```

### ✅ Correto (Reaproveitamento do Monorepo)
```tsx
// Reutilize SEMPRE o pacote compartilhado @psi/canvas-renderer
import { CanvasRenderer } from '@psi/canvas-renderer';

export function SiteView({ canvasData }) {
  return <CanvasRenderer canvasData={canvasData} isPublicView={true} />;
}
```
