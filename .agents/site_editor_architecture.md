# Arquitetura e Funcionamento do Editor de Sites (Psi-App)

> **Diferenciação de Fluxos:** Este documento detalha a arquitetura do **Editor de Páginas Existentes** (`/dashboard/captacao/[pageId]`). Para a documentação do **Wizard de Criação de Novas Páginas (`/dashboard/captacao/nova`)**, extração de cores em Base64 e sistema de múltiplos rascunhos, consulte: [`site_creation_wizard_architecture.md`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/site_creation_wizard_architecture.md).

---

## 1. Visão Geral da Arquitetura

O editor de sites opera através de uma arquitetura **Bi-Direcional baseada em Iframe e `postMessage`**, dividindo a interface em duas camadas:

```
┌─────────────────────────────────────────┐         ┌─────────────────────────────────────────┐
│           PAINEL DO EDITOR              │         │             PREVIEW IFRAME              │
│       (apps/web: dashboard/captacao)    │         │          (apps/sites: /p/preview)       │
├─────────────────────────────────────────┤         ├─────────────────────────────────────────┤
│ • Controle de Estados (page, siteConfig)│  SYNC   │ • Renderizador (CapturePageRenderer)    │
│ • Sidebar com Abas (Design, Fluxo, Config)├───────►│ • Aplicação dinâmica de variáveis CSS   │
│ • Seletores de Cores / Google Fonts     │ DATA    │ • Animações e componentes em tempo real │
│ • Reordenação e Edição de Seções        │         │                                         │
│                                         │ EDIT    │ • Clique em qualquer elemento do site   │
│ • Foco e rolagem automática nos campos  │◄────────┤ • Emissão do evento 'EDIT_ELEMENT'      │
└─────────────────────────────────────────┘ ELEMENT └─────────────────────────────────────────┘
```

### Principais Componentes:
- **Painel Dashboard ([`page.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/dashboard/captacao/[pageId]/page.tsx))**: Gerencia o estado de edição (`page`), histórico de desfazer/refazer (`undo`/`redo`) e o modal de novos layouts.
- **Renderizador de Preview ([`CapturePageRenderer.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/sites/src/components/CapturePageRenderer.tsx))**: Executa dentro do Iframe (`iframeRef`). Escuta atualizações do estado `SYNC_DATA` e re-renderiza o site sem recarregar a página.

---

## 2. Sistema de Tema Global (Paleta de Cores & Google Fonts)

Todas as cores e tipografias do site são geridas de forma **centralizada e global**, garantindo harmonia visual e identidade de marca profissional.

### 2.1 Paleta de Cores
A paleta de cores permite seleção via **Color Picker gráfico** ou digitação direta do **código Hexadecimal (`#HEX`)**:

```json
{
  "siteConfig": {
    "theme": {
      "colors": {
        "primaryStart": "#CC8667",
        "primaryEnd": "#AA5533",
        "contrast": "#FFFFFF",
        "bgDark": "#09090B",
        "cardDark": "#18181B",
        "textDark": "#F4F4F5"
      }
    }
  }
}
```

#### Variáveis CSS Dinâmicas Aplicadas:
- `--brand-gradient-start`: Cor inicial do gradiente da marca.
- `--brand-gradient-end`: Cor final do gradiente da marca.
- `--brand-contrast-color`: Cor de destaque para botões e contrastes.
- `--brand-bg-color`: Cor de fundo escura nativa.
- `--brand-card-bg-color`: Cor de fundo dos cartões/cards.
- `--brand-text-color`: Cor padrão de leitura dos textos.

---

### 2.2 Tipografia Dinâmica com Google Fonts
A psicóloga pode definir de forma independente a fonte dos **Títulos** e dos **Parágrafos/Textos**:

