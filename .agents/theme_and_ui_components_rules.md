# Regras de Tema Claro / Escuro (Light/Dark Mode) & Componentes UI

Este documento estabelece o padrão arquitetural obrigatório para a construção de componentes de interface (UI) responsivos ao **Tema Claro (Light Mode)** e **Tema Escuro (Dark Mode)** no **Psi App** (`apps/web` e `@psi/ui`).

---

## 🎨 1. Arquitetura de Cores e Base de Mistura (`--mix-base`)

A plataforma utiliza um sistema inteligente de mistura de cores baseado em CSS Variables e na função nativa `color-mix(in srgb, ...)`.

### Como Funciona no `globals.css`:
```css
:root {
  /* Tema Escuro por padrão: superfície mistura o tom da marca com PRETO */
  --mix-base: #000000;
  --surface-border: rgba(255, 255, 255, 0.08);
  --surface-hover: rgba(255, 255, 255, 0.05);
  --surface-active: rgba(255, 255, 255, 0.10);
  --surface-input: rgba(0, 0, 0, 0.30);
  --surface-muted: rgba(255, 255, 255, 0.60);
}

html.light {
  /* Tema Claro: superfície mistura o tom da marca com BRANCO */
  --mix-base: #FFFFFF;
  --surface-border: rgba(0, 0, 0, 0.10);
  --surface-hover: rgba(0, 0, 0, 0.04);
  --surface-active: rgba(0, 0, 0, 0.08);
  --surface-input: rgba(255, 255, 255, 0.80);
  --surface-muted: rgba(0, 0, 0, 0.55);
}
```

> **Benefício Vital:** Esse mecanismo garante que todas as superfícies transparentes (cards, inputs, modais) **carreguem sutilmente o matiz da cor primária da psicóloga**, adaptando-se instantaneamente ao alternar entre os temas Claro e Escuro sem virar um cinza neutro sem vida.

---

## 🛠️ 2. Utilitários Globais de Superfície

Sempre priorize os utilitários CSS reutilizáveis da plataforma em novos componentes de UI:

| Classe CSS | Aplicação Recomendada | Mistura de Cores no `globals.css` |
| :--- | :--- | :--- |
| `.glass-sm` | Chips, Badges, Inputs pequenos, Botões de controle | `color-mix(in srgb, var(--brand-gradient-start) 5%, var(--mix-base))` |
| `.glass-md` | Cards de conteúdo, Seções, Colunas de listagem | `color-mix(in srgb, var(--brand-gradient-start) 8%, var(--mix-base))` |
| `.glass-lg` | Modais amplos, Painéis flutuantes principais | `color-mix(in srgb, var(--brand-gradient-start) 11%, var(--mix-base))` com `backdrop-blur(8px)` |
| `.brand-surface` | Superfície sólida de card | `background: var(--brand-card-bg-color); border: 1px solid var(--surface-border);` |
| `.brand-input` | Inputs de formulário, Textareas e Seletores | `background: var(--surface-input); border: 1px solid var(--surface-border);` |
| `.brand-modal` | Painéis principais de modais flutuantes | `color-mix(in srgb, var(--brand-gradient-start) 9%, var(--mix-base))` com `backdrop-blur(12px)` |
| `.brand-popup` | Menus dropdown e popovers flutuantes | `color-mix(in srgb, var(--brand-gradient-start) 8%, var(--mix-base))` com `backdrop-blur(20px)` |

---

## 🌗 3. Padrão Obrigatório de Par de Classes Tailwind

Ao utilizar classes utilitárias do Tailwind CSS em novos componentes, **SEMPRE especifique o par para Tema Claro e Tema Escuro**:

### 3.1 Textos (Hierarquia de Tipografia)
- **Títulos Principais:** `text-slate-900 dark:text-white`
- **Títulos Secundários / Labels:** `text-slate-800 dark:text-slate-100`
- **Textos de Apoio / Parágrafos:** `text-slate-600 dark:text-slate-300`
- **Legendas / Metadados / Datas:** `text-slate-500 dark:text-slate-400`
- **Textos Desativados:** `text-slate-400 dark:text-slate-600`

### 3.2 Fundos (Containers & Cards)
- **Fundo de Página:** `bg-slate-50 dark:bg-slate-950` ou utilitário `body` nativo.
- **Fundo de Card Padrão:** `bg-white dark:bg-slate-900` ou utilitários `.glass-sm` / `.glass-md`.
- **Fundo de Destaque / Hover:** `hover:bg-slate-100 dark:hover:bg-slate-800/60` ou `hover:bg-[var(--surface-hover)]`.

### 3.3 Bordas & Divisores
- **Bordas em Geral:** `border-[var(--surface-border)]` ou `border-slate-200 dark:border-white/10`
- **Bordas em Hover:** `hover:border-slate-300 dark:hover:border-white/20`
- **Borda de Foco:** `focus:border-[var(--brand-gradient-start)]`

---

## 🛑 4. O Que NUNCA Fazer em Componentes de UI

❌ **NUNCA usar cores fixas de fundo ou texto sem par dark:**
```tsx
// ❌ ERRADO: Incompatível com Tema Claro (ficará ilegível ou com fundo escuro fixo)
<div className="bg-slate-900 text-white p-4">Conteúdo</div>
```

✅ **CORRETO:**
```tsx
// ✅ CORRETO: Responde perfeitamente a ambos os temas
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 border border-[var(--surface-border)]">
  Conteúdo
</div>
```

❌ **NUNCA usar tons de cinza puro estáticos (`bg-gray-100`, `bg-gray-900`) para elementos da marca.**
✅ **CORRETO:** Usar `.glass-md`, `.brand-surface` ou variáveis `color-mix`.
