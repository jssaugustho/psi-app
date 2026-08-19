# Regras de Identidade Visual, Cores da Marca & Prevenção de Vazamento Multi-Tenant

Para preservar a coerência visual e garantir o isolamento estrito da identidade visual de cada psicóloga no **Psi App**, todas as interfaces devem seguir rigorosamente as diretrizes abaixo.

---

## 🎨 1. Hierarquia Obrigatória de Fallback de Marca (Zero Vazamento de Cores)

Para evitar que cores de outro tenant ou um tom azul genérico antigo vazem para a interface da psicóloga, o sistema deve respeitar **estritamente a seguinte ordem de resolução**:

1. **API do Backend (`tenant` / `primaryTenant` via `AuthContext` / `BrandContext`):** Fonte primária e mandatória.
2. **Cache Local (`localStorage`):** Utilizado para preservar rascunhos em andamento específicos do tenant ativo.
3. **Escala de Cinza Neutra / Preto (`#27272A` / `#52525B`):** Fallback técnico seguro em `globals.css`. **NUNCA utiliza azul ou cores vibrantes genéricas**.

```
[ API Backend ] ──(Se ausente)──► [ localStorage Tenant ] ──(Se ausente)──► [ Escala de Cinza Neutra #27272A ]
```

---

## 🖼️ 2. Regras de Extração de Cores de Logotipo e Ícone (Favicon)

Quando o usuário faz upload de um logotipo ou ícone de site, o sistema executa a extração automática de cores respeitando estas diretrizes:

### 2.1 Imunidade Total a CORS (Conversão Base64 Data URL)
- NUNCA desenhe uma URL HTTP/S3 remota diretamente no Canvas sem antes convertê-la em **Base64 Data URL** via `FileReader.readAsDataURL(blob)`.
- Imagens em Base64 Data URI são 100% imunes a bloqueios de segurança de CORS (`SecurityError`) no método `ctx.getImageData()`.

### 2.2 Isolamento de Erros
- Chamadas ao método `ctx.getImageData()` devem ser contidas em um bloco `try/catch` individual para que falhas de leitura sejam tratadas de forma limpa, sem estourar erros no console do navegador ou no React Dev Overlay.

### 2.3 Proibição de Cores Falsas/Mockadas (Zero Fake Swatches)
- O popover overlay **CORES DO LOGOTIPO** deve exibir **exclusivamente as cores reais extraídas** da marca enviada pelo usuário.
- É **estritamente proibido** exibir arrays de cores fallback hardcoded (ex: `['#CC8667', ...]`).
- Se nenhuma cor tiver sido extraída ainda, exibe o estado de carregamento `"Lendo cores da imagem..."` com indicador visual.

---

## 🎨 3. Referências de Cores e Utilitários CSS

Nunca utilize cores arbitrárias do Tailwind (como `bg-indigo-600` ou `text-indigo-400`) para elementos que representam a identidade visual da psicóloga. Utilize sempre as variáveis reativas da marca:

- **Cores Primárias / Gradiente da Marca:**
  - `var(--brand-gradient-start)` para cores de acento.
  - `var(--brand-gradient-end)` para final do gradiente.
  - `var(--brand-gradient)` para backgrounds com gradiente.
  - `.brand-accent` para botões com gradiente e contraste adaptativo.
  - `.brand-accent-text` para textos com efeito de gradiente.
- **Texto & Contraste:**
  - `var(--brand-text-color)` para leitura padrão.
  - `var(--brand-contrast-color)` para textos sobre gradientes.
- **Inputs & Outlines:**
  - `.brand-input` para campos de formulários.
  - `:focus` deve utilizar `var(--brand-gradient-start)`.

---

## 🚫 4. O Que NUNCA Fazer

❌ **NUNCA defina cores fallback padrão como azul ou indigo no CSS global.**
✅ **CORRETO:** Usar a escala de cinza/preto neutra (`#27272A` / `#52525B`).

❌ **NUNCA exiba cores fictícias no popover de cores do logotipo.**
✅ **CORRETO:** Exibir apenas cores genuinamente extraídas da imagem enviada pelo usuário.