#### Coleção de Fontes Curadas para Psicologia:
- **Títulos (Headings)**:
  - `Playfair Display` *(Clássica, clínica e elegante)*
  - `Cormorant Garamond` *(Sofisticada e acolhedora)*
  - `Lora` *(Serifada moderna)*
  - `Outfit` *(Moderna e tecnológica)*
  - `Plus Jakarta Sans` *(Humana e equilibrada)*
  - `Montserrat` *(Forte e corporativa)*
- **Parágrafos (Body)**:
  - `Inter` *(Altamente legível)*
  - `Roboto` *(Neutra e moderna)*
  - `Plus Jakarta Sans` *(Fluida)*
  - `Open Sans` *(Leve e clara)*
  - `Lora` *(Editorial)*

As fontes selecionadas são carregadas dinamicamente no `<head>` do site via API de Fonts do Google:
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
```

---

## 3. Gerenciamento e Reordenação de Seções

O layout da página é um array dinâmico em `siteConfig.sections`:

```json
[
  { "id": "diagnostic", "type": "diagnostic", "isActive": true, "name": "Especialidades" },
  { 
    "id": "grid-171239812", 
    "type": "grid", 
    "name": "Grade de Destaques", 
    "isActive": true,
    "settings": {
      "columns": 3,
      "markerType": "number",
      "cardStyle": "glass",
      "itemAlignment": "left"
    } 
  }
]
```

### Funcionalidades do Editor:
1. **Hero e Rodapé Fixos**: A seção no topo (Hero) e no final (Rodapé) possuem posições fixas.
2. **Reordenação Flexível (`moveSection`)**: Todas as seções intermediárias podem ter sua ordem alterada via botões de seta (`ArrowUp` / `ArrowDown`), refletindo imediatamente na tela e no menu de navegação.
3. **Popup de Novos Modelos (`BrandModal`)**: O usuário pode adicionar novos blocos de layout livre (Grid, 2 Colunas, Texto + Imagem, Bloco de Texto Simples) ou reativar seções semânticas originais do template.

---

## 4. Parâmetros Estruturais de Seção (Elementor-Style)

Cada seção aceita parâmetros funcionais de layout no nó `settings`:

### 4.1 Seção de Grid (`type: 'grid'`)
- **`columns`**: `2` | `3` | `4` *(Quantidade de colunas no desktop)*.
- **`markerType`**: `'number'` (ex: 01, 02) | `'icon'` | `'none'`.
- **`cardStyle`**: `'glass'` (cartão flutuante) | `'bordered'` (borda fina) | `'flat'` (sem cartão).
- **`itemAlignment`**: `'left'` | `'center'`.

### 4.2 Seção de 2 Colunas (`type: 'two-columns'` ou `type: 'text-image'`)
- **`columnOrder`**: `'text-first'` (Texto à esquerda) | `'media-first'` (Mídia à esquerda).
- **`mediaType`**: `'image'` (Foto) | `'map'` (Google Maps) | `'none'`.
- **`imageAspectRatio`**: `'portrait'` (3:4) | `'square'` (1:1) | `'rounded'` (Circular).

### 4.3 Seção de Perguntas Frequentes (`type: 'faq'`)
- **`displayMode`**: `'accordion'` (expansível) | `'grid'` (duas colunas abertas).
- **`defaultOpenFirst`**: `true` | `false`.

---

## 5. Mecanismo de Click-to-Edit

Para uma experiência sem atritos, clicar em qualquer elemento no preview do site focaliza o formulário correspondente:

1. **No Preview (`CapturePageRenderer.tsx`)**:
   Ao clicar em um elemento editável, o iframe envia o evento:
   ```typescript
   window.parent.postMessage({ type: 'EDIT_ELEMENT', field: 'grid-171239812.title' }, '*');
   ```
2. **No Editor (`page.tsx`)**:
   O ouvinte intercepta a mensagem, troca para a aba de Layout (`setActiveTab('layout')`), expande o acordeão da seção correspondente (`setOpenSection(prefix)`), e executa a rolagem suave com foco:
   ```typescript
   const inputEl = document.getElementById(targetField);
   if (inputEl) {
     inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
     inputEl.focus();
   }
   ```
