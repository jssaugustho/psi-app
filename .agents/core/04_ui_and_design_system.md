# 🎨 Core Rule 04: UI, Design System & White-Label Rules

> **Scope & Triggers**: Leia este arquivo antes de criar componentes visuais, modais, botões, inputs, alterar CSS ou modificar arquivos `page.tsx` nos apps `web` ou `admin`.

---

## ⚡ 1. Directives & Constraints (ALWAYS / NEVER)

- **ALWAYS use shared UI components from `@psi/ui`**: NUNCA crie botões, modais, inputs ou cards do zero dentro dos apps `web` or `admin`.
- **ALWAYS keep `page.tsx` files under 50 lines**: Delegar a lógica de negócio a custom hooks (`usePageEditor`) e a apresentação a componentes atômicos.
- **NEVER hardcode hex colors or duplicate Tailwind brand classes**: NUNCA use cores hardcoded (`#18181b` ou `bg-purple-600`). Use as classes padrão ou CSS variables (`var(--brand-gradient-start)`).
- **ALWAYS maintain dark/light theme support**: Componentes devem suportar temas claro e escuro usando classes Tailwind `dark:`.

---

## 🎨 2. White-Label System (3 Brand Color Variables)

O sistema aceita apenas **3 variáveis de cor por tenant**. O restante das superfícies e cartões é gerado via `color-mix()` CSS:

| Variável CSS | Função | Fallback Padrão |
|---|---|---|
| `--brand-gradient-start` | Cor primária da marca | `#27272A` |
| `--brand-gradient-end` | Cor secundária da marca | `#52525B` |
| `--brand-contrast-color` | Cor do texto sobre o botão da marca | `#FFFFFF` |

```css
/* Mistura dinâmica da cor da marca com a base do tema (claro/escuro) */
--mix-base: #000; /* Dark mode (#000), Light mode (#FFF) */
--brand-card-bg-color: color-mix(in srgb, var(--brand-gradient-start) 4%, var(--mix-base));
```

---

## 📦 3. Utility Classes Reference (`globals.css`)

| Classe Utilitária | Propósito |
|---|---|
| `surface-card` | Background de cartão com borda sutil e `color-mix` do tenant |
| `surface-panel` | Background de painel lateral ou gaveta secundária |
| `btn-brand` | Botão principal da marca com gradiente e texto em `--brand-contrast-color` |
| `btn-ghost` | Botão sutil neutro para ações secundárias |
| `glass-panel` | Painel estilo Glassmorphism (`backdrop-blur-md`, borda sutil) |
| `modal-backdrop` | Overlay escuro e desfocado para modais |
| `modal-content` | Caixa principal padronizada de modais |

---

## 📖 4. Concrete Code Recipes

### Padrão de Componente Reutilizável em `@psi/ui`
```tsx
import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
}

export function SurfaceCard({ title, children }: CardProps) {
  return (
    <div className="surface-card p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-950 shadow-sm">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">{title}</h3>
      {children}
    </div>
  );
}
```

---

## ❌ 5. Anti-Patterns & Prohibitions

### ❌ ERRADO: Cores hardcoded em estilos inline ou Tailwind arbitrário
```tsx
// ❌ INSEGURO: Cores fixas quebram o sistema White-Label dos tenants
<div style={{ backgroundColor: '#18181b', color: '#ffffff' }}>
  <button className="bg-purple-600 text-white">Salvar</button>
</div>
```

### ✅ CORRETO: Uso de classes utilitárias e variáveis CSS
```tsx
// ✅ CORRETO: Respeita o tema claro/escuro e o White-Label do tenant
<div className="surface-card p-4">
  <button className="btn-brand">Salvar</button>
</div>
```
