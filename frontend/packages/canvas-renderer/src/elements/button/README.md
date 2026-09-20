# 🚀 Elemento: Button (Botão CTA)

> **Escopo**: Renderização e interação de botões de chamada para ação (CTA) com destinos dinâmicos (Formulário, WhatsApp, URL).

---

## 1. Características do Elemento
- **Edição Inline**: Sim (`contentEditable={isSelected}` no texto da label).
- **Suporte a Ações**: Sim (`action: 'cta_primary'`, `whatsapp`, `external_url`).
- **Suporte a Hover**: Sim (sobrescritas de cor, fundo e escala).
- **Suporte a Bordas**: Sim.

---

## 2. Propriedades Personalizadas (`element.props`)
| Propriedade | Tipo | Padrão | Descrição |
|---|---|---|---|
| `label` | `string` | `'Agendar Consulta'` | Rótulo do botão. |
| `action` | `string` | `'cta_primary'` | Tipo de destino de clique. |
| `variant` | `string` | `'primary'` | Variante de apresentação visual. |
| `icon` | `string` | `''` | Nome do ícone Lucide opcional. |
| `iconPosition` | `string` | `'left'` | Posição do ícone (`left` ou `right`). |
