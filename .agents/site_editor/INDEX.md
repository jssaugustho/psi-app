# 🖥️ Visual Site Editor Architecture & Design System (Master Index)

> **Scope**: Master entry point for the Visual Site Editor architecture, visual data flow maps, core directives, technology stack, and domain loading matrix across `@psi/canvas-renderer`, `apps/web`, and `apps/sites`.

---

## ⚡ 1. Top 10 Inviolable Directives (Regras de Ouro do Editor)

1. **ALWAYS enforce strict 2-level hierarchy limits**:
   - `Canvas` → `Section[]` (Nível 1 EXCLUSIVO) → `Component[]` (Divs e Atômicos) → `AtomicComponent[]` (Dentro do Div).
   - **NEVER** nest a `Section` inside another `Section`, a `Section` inside a `Div`, or a `Div` inside another `Div` (max depth = 1).
2. **ALWAYS isolate Draft state (`draft_data`) from Live Published state (`canvas_data`)**:
   - Auto-save writes strictly to `capture_pages.draft_data` debounced by 1,500ms via `useAutoSave.ts`.
   - Live public sites (`apps/sites`) read strictly from `capture_pages.canvas_data`, which is populated ONLY when the user explicitly clicks "Publicar" via the PL/pgSQL RPC `publish_capture_page`.
3. **ALWAYS maintain 100% Visual Parity between Editor and Published Site via `@psi/canvas-renderer`**:
   - Both `apps/web` (Editor) and `apps/sites` (Production) MUST use the exact same shared monorepo package `@psi/canvas-renderer`.
   - The flag `isPublicView={false}` activates editor overlays (hover frames, drop indicators, selection badges, inline text editing), while `isPublicView={true}` renders the clean production site without edit chrome.
4. **ALWAYS use zero-layout-impact outlines (`outline` with `-outline-offset-2`) for editor hover and selection**:
   - **NEVER** toggle element `border` widths or add `padding` on hover/selection, preventing layout jumps or shifting on the canvas.
5. **ALWAYS support conditional gradient text rendering via `background-clip: text`**:
   - When a text element (`heading`, `paragraph`, `label`, `button`, `badge`, `card`, `faq_item`, `testimonial`, `stat_counter`) receives a gradient color, `styleBuilder.ts` and `AtomicComponentWrapper.tsx` apply `color: 'transparent'`, `background: <gradient>`, `backgroundClip: 'text'`, `-webkit-background-clip: text`, and `-webkit-text-fill-color: transparent`.
   - Container backgrounds (`button` fill, `card` background, `section` fill) remain intact on parent wrappers while the gradient text is clipped cleanly to letter shapes.
6. **ALWAYS write Contextual Mobile Overrides to `element.mobile` when `viewportMode === 'mobile'`**:
   - Editing sizing, alignment, padding, or visibility while in mobile view MUST write to `element.mobile` instead of overwriting base desktop properties.
7. **ALWAYS position properties panel popovers (`GlobalColorPicker`) inline without portals**:
   - Render popovers inline inside `relative` trigger containers (`absolute left-0 top-full mt-1.5 z-50`). **NEVER** use `createPortal` to `document.body` for sidebar pickers, preventing detachment during sidebar scrolling.
8. **ALWAYS dynamic-interpolate Wizard variables and CSS theme variables**:
   - Dynamically replace `{{psychologist_name}}`, `{{crp}}`, `{{whatsapp}}`, `{{city}}` at render time.
   - Bind visual identity colors directly to CSS variables (`var(--brand-gradient-start)`, `var(--brand-gradient-end)`, `var(--brand-contrast-color)`).
9. **ALWAYS manage CTA Destinations declaratively (`form`, `whatsapp`, `external_url`)**:
   - Button and Form CTAs support explicit destination types. Clicking a `form` CTA scrolls to or triggers the bound `form_id` modal; `whatsapp` opens `https://wa.me/55...`; `external_url` navigates to target URLs.
10. **ALWAYS keep `page.tsx` concise (< 50 lines)**:
    - Delegate execution to `EditorLayout` and custom hooks (`usePageEditor`, `useEditorHistory`, `useAutoSave`).

---

## 🗺️ 2. Context Loading Matrix (Navegação pela Documentação do Editor)

