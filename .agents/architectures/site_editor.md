# 🖥️ Architecture Spec: Visual Site Editor

> **Scope**: Canvas rendering, drag-and-drop section blocks, site schema state management, Aba Destino (CTA destination & form binding) & live preview.

---

## 🏗️ Architecture Overview

The Site Editor allows psychologists and tenants to build and customize their landing pages visually.

```text
[ Editor Page (page.tsx) ]
       │
       ▼ (manages state via hook)
[ useSiteEditor() / PageEditor State ]
       │
       ├──► [ Top Tab Bar ] ("Conteúdo e Seções" | "Cores e Estilo" | "Destino" | "Configurações")
       ├──► [ EditorSidebar ] (Section List, Block Controls, Destination Choices & Step Templates)
       └──► [ Main Workspace ]
              ├──► activeTab === 'layout' / 'theme' / 'settings' ──► Live Preview Iframe (Desktop / Mobile)
              └──► activeTab === 'flow' (Aba Destino)
                     ├──► ctaType === 'form' ────────► React Flow Canvas + <FormManagerSelect />
                     └──► ctaType === 'whatsapp'/'external_url' ──► Tela de Configurações de Destino
```

---

## ⚡ Architectural Directives

1. **State Isolation**:
   - Canvas state modifications (reordering sections, updating block text, color tweaks) mutate local draft state first.
2. **Auto-Save & Debounce**:
   - Save operations to backend database (`capture_pages`) are debounced by **1,500ms** to prevent flooding PostgREST requests during typing.
3. **Aba "Destino" & Form Binding**:
   - Renomeada de "Perguntas da Triagem" para **"Destino"** (`Target` icon).
   - Quando `ctaType === 'form'`, exibe o `<FormManagerSelect />` na barra flutuante sobre o canvas e permite gerenciar formulários do workspace (trocar, criar, renomear, excluir).
   - Quando `ctaType === 'whatsapp'` ou `'external_url'`, oculta o canvas do React Flow e renderiza a tela centralizada de configurações de destino, definindo `form_id = null` no PostgreSQL.
4. **Block Schema Definition**:
   - All blocks conform to standard `SiteBlock` JSON schema (type, props, style, layout).
