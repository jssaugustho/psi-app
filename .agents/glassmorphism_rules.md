# 🎨 Padrão de Glassmorphism (Tabelas, Cards e Modais)

Este documento estabelece as diretrizes obrigatórias para a aplicação do estilo de **Glassmorphism** na interface administrativa e demais páginas da plataforma. O uso correto deste padrão garante consistência visual, sofisticação e legibilidade em ambos os temas (claro e escuro).

---

## 🛠️ 1. Classes Globais de Glassmorphism

Toda a estilização de glassmorphism é gerenciada por classes globais otimizadas com aceleração por hardware (GPU) e suporte a fallback de acessibilidade no tema claro. As classes disponíveis são:

*   **`glass-sm`**: Indicado para pequenos elementos de controle interativos, barras de pesquisa compactas, inputs, botões secundários e seletores de abas.
*   **`glass-md`**: Indicado para cards de dashboard, contêineres de filtros, tabelas e seções internas de páginas.
*   **`glass-lg`**: Indicado para modais flutuantes, popovers amplos e sobreposições de alta prioridade.

### Definições CSS (`globals.css`):
```css
.glass-sm {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(4px);
  border: 1px solid var(--surface-border);
}
.glass-md {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(8px);
  border: 1px solid var(--surface-border);
}
.glass-lg {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(16px);
  border: 1px solid var(--surface-border);
}
```

---

## 🚫 2. Proibição de Sobrescrita com Fundo Sólido

Um erro comum é atribuir a classe `glass-md` ou `glass-lg` e, ao mesmo tempo, sobrescrever a propriedade `background` com cores sólidas (como `var(--brand-card-bg-color)`) ou bordas manuais redundantes no atributo `style` ou via Tailwind.

### ❌ Exemplo Incorreto (Quebra o Efeito Glass):
```tsx
// O background sólido anula o efeito translúcido e blur do glassmorphism!
<div
  className="glass-md p-5 rounded-2xl"
  style={{
    background: 'var(--brand-card-bg-color)', // PROIBIDO
    border: '1px solid var(--surface-border)', // Redundante
  }}
>
```

### ✅ Exemplo Correto:
```tsx
// Deixe a classe gerenciar a transparência e a borda. Use style apenas para propriedades não cobertas.
<div className="glass-md p-5 rounded-2xl">
```

---

## 🌓 3. Comportamento no Tema Claro (`light mode`)

A legibilidade é prioridade máxima. No tema claro, as classes globais aumentam a opacidade de fundo para garantir o contraste adequado do texto:
- `html.light .glass-sm`: `background: rgba(255, 255, 255, 0.70);`
- `html.light .glass-md`: `background: rgba(255, 255, 255, 0.80);`
- `html.light .glass-md`: `background: rgba(255, 255, 255, 0.80);`
- `html.light .glass-lg`: `background: rgba(255, 255, 255, 0.85);`

Nunca fixe fundos escuros transparentes inline que prejudiquem a leitura de textos pretos no tema claro.

---

## 📋 4. Checklist de Aplicação

Antes de publicar qualquer alteração em telas que utilizem tabelas ou cards:
1. [ ] Remova qualquer estilo inline com `background: 'var(--brand-card-bg-color)'` ou similar se o elemento deve ser translúcido.
2. [ ] Utilize `glass-md` para contêineres de tabela ou cards de informação.
3. [ ] Utilize `glass-lg` para modais, garantindo que o backdrop-filter do container de fundo aplique blur leve para destacar a janela.
4. [ ] Evite usar `var(--surface-glass)` que não esteja definido globalmente; use sempre as classes utilitárias `glass-sm`, `glass-md` ou `glass-lg`.
