# 📋 Checklist de Mapeamento Mestre: Criador, Editor de Páginas & Formulários

> **Localização**: `.agents/checklists/editor_e_formularios_checklist.md`  
> **Objetivo**: Guia definitivo de auditoria, verificação de paridade de arquitetura e execução de correções de código para os agentes de IA.

---

## 🧙‍♂️ 1. Wizard de Criação & Herança do Consultório
> **Documento de Origem**: [.agents/architectures/site_wizard_and_defaults.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/architectures/site_wizard_and_defaults.md)

### Checklist de Implementação & Validação:
- [ ] **Redirecionamento Automático**: Se o psicólogo acessar `/dashboard/captacao` com 0 páginas ativas e 0 rascunhos, redirecionar automaticamente para `/dashboard/captacao/nova?fresh=true`.
- [ ] **Fluxo em 7 Etapas**:
  - [ ] **Etapa 1 (Identificação)**: Nome da profissional e título da página.
  - [ ] **Etapa 2 (Identidade Visual)**: Seleção por Cards entre *Herda marca do consultório* (padrão) e *Personalizar para este site*.
  - [ ] **Etapa 3 (Endereço Web)**: Exibição do subdomínio global do consultório (`subdomain.psi.app`) + input de `slug` relativo (ex: `/ansiedade`).
  - [ ] **Etapa 4 (Redes Sociais & Contato)**: Cards de escolha entre herdar redes do consultório ou personalizar links por site.
  - [ ] **Etapa 5 (Destino CTA Principal)**: Seleção entre `form` (Formulário), `whatsapp` (WhatsApp Direto) ou `external_url` (Link Externo).
  - [ ] **Etapa 6 (SEO & Social Share)**: Meta Title, Meta Description, Palavras-chave e Imagem OG Cover.
  - [ ] **Etapa 7 (Revisão & Instanciação)**: Card de resumo com validação antes de instanciar a página no banco de dados.
- [ ] **Herança Universal Sem Duplicidade**:
  - [ ] Se `hasBrandIdentityOverride === false`, **NÃO** copiar hexadecimais para `siteConfig.theme`. O site herda dinamicamente em tempo real as cores salvas em `workspaces`.
  - [ ] Subdomínios pertencem exclusivamente ao `workspace`. Sites filtram e rolam apenas pelo seu `slug`.
- [ ] **Cadeia de Herança de Template Inicial**:
  - [ ] 1º Prioridade: Herda estrutura do site mais recente do mesmo `workspace`.
  - [ ] 2º Prioridade (Fallback): Herda o modelo de template global (`DEFAULT_TEMPLATE_MODEL`).

---

## 🖥️ 2. Editor Visual de Páginas & UI/UX Sidebar
> **Documento de Origem**: [.agents/architectures/site_editor.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/architectures/site_editor.md)

### Checklist de Implementação & Validação:
- [ ] **Layout Elementor na Sidebar Esquerda**:
  - [ ] Quando `selection.id === null`: Exibir barra lateral principal (`EditorSidebar`: Paleta, Seções, Navbar, Camadas, Configurações). O canvas central ocupa 100% da largura restante.
  - [ ] Quando `selection.id !== null`: A barra lateral esquerda muda instantaneamente para o `<PropertiesPanel />` com botão `← Voltar`, badge do tipo do componente e botão rápido de Visibilidade (`Eye`/`EyeOff`).
- [ ] **Seletor de Estados com 2 Abas (Normal vs Hover)**:
  - [ ] **Aba Estado Normal**: Accordions de Conteúdo, Dimensões & Medidas, Tipografia, Cores, Fundo, Bordas e Efeitos.
  - [ ] **Aba Estado Hover**: `<HoverPropertiesControl />` para configurar `hoverBackgroundColor`, `hoverColor`, `hoverBorderColor`, `hoverOpacity`, `hoverScale`, `hoverEffect` e tempo de transição em ms (`transitionDurationMs`).
- [ ] **Accordion de Fundo (Background Options)**:
  - [ ] Seletor de modo: `Transparente` (`type: 'none'`), `Cor Única` (`type: 'color'`) e `Imagem` (`type: 'image'`).
  - [ ] Slider de **Background Blur** (`backdropBlur` de `0px` a `24px`) para efeito glassmorphism.
- [ ] **Edição Inline de Texto no Canvas**:
  - [ ] Ativar `contentEditable={isSelected}` em títulos, parágrafos, labels e botões.
  - [ ] Impedir desseleção indesejada do canvas durante a seleção manual de texto (`window.getSelection()`).