| Domínio de Leitura | Arquivo Contextual | Tópicos Cobertos |
|---|---|---|
| **Schema de Dados & Props** | [.agents/site_editor/01_schema_and_props_storage.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/site_editor/01_schema_and_props_storage.md) | CanvasData v2.0, objetos `style`, `layout`, `border`, `background`, `props`, `mobile` e imutabilidade. |
| **Canvas Renderer & Modos** | [.agents/site_editor/02_canvas_rendering_and_modes.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/site_editor/02_canvas_rendering_and_modes.md) | `@psi/canvas-renderer`, `isPublicView` flag, `styleBuilder.ts`, gradientes de texto e outlines de seleção. |
| **Staging, Publicação & Domínios** | [.agents/site_editor/03_staging_publishing_and_domains.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/site_editor/03_staging_publishing_and_domains.md) | `draft_data` vs `canvas_data`, RPC `publish_capture_page`, subdomínios Cloudflare e Nginx wildcard. |
| **Herança do Wizard & Identidade** | [.agents/site_editor/04_wizard_inheritance_and_bootstrapping.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/site_editor/04_wizard_inheritance_and_bootstrapping.md) | RPC `bootstrap_workspace`, variáveis `{{psychologist_name}}`, `{{crp}}` e variáveis CSS do tema. |
| **Catálogo de Elementos & Templates** | [.agents/site_editor/05_elements_and_templates_catalog.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/site_editor/05_elements_and_templates_catalog.md) | 17 Elementos Atômicos, construtores `createDefault*`, templates de página (Navbar, Hero, FAQ) e CTAs. |

---

## 🛠️ 3. Technology Stack & Monorepo Architecture

```text
psi-app/
├── frontend/
│   ├── packages/
│   │   └── canvas-renderer/             # Pacote Compartilhado de Renderização do Canvas (@psi/canvas-renderer)
│   │       ├── src/
│   │       │   ├── CanvasRenderer.tsx   # Renderizador Raiz do Canvas (Suporta isPublicView)
│   │       │   ├── SectionWrapper.tsx   # Wrapper de Seção (Nível 1)
│   │       │   ├── DivWrapper.tsx       # Wrapper de Container Flexbox (Nível 2)
│   │       │   ├── AtomicComponentWrapper.tsx # Router de Componentes Atômicos & Edição Inline
│   │       │   └── utils/
│   │       │       └── styleBuilder.ts  # Construtor Universal de CSS (Cores, Bordas, Gradientes)
│   └── apps/
│       ├── web/                         # Aplicação Principal do Usuário / Dashboard
│       │   └── src/app/dashboard/captacao/[pageId]/
│       │       ├── page.tsx             # Shell de Rota (< 50 linhas)
│       │       └── _editor/             # Interface Visual do Criador de Páginas
│       │           ├── EditorLayout.tsx # Layout com Sidebar + Canvas
│       │           ├── EditorSidebar/   # Painel Esquerdo (Paleta, Seções, Navbar, Camadas, Configurações)
│       │           ├── PropertiesPanel/ # Painel de Propriedades do Elemento Selecionado
│       │           └── hooks/           # State Management (usePageEditor, useAutoSave, useEditorHistory)
│       └── sites/                       # Aplicação de Produção / Renderização de Sites Publicados
│           └── src/components/CanvasRenderer/ # Consome @psi/canvas-renderer com isPublicView={true}
```

---

## 🧜‍♂️ 4. Visual Data Flow & Rendering Architecture

```mermaid
graph TD
    WIZARD["Wizard de Criação"] -->|POST /rpc/bootstrap_workspace| DB_RPC["PostgreSQL RPC"]
    DB_RPC -->|Cria Registro| DB_PAGES["public.capture_pages (draft_data & canvas_data)"]

    DB_PAGES -->|GET /rest/v1/capture_pages| HOOK["usePageEditor() Hook"]

    HOOK --> STATE["State: canvasData (CanvasData v2.0)"]
    STATE --> LAYOUT["EditorLayout.tsx"]

    LAYOUT -->|selection.id === null| SB["EditorSidebar/ (Paleta, Seções, Camadas, Configs)"]
    LAYOUT -->|selection.id !== null| PP["PropertiesPanel/ (Propriedades do Elemento Selecionado)"]
    LAYOUT --> EC["EditorCanvas/ (Centro do Editor)"]

    EC -->|isPublicView={false}| CR_EDIT["@psi/canvas-renderer (Modo Edição)"]
    CR_EDIT --> SW_EDIT["SectionWrapper (Hover Frames, Drag Handles)"]
    SW_EDIT --> DW_EDIT["DivWrapper (Flexbox Container)"]
    DW_EDIT --> ACW_EDIT["AtomicComponentWrapper (Inline Editable Text)"]

    PP -->|Edita Propriedades| HOOK
    ACW_EDIT -->|Edita Texto Inline| HOOK
    HOOK -->|Debounce 1500ms| AUTOSAVE["useAutoSave.ts"]
    AUTOSAVE -->|PATCH /rest/v1/capture_pages| DB_DRAFT["public.capture_pages.draft_data"]

    PP -->|Clique 'Publicar'| RPC_PUB["POST /rpc/publish_capture_page"]
    RPC_PUB -->|Copia draft_data -> canvas_data| DB_PUB["public.capture_pages.canvas_data"]

    CLIENT["Visitante Web (Domínio/Subdomínio)"] --> SITES_APP["apps/sites (Next.js)"]
    DB_PUB -->|GET /rest/v1/capture_pages| SITES_APP
    SITES_APP -->|isPublicView={true}| CR_PROD["@psi/canvas-renderer (Modo Produção)"]
    CR_PROD --> CLEAN_HTML["HTML Renderizado Limpo sem Edit Chrome"]
```
