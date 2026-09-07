# 🎨 Core Rule 04: UI, Design System & White-Label Rules

> **Scope & Triggers**: Leia este arquivo antes de criar componentes visuais, modais, botões, inputs, alterar CSS ou modificar arquivos `page.tsx` nos apps `web` ou `admin`.

---

## ⚡ 1. Directives & Constraints (ALWAYS / NEVER)

- **ALWAYS use shared UI components from `@psi/ui`**: NUNCA crie botões, modais, inputs ou cards do zero dentro dos apps `web` ou `admin`.
- **NEVER use native browser `<select>` dropdowns**: ALWAYS use custom overlay selects (`<Select />` ou o overlay de `<PhoneInput />` em `@psi/ui`) com backdrop glassmorphism, suporte a temas e scrollbar customizada. Seletores nativos quebram o design system.
- **ALWAYS use `<PhoneInput />` and `phone-utils` from `@psi/ui` for phone/mobile numbers**: NUNCA crie máscaras personalizadas do zero ou utilize `<Input type="text">` simples para telefones/WhatsApp.
- **ALWAYS store phone numbers in E.164 format (`+5511999999999`)**: Utilize `toE164()` para serializar e `parseE164()` para desserializar.
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

## 📦 3. Utility Classes & Standard UI Components Reference (`@psi/ui`)

| Componente / Utilitário | Propósito | Exemplo de Uso |
|---|---|---|
| `<PhoneInput />` | Input de telefone com seletor de país (bandeira + DDI) e máscara dinâmica | `<PhoneInput value={phone} onChange={(e164) => setPhone(e164)} defaultCountry="BR" />` |
| `phone-utils.ts` | Utilitários globais de parser, formatação e164 e validação internacional | `toE164(raw)`, `parseE164(str)`, `isValidPhoneNumber(num, code)`, `COUNTRY_LIST` |
| `surface-card` | Background de cartão com borda sutil e `color-mix` do tenant | `<div className="surface-card p-5">` |
| `btn-brand` | Botão principal da marca com gradiente e texto em `--brand-contrast-color` | `<Button className="btn-brand">` |
| `glass-panel` | Painel estilo Glassmorphism (`backdrop-blur-md`, borda sutil) | `<div className="glass-panel">` |

---

## 📖 4. Concrete Code Recipes

### Receita: Input de Telefone Internacional Padrão (`<PhoneInput />`)
```tsx
import React, { useState } from 'react';
import { PhoneInput, toE164, isValidPhoneNumber } from '@psi/ui';

export function WhatsappFieldExample() {
  const [whatsappNumber, setWhatsappNumber] = useState('+5511999999999');

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block">
        WhatsApp Profissional <span className="text-rose-500">*</span>
      </label>
      <PhoneInput
        value={whatsappNumber}
        onChange={(e164Value, details) => {
          setWhatsappNumber(e164Value); // Salva no padrão E.164 (+5511999999999)
          console.log('Validação por País:', details.isValid);
        }}
        defaultCountry="BR"
        error={!isValidPhoneNumber(whatsappNumber)}
      />
    </div>
  );
}
```

### Receita: Padrão de Componente Reutilizável em `@psi/ui`
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

### ❌ ERRADO: Input simples de texto para telefone sem DDI/máscara internacional
```tsx
// ❌ INSEGURO: Input básico que não suporta números internacionais nem valida E.164
<Input 
  value={whatsapp} 
  onChange={(e) => setWhatsapp(e.target.value)} 
  placeholder="(11) 99999-9999" 
/>
```

### ✅ CORRETO: Uso do componente padronizado `<PhoneInput />` com suporte a E.164
```tsx
// ✅ CORRETO: Seletor de país automático, máscara reativa por país e saída E.164
<PhoneInput 
  value={whatsapp} 
  onChange={(e164) => setWhatsapp(e164)} 
  defaultCountry="BR" 
/>
```