- [ ] **Seleção com Zero Layout Shift**:
  - [ ] **NUNCA** alterar `border` ou `padding` de elementos no hover/seleção.
  - [ ] Usar estritamente CSS `outline` com offset negativo (`outline: 2px solid ...`, `outlineOffset: -2px`).
- [ ] **Pickers de Cor Inline (Sem Portal)**:
  - [ ] Renderizar `<GlobalColorPicker />` posicionado de forma relativa (`absolute left-0 top-full z-50`). NUNCA usar `createPortal` para `document.body` na sidebar.
- [ ] **Escopo de Containers Sticky Globais (`stickyScope: 'page'`)**:
  - [ ] Garantir que o escopo global da página (`stickyScope: 'page'`) ancore o elemento no container raiz do Canvas e NUNCA transborde para a interface externa do Editor (Topbar Header ou Sidebar).
  - [ ] Usar isolamento de viewport (`isolation: isolate`, `overflow-y: auto`) sem `contain: paint` em wrappers de scroll, mantendo o scroll 100% fluido e a contenção absoluta no Canvas.
- [ ] **Cards Arrastáveis de Seções e Estruturas (`AddPalette.tsx`)**:
  - [ ] Renderizar todas as estruturas de seções (1 Coluna, 2 Colunas, 3 Colunas, Navbar Clássico, Navbar Flutuante, Rodapé) como cards arrastáveis (`draggable`, `onDragStart`, `GripVertical`), integrados na categoria `SEÇÕES & ESTRUTURA`.
  - [ ] Permitir arrastar a seção diretamente para o canvas/qualquer seção existente para inserção instantânea via `createSectionFromPreset(item.preset)`.
- [ ] **Auto-Save Debocado**:
  - [ ] Auto-save em 1.500ms salvando estritamente em `capture_pages.draft_data`.

---

## 📄 3. Anatomia `CanvasData v2.0`, Templates & Estilos Globais
> **Documento de Origem**: [.agents/architectures/page_templates.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/architectures/page_templates.md)

### Checklist de Implementação & Validação:
- [ ] **Versão e Raiz de Dados**:
  - [ ] Objeto raiz `CanvasData` possui obrigatoriamente `version: '2.0'`.
  - [ ] Armazena `globalStyles?: CanvasGlobalStyles` (`typography`, `buttonTemplates`, `theme`) diretamente no JSON.
- [ ] **Construtores Factory Obrigatórios**:
  - [ ] Todos os elementos de templates utilizam `createDefaultSection`, `createDefaultDiv` ou `createDefaultComponent` de `constants.ts`.
  - [ ] **NENHUM** componente é instanciado inline sem passar pelo construtor.
- [ ] **Uso de Variáveis CSS e `color-mix`**:
  - [ ] Substituir todas as cores hexadecimais por variáveis CSS: `var(--brand-gradient-start)`, `var(--brand-gradient-end)`, `var(--brand-contrast-color)`, `var(--surface-border)`, `var(--site-bg)`.
  - [ ] Usar `color-mix(in srgb, var(--brand-gradient-start) 4%, var(--site-bg))` para fundos translúcidos de cards/badges.
- [ ] **Paridade 1:1 JSON ↔ Painel ↔ Canvas**:
  - [ ] Garantir que propriedades visíveis (ex: `color`, `borderStyle`, `fontSize`) existam no JSON desde a criação do componente, para que os inputs do painel não abram vazios.
- [ ] **Hierarquia de Containers**:
  - [ ] Nível 1: `Section[]` (Full-width).
  - [ ] Nível 2: `DivComponent[]` (Containers Flex).
  - [ ] Nível 3: `AtomicComponent[]` (Elementos de texto, imagem, botão, card, etc.).

---

## 🎨 4. Pacote Monorepo de Renderização (`@psi/canvas-renderer`)
> **Documento de Origem**: [.agents/architectures/canvas_renderer_package.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/architectures/canvas_renderer_package.md)

### Checklist de Implementação & Validação:
- [ ] **Fonte Única de Renderização**:
  - [ ] `apps/web` (Editor) e `apps/sites` (Site Publicado / Preview) consomem exclusivamente o `<CanvasRenderer />` exportado por `@psi/canvas-renderer`.
  - [ ] Nenhuma lógica de renderização de seções ou wrappers é duplicada dentro das aplicações.
