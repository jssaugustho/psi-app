# 🖥️ Architecture Spec: Visual Site Editor

> **Scope**: Canvas rendering, drag-and-drop section blocks, site schema state management & live preview.

---

## 🏗️ Architecture Overview

The Site Editor allows psychologists and tenants to build and customize their landing pages visually.

```text
[ Editor Page (page.tsx) ]
       │
       ▼ (manages state via hook)
[ useSiteEditor() Hook ]
       │
       ├──► [ EditorHeader ] (Actions: Save Draft, Publish, Device Toggle)
       ├──► [ EditorSidebar ] (Section List, Block Controls, Theme Customizer)
       └──► [ EditorCanvas ] (Iframe / Live Interactive Preview)
```

---

## ⚡ Architectural Directives

1. **State Isolation**:
   - `page.tsx` must ONLY instantiate `useSiteEditor()` and render layout containers.
   - Canvas state modifications (reordering sections, updating block text, color tweaks) mutate local draft state first (`draft_content` JSONB).
2. **Auto-Save & Debounce**:
   - Save operations to backend database (`site_drafts` table) must be debounced by **1,500ms** to prevent flooding PostgREST requests during typing.
3. **Block Schema Definition**:
   - All blocks must conform to the standard `SiteBlock` JSON schema (type, props, style, layout).
   - Component rendering is dynamically mapped via `BlockRenderer.tsx`.
