# 🎨 UI Standardization & White-Label Rules

Estas regras governam como todos os elementos visuais recorrentes devem ser construídos no frontend do `psi-app` (apps `web` e `admin`). O objetivo é centralizar 100% dos estilos de UI em classes utilitárias do `globals.css`, eliminando cores e propriedades arbitrárias (`hardcoded`) nos componentes JSX.

---

## 1. O Que É Personalizável pelo Tenant

O sistema de White-Label expõe **apenas 3 variáveis de cor** configuráveis pelo tenant:

| Variável CSS                  | Significado                                | Padrão (Fallback Neutro) |
|-------------------------------|--------------------------------------------|--------------------------|
| `--brand-gradient-start`      | Cor inicial do gradiente da marca          | `#27272A`                |
| `--brand-gradient-end`        | Cor final do gradiente da marca            | `#52525B`                |
| `--brand-contrast-color`      | Cor do texto sobre o gradiente (botões)    | `#FFFFFF`                |

**Todas as demais cores de fundo, cartões e textos são neutras e fixas** (zinc-950/900/100 no dark; zinc-50/white/zinc-950 no light). Elas se mesclam sutilmente com o gradiente via `color-mix` no `body`.

---

## 2. Variáveis CSS Disponíveis

### Marca
```css
var(--brand-gradient-start)   /* Cor principal da marca */
var(--brand-gradient-end)     /* Cor secundária da marca */
var(--brand-gradient)         /* linear-gradient(135deg, start, end) */
var(--brand-contrast-color)   /* Texto sobre o gradiente */
var(--brand-bg-color)         /* Fundo da página (neutro, fixo) */
var(--brand-card-bg-color)    /* Fundo dos cards (neutro, fixo) */
var(--brand-text-color)       /* Texto padrão (neutro, fixo) */
var(--mix-base)               /* Preto (#000) dark / Branco (#FFF) light — use em color-mix() */
```

> **Como funciona o `--mix-base`**: todas as superfícies usam `color-mix(in srgb, var(--brand-gradient-start) N%, var(--mix-base))` para obter um tom que carrega o matiz da marca, sem virar cinza. Em dark mode a base é preta; em light mode, branca. O percentual N define a intensidade do matiz.

### Superfícies (Opacidades Neutras)
```css
var(--surface-border)         /* Borda padrão rgba(255,255,255,0.08) */
var(--surface-hover)          /* Fundo de hover rgba(255,255,255,0.05) */
var(--surface-active)         /* Fundo de item ativo rgba(255,255,255,0.10) */
var(--surface-input)          /* Fundo de inputs rgba(0,0,0,0.30) */
var(--surface-muted)          /* Opacidade de texto secundário 0.60 */
```

### Status Semânticos
```css
var(--status-success-bg/border/text)
var(--status-error-bg/border/text)
var(--status-warning-bg/border/text)
var(--status-info-bg/border/text)
```

---

## 3. Classes Utilitárias Padronizadas

Cada elemento recorrente tem uma classe própria definida no `globals.css`. **Nunca recrie estilos inline para estes casos.**

### Layouts e Containers

| Classe           | Mix (dark) | Uso                                                                 |
|------------------|------------|---------------------------------------------------------------------|
| `.glass-sm`      | 5% + preto | Elementos pequenos: tabs, chips, inputs de busca, badge containers  |
| `.glass-md`      | 8% + preto | Cards de dashboard, colunas kanban, painéis de filtro               |
| `.glass-lg`      | 11% + preto| Modais secundários, sobreposições de alta prioridade                |
| `.brand-modal`   | 9% + preto | Painel principal de modais                                          |
| `.brand-popup`   | 8% + preto | Dropdowns, tooltips e popovers flutuantes                           |
| `.brand-toolbar` | 6% + preto | Cabeçalhos de seção com borda inferior                              |
| `.brand-surface` | card-bg    | Cards com fundo sólido do tema                                      |

> Em light mode, a base de mistura troca automaticamente para branco via `--mix-base: #FFFFFF`.

### Interação e Sobreposição

| Classe            | Uso                                                                      |
|-------------------|--------------------------------------------------------------------------|
| `.brand-overlay`  | Fundo escurecido com blur — usado para cobrir o app atrás de modais      |
| `.brand-modal`    | Corpo do modal flutuante (card com glassmorphism forte)                  |
| `.brand-popup`    | Dropdowns, tooltips e popovers flutuantes menores                        |

### Formulários

| Classe         | Uso                                          |
|----------------|----------------------------------------------|
| `.brand-input` | `<input>`, `<select>`, `<textarea>` padrão   |

### Decorativos

| Classe                | Uso                                                          |
|-----------------------|--------------------------------------------------------------|
| `.brand-badge`        | Tags/pills com cor da marca em fundo translúcido             |
| `.brand-accent`       | Botão ou elemento com gradiente da marca como fundo          |
| `.brand-accent-text`  | Texto com gradiente da marca (clip-text)                     |
| `.brand-accent-border`| Borda sutil com a cor inicial do gradiente                   |
| `.brand-divider`      | Linha horizontal divisória (`<hr>` ou `border-top`)         |

---

## 4. Regras de Uso

### ✅ CORRETO — Use as classes e variáveis CSS
```tsx
{/* Botão primário com gradiente da marca */}
<button
  className="px-5 py-2 rounded-xl font-bold brand-accent"
>
  Salvar
</button>

{/* Card de seção */}
<div className="glass-md rounded-2xl p-6">
  ...
</div>

{/* Modal com backdrop */}
<div className="brand-overlay" />
<div className="brand-modal rounded-2xl p-8">
  ...
</div>

{/* Input padrão */}
<input className="brand-input w-full px-4 py-2 rounded-xl" />

{/* Borda divisória */}
<hr className="brand-divider my-4" />

{/* Badge da marca */}
<span className="brand-badge">Ativo</span>
```

### ❌ INCORRETO — Não faça isso
```tsx
{/* Nunca use indigo hardcoded */}
<button className="bg-indigo-600 text-white">Salvar</button>

{/* Nunca use bg sólido quebrando o glass */}
<div className="glass-md" style={{ background: '#0F172A' }}>

{/* Nunca use slate-900/800 para inputs/selects/containers */}
<input className="bg-slate-900 border border-slate-800 text-slate-200" />

{/* Nunca use text-indigo ou border-indigo para branding */}
<div className="border-indigo-500/60 bg-indigo-500/20 text-indigo-300">
```

---

## 5. Casos Especiais Permitidos

- **Cores de status semânticos** (`emerald`, `red`, `amber`) são aceitas para estados de sucesso, erro e alerta. Mas prefira usar as variáveis `var(--status-*)`.
- **Opacidades sobre branco/preto neutro** como `hover:bg-white/5` ou `hover:bg-black/10` são permitidas para efeitos de hover sutis.
- **`text-slate-*`** pode ser usado em texto secundário de baixíssima prioridade (ex: timestamps, placeholders). Para texto principal, use `var(--brand-text-color)`.

---

## 6. Onde Editar

Todos os estilos acima vivem em dois arquivos espelhados:
- [`apps/web/src/app/globals.css`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/globals.css)
- [`apps/admin/src/app/globals.css`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/admin/src/app/globals.css)

Ao adicionar um novo padrão visual recorrente, sempre adicione a classe nos dois arquivos antes de utilizá-la nos componentes.