- [ ] **Controle por Flag `isPublicView`**:
  - [ ] `isPublicView={false}` (Editor): Ativa seletores de foco, edição inline, drag-and-drop (`DndContext`) e menus de contexto.
  - [ ] `isPublicView={true}` (Site Publicado): Desativa todos os listeners de edição, renderizando HTML/CSS estático leve e performático.
- [ ] **Carregamento Dinâmico de Fontes**:
  - [ ] O utilitário `loadGoogleFonts([headingFont, bodyFont])` injeta dinamicamente as famílias tipográficas configuradas na tag `<head>` em runtime.
- [ ] **Resolução de Temas (`colorHelpers.ts`)**:
  - [ ] Aplicação estrita da cadeia de prioridade na resolução de cores e botões: `canvasData.globalStyles` -> `siteConfig.theme` -> Baseline do Consultório.

---

## 📋 5. Form Builder, Destino CTA & Vínculo de Formulário
> **Documento de Origem**: [.agents/architectures/form_builder_and_page_destination.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/architectures/form_builder_and_page_destination.md)

### Checklist de Implementação & Validação:
- [ ] **Sincronização Relacional de Destino**:
  - [ ] Se `cta_type === 'form'`, a coluna `capture_pages.form_id` e `draft_data.formId` contêm o UUID do formulário ativo.
  - [ ] Se `cta_type` mudar para `'whatsapp'` ou `'external_url'`, a aplicação desvincula `form_id = null` e `draft_data.formId = null` no PostgreSQL.
- [ ] **Alternância da Tela Principal (React Flow Canvas)**:
  - [ ] Se `cta_type === 'whatsapp'` ou `'external_url'`, ocultar o canvas do React Flow e exibir a **Tela de Configuração de Destino** (mensagem customizada de WhatsApp ou URL de redirecionamento).
  - [ ] Se `cta_type === 'form'`, exibir o fluxo do React Flow.
- [ ] **Troca Reativa de Formulário (`<FormManagerSelect />`)**:
  - [ ] Ao trocar o formulário selecionado no topo do canvas, resetar os nós/arestas (`setNodes([])`, `setEdges([])`) e carregar o `formFlow` do novo formulário.
  - [ ] Oferecer CRUD inline no Select: Criar novo formulário, renomear formulário atual e excluir formulário.
- [ ] **Isolamento Multi-Tenant**:
  - [ ] Formulários em `public.screening_forms` são isolados estritamente por `workspace_id` sob RLS.

---

## 🌐 6. Rascunhos, Publicação & Domínios
> **Documento de Origem**: [.agents/architectures/site_staging_and_publishing.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/architectures/site_staging_and_publishing.md)

### Checklist de Implementação & Validação:
- [ ] **Isolamento Absoluto de Estado**:
  - [ ] Edições e auto-save no editor afetam **APENAS** `capture_pages.draft_data`.
  - [ ] O site público ao vivo em produção lê **EXCLUSIVAMENTE** `capture_pages.canvas_data`.
- [ ] **Trava de Validação na Publicação**:
  - [ ] O clique em "Publicar Site" analisa seções ativas (`hero`, `about`, `diagnostic`, `process`, `space`, `faq`).
  - [ ] Se houver campos de texto obrigatórios vazios (ex: título, CRP, texto principal), bloquear a publicação e exibir um modal com a lista de pendências.
- [ ] **Publicação Atômica via RPC (`publish_capture_page`)**:
  - [ ] Chamar a Stored Function PL/pgSQL `publish_capture_page(p_page_id)`.
  - [ ] A RPC copia `draft_data` para `canvas_data`, atualiza `is_published = true` e grava `published_at = now()` em uma única transação atômica no banco de dados.
- [ ] **Mapeamento de Subdomínios e Slugs**:
  - [ ] Subdomínio `subdomain.psi.app` é global do workspace. Nginx/Cloudflare resolve a página pelo par (`workspace_id`, `slug`).

---

## 🎨 7. Checklist Mestre de Auditoria dos Elementos do Canvas (21 Tipos)

