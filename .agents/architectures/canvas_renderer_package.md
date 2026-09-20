# 🎨 Monorepo Shared Package — `@psi/canvas-renderer`

> **Scope**: The shared monorepo package `@psi/canvas-renderer` (`frontend/packages/canvas-renderer/`) is the universal rendering engine for CanvasData v2.0 across PSI-APP. It guarantees 100% logical and stylistic parity between the Visual Site Editor (`apps/web`) and Published Sites / Preview (`apps/sites`).

---

## 1. Scope & Triggers

Read this document when:
- Modifying visual rendering for sections (`SectionWrapper`), container divs (`DivWrapper`), atomic elements (`AtomicComponentWrapper`), carousels (`CarouselWrapper`), or navbar (`NavbarLinksWrapper`)
- Adjusting color resolution helpers (`colorHelpers.ts`) or font loading logic (`loadGoogleFonts`)
- Ensuring 100% visual parity between the editor and published sites

**Consumers**:
- `apps/web`: Visual Site Editor (`isPublicView={false}`).
- `apps/sites`: Published Sites & Staging Preview (`isPublicView={true}`).

---

## 2. Inviolable Directives (ALWAYS / NEVER)

1. **ALWAYS maintain 100% visual parity between Editor and Published Sites**:
   - Any layout, CSS flexbox, gap, padding, color, or typography change inside `@psi/canvas-renderer` automatically applies across both editor and published frontend apps.
2. **ALWAYS respect `isPublicView` flag for zero-overhead rendering on published sites**:
   - When `isPublicView={true}`, strip editing listeners, `contentEditable`, drag-and-drop contexts (`DndContext`), `ContextMenu`, and selection highlights. Published sites render lightweight, high-performance static HTML/CSS.
3. **NEVER create duplicated canvas rendering logic inside `apps/web` or `apps/sites`**:
   - All CanvasData v2.0 rendering **MUST** consume `<CanvasRenderer />` exported exclusively by `@psi/canvas-renderer`.
4. **ALWAYS load Google Fonts dynamically on canvas mount**:
   - `useEffect` with `loadGoogleFonts([headingFont, bodyFont])` injects configured Google Fonts into the DOM head at runtime.
5. **ALWAYS preserve standard monorepo paths in `tsconfig.json`**:
   - Maintain `@psi/canvas-renderer` alias mappings in the `tsconfig.json` of each app (`apps/web` and `apps/sites`).
6. **ALWAYS scope Global Sticky Elements (`stickyScope: 'page'`) to Canvas Viewport Boundaries**:
   - `positionHelpers.ts` maps `stickyScope: 'page'` to center within section width (`maxWidth: 1200px`) pinned relative to the canvas root scroll container.
   - Global sticky elements must NEVER spill over or overlap outer app layout headers (Editor topbar in `apps/web`).

---

## 3. Feature Architecture & Visual Parity Flowchart

```mermaid
flowchart TD
    subgraph Monorepo Package [@psi/canvas-renderer]
        CR[CanvasRenderer]
        SW[SectionWrapper]
        DW[DivWrapper]
        ACW[AtomicComponentWrapper]
        CW[CarouselWrapper]
        NLW[NavbarLinksWrapper]

        CR --> SW
        SW --> DW
        DW --> DW
        DW --> ACW
        DW --> CW
        DW --> NLW
    end

    subgraph Editor App [apps/web]
        PageEditor[EditorLayout / PageEditor] -->|isPublicView=false| CR
        Menu[ContextMenu / Selection State] -.-> CR
    end

    subgraph Published Sites [apps/sites]
        PublicPage[CapturePageRenderer / Public Site] -->|isPublicView=true| CR
    end
```

---

## 4. Concrete Code Recipes & Schemas

### Recipe 1: Consuming `CanvasRenderer` in Editor (`apps/web`)

```tsx
import { EditorCanvasProps } from './types';
import { CanvasRenderer as SharedCanvasRenderer } from '@psi/canvas-renderer';

export function EditorCanvas(props: EditorCanvasProps) {
  return (
    <SharedCanvasRenderer
      {...props}
      isPublicView={props.isPublicView ?? false}
    />
  );
}
```

---

### Recipe 2: Consuming `CanvasRenderer` in Published Sites (`apps/sites`)

```tsx
import { CanvasRenderer as SharedCanvasRenderer, CanvasData, ViewportMode } from '@psi/canvas-renderer';

interface CanvasRendererProps {
  canvasData: CanvasData | null;
  viewportMode?: ViewportMode;
  page?: any;
  isPublicView?: boolean;
}

export function CanvasRenderer({
  canvasData,
  viewportMode = 'desktop',
  page,
  isPublicView = true,
}: CanvasRendererProps) {
  return (
    <SharedCanvasRenderer
      canvasData={canvasData}
      viewportMode={viewportMode}
      page={page}
      isPublicView={isPublicView}
    />
  );
}
```

---

## 5. Anti-Patterns & Prohibitions

### ❌ ERRADO: Duplicar código de renderização de seções fora do pacote compartilhado
```tsx
// NUNCA crie componentes paralelos de renderização em apps/sites ou apps/web
export function PublicSectionWrapper({ section }: { section: any }) {
  return <div style={{ display: 'flex' }}>...</div>; // ❌ Quebra a paridade visual!
}
```

### ✅ CORRETO: Usar a flag `isPublicView` no pacote compartilhado
```tsx
// CORRETO: @psi/canvas-renderer/src/SectionWrapper.tsx lida com ambos os modos
export function SectionWrapper({ section, isPublicView = false }: SectionWrapperProps) {
  return (
    <section className="..." style={sectionStyle}>
      {/* Lógica única compartilhada */}
    </section>
  );
}
```
