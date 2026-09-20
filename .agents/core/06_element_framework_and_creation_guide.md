# 📐 Architecture Spec & Developer Guide: Element Framework & Component Creation

> **Scope**: Standardized creation of page editor elements, property control mapping, core/optional/custom property classification, inline canvas editing, and documentation requirements.

---

## 1. Scope & Triggers

Read this document when:
- Creating a new page editor visual component / element.
- Modifying property controls (`propControls`) or defaults of an existing element.
- Adding new property types or controls to `DynamicPropertyRenderer`.
- Registering new elements in `ElementRegistry`.

---

## 2. Inviolable Directives (ALWAYS / NEVER)

1. **ALWAYS create elements inside `src/elements/<element_type>/`**:
   - Every element must have its own isolated folder with `schema.ts`, `defaults.ts`, `index.ts` and `README.md`.
2. **NEVER write hardcoded `if (type === 'novo_elemento')` blocks in `ContentPropsPanel` or `AtomicComponentWrapper`**:
   - Register property controls declaratively using `propControls` in `schema.ts`.
3. **ALWAYS include a `README.md` for every newly created element**:
   - Detail the element's scope, custom props schema, features, and an example of the generated JSON.
4. **ALWAYS use `<InlineEditableText />` for text-bearing elements**:
   - Text elements (`heading`, `paragraph`, `label`, `button`, `badge`, `card`, `faq_item`, `testimonial`, `stat_counter`) MUST support `contentEditable={isSelected}` on the visual canvas.
5. **NEVER introduce container `sticky` logic**:
   - Containers (`div`) follow standard Flexbox/Grid flow. Sticky is reserved exclusively for global header navbars (`navbar.sticky`).

---

## 3. Element Creation Recipe (5 Steps)

### Step 1: Create the Element Folder
```text
frontend/packages/canvas-renderer/src/elements/<element_type>/
├── schema.ts
├── defaults.ts
├── index.ts
└── README.md
```

### Step 2: Define the Property Schema (`schema.ts`)
```typescript
import { PropertyControlSpec } from '../../elementRegistry';

export const customPropControls: PropertyControlSpec[] = [
  {
    name: 'text',
    label: 'Texto do Componente',
    type: 'text',
    defaultValue: 'Exemplo',
    category: 'content',
  },
];
```

### Step 3: Define Factory Defaults (`defaults.ts`)
```typescript
export const customDefaults = {
  defaultProps: {
    text: 'Texto Inicial',
  },
  defaultStyle: {
    marginTop: '0px',
    marginBottom: '12px',
  },
};
```

### Step 4: Register in `index.ts`
```typescript
import { ElementRegistry, ElementDefinition } from '../../elementRegistry';
import { customPropControls } from './schema';
import { customDefaults } from './defaults';
import { MyIcon } from 'lucide-react';

export const customElementDefinition: ElementDefinition = {
  type: 'meu_elemento',
  label: 'Meu Elemento',
  description: 'Descrição do novo elemento',
  icon: MyIcon,
  category: 'interactive',
  features: {
    inlineTextEditable: true,
    supportsTypography: true,
    supportsBackground: true,
    supportsBorder: true,
    supportsHover: true,
    supportsAction: false,
  },
  propControls: customPropControls,
  defaultProps: customDefaults.defaultProps,
  defaultStyle: customDefaults.defaultStyle,
  component: () => null,
};

ElementRegistry.register(customElementDefinition);
```

### Step 5: Document in `README.md`
Provide scope, custom props table, and JSON example.

---

## 4. Property Controls Catalog

| Type | Description |
|---|---|
| `text` | Single-line text input |
| `textarea` | Multi-line text or HTML input |
| `slider` | Numeric slider with direct value input |
| `select` | Dropdown option picker |
| `color` | Global brand color picker + hex |
| `icon` | Lucide icon search selector |
| `image` | R2 upload & URL input |
| `list_editor` | Drag-and-drop item list editor |
| `action` | CTA Destination selector |
| `boolean` | Switch toggle button |