| Elemento | Status | Cores / Gradientes | Bordas & Radius | Alinhamento Flex | Efeitos (Sombra/Opac.) | Edição Inline / Props |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Section (Seção)** | ✅ Ok | ✅ Sólida / Gradiente / Imagem | ✅ Sólida, Tracejada, Pontos | ✅ Row, Column, Justify, Align | ✅ Sombra, Opacidade, Blur | ✅ Largura Máxima, Padding |
| **Div (Container)** | ✅ Ok | ✅ Sólida / Gradiente / Imagem | ✅ Sólida, Tracejada, Pontos | ✅ Row, Column, Gap, Justify, Align | ✅ Sombra, Opacidade, Blur | ✅ Dimensões, Flex Basis |
| **Carousel (Carrossel)** | ✅ Ok | ✅ Sólida / Gradiente | ✅ Sólida, Tracejada, Pontos | ✅ Flex, Gap, Autoplay | ✅ Sombra, Filter | ✅ Slides, Navegação |
| **Heading (Título H1-H6)** | ✅ Ok | ✅ Cor / Gradiente no Texto | ✅ Bordas e Radius | ✅ Align Text (Left, Center, Right) | ✅ Sombra de Texto e Container | ✅ Inline Text, HTML |
| **Paragraph (Texto)** | ✅ Ok | ✅ Cor / Gradiente no Texto | ✅ Bordas e Radius | ✅ Align Text (Left, Center, Right) | ✅ Sombra e Blur | ✅ Inline Text, HTML |
| **Label (Subtítulo)** | ✅ Ok | ✅ Cor / Gradiente no Texto | ✅ Bordas e Radius | ✅ Align Text | ✅ Sombra e Opacidade | ✅ Inline Text |
| **Button (Botão CTA)** | ✅ Ok | ✅ Sólida / Gradiente no Fundo | ✅ Bordas, Radius, Hover | ✅ Auto / Stretch / Center | ✅ Hover Lift, Glow, Sombra | ✅ Destino CTA, Ícones |
| **Badge (Selo)** | ✅ Ok | ✅ Sólida / Gradiente | ✅ Bordas e Radius | ✅ Align Self, Flex | ✅ Sombra e Blur | ✅ Ícone, Texto Inline |
| **Image (Imagem)** | ✅ Ok | ✅ Overlay / Fit | ✅ Bordas e Radius | ✅ Object Fit, Width/Height | ✅ Parallax, Sombra, Blur | ✅ Upload, URL, Alt |
| **Video (Vídeo)** | ✅ Ok | ✅ Aspect Ratio | ✅ Bordas e Radius | ✅ Responsive Container | ✅ Sombra | ✅ Embed URL (YouTube/Vimeo) |
| **Avatar (Perfil)** | ✅ Ok | ✅ Border & Ring Color | ✅ Bordas e Radius (Circular) | ✅ Align Self | ✅ Sombra | ✅ Upload Foto, Tamanho |
| **Icon (Ícone Lucide)** | ✅ Ok | ✅ Cor Sólida / Gradiente | ✅ Background & Radius | ✅ Align Self | ✅ Glow, Hover Scale | ✅ Seletor de Ícones |
| **Card (Conteúdo)** | ✅ Ok | ✅ Sólida / Gradiente / Glass | ✅ Bordas e Radius | ✅ Inner Flex Column/Row | ✅ Sombra, Blur, Parallax | ✅ Título, Descrição, Ícone |
| **Testimonial (Depoimento)** | ✅ Ok | ✅ Card Background | ✅ Bordas e Radius | ✅ Layout Flex | ✅ Sombra, Blur | ✅ Nome, Cargo, Foto, Rating |
| **FAQ Item (Acordeão)** | ✅ Ok | ✅ Header & Content Color | ✅ Bordas e Radius | ✅ Expand / Collapse Flex | ✅ Sombra | ✅ Pergunta e Resposta |
| **Stat Counter (Métrica)** | ✅ Ok | ✅ Valor & Label Colors | ✅ Bordas e Radius | ✅ Alignment Flex | ✅ Sombra | ✅ Número, Sufixo, Descrição |
| **List (Lista Tópicos)** | ✅ Ok | ✅ Item & Icon Colors | ✅ Bordas e Radius | ✅ Row / Column Item List | ✅ Sombra | ✅ Bullets, Ícones por Item |
| **Divider (Linha Divisória)** | ✅ Ok | ✅ Cor / Gradiente de Linha | ✅ Espessura e Estilo | ✅ Margin / Spacing | ✅ Opacidade | ✅ Estilo (Solid, Dashed) |
| **Spacer (Espaçador)** | ✅ Ok | N/A | N/A | ✅ Height / Width | N/A | ✅ Responsive Height |
| **Logo (Marca)** | ✅ Ok | ✅ Text / Image Color | ✅ Bordas & Radius | ✅ Alignment | ✅ Sombra | ✅ Upload / Preset Logo |
| **Social Links** | ✅ Ok | ✅ Icon & Hover Colors | ✅ Bordas & Radius | ✅ Horizontal / Vertical Row | ✅ Hover Scale | ✅ Redes e URLs |

