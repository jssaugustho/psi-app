# 📝 Elemento: Heading (Título)

> **Escopo**: Renderização e edição visual de títulos hierárquicos (H1 a H4) com suporte a edição de texto inline diretamente no canvas.

---

## 1. Características do Elemento
- **Edição Inline**: Sim (`contentEditable={isSelected}`).
- **Suporte a Tipografia Global**: Sim.
- **Suporte a Cores e Hover**: Sim.
- **Hierarquia**: Suporta níveis H1, H2, H3 e H4.

---

## 2. Propriedades Personalizadas (`element.props`)
| Propriedade | Tipo | Padrão | Descrição |
|---|---|---|---|
| `text` | `string` | `'Título da Seção'` | Conteúdo textual do título. |
| `level` | `number` | `2` | Nível do cabeçalho HTML (1 a 4). |

---

## 3. Exemplo de JSON de Canvas
```json
{
  "id": "comp-hdg-123",
  "type": "heading",
  "props": {
    "text": "Transforme sua Saúde Mental",
    "level": 1
  },
  "style": {
    "textAlign": "center",
    "fontSize": "36px",
    "fontWeight": "700"
  }
}
```
