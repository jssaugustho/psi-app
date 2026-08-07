# Brand Colors & White-Label Theme Synchronization Rules

To preserve visual coherence and support the dynamic White-Label brand styling of tenants, all visual interfaces (both `admin` and `web` apps) must follow the rules below.

---

## 🎨 1. Theme Color References
Never hardcode Tailwind accent colors (such as `bg-indigo-600`, `text-indigo-400`, `focus:border-indigo-500`, etc.) for elements representing branding visual styles. Instead, bind them directly to the tenant's brand variables:

- **Primary Colors / Brand Gradient**:
  - Use `var(--brand-gradient-start)` for primary accent colors.
  - Use `var(--brand-gradient)` for gradients (e.g. `bg-gradient-to-r` or custom background gradients).
- **Text & Contrast**:
  - Use `var(--brand-text-color)` for default text.
  - Use `var(--brand-contrast-color)` for text rendering over high-contrast brand background gradients.
- **Inputs & Outlines**:
  - Use the CSS class `.brand-input` for standard form fields, textareas, and select components.
  - Focus outlines should follow `var(--brand-gradient-start)` or `.brand-input:focus`.

---

## 🚫 2. Tailwind & Hardcoded Colors Enforcement
- Do NOT use classes like `text-indigo-500` or `border-indigo-600` for brand elements.
- Semantic state colors (e.g., `emerald` for operational/success, `red` for error/danger, `amber` for degraded/warning) are exempt from this rule and should remain standardized.

---

## 🔧 3. Implementation Example

### Bad (Hardcoded Indigo):
```tsx
<div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
  Admin
</div>
```

### Good (Brand Synced):
```tsx
<div 
  className="border"
  style={{
    background: 'color-mix(in srgb, var(--brand-gradient-start) 10%, transparent)',
    borderColor: 'color-mix(in srgb, var(--brand-gradient-start) 20%, transparent)',
    color: 'var(--brand-gradient-start)',
  }}
>
  Admin
</div>
```
