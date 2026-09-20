# 🧱 Canvas Renderer Element Modules & Framework

Este diretório contém os módulos autocontidos de cada elemento do editor de páginas visual.

---

## 🛠️ Como Criar um Novo Elemento no Framework

Para adicionar um novo tipo de elemento ao editor:

1. **Crie a pasta do elemento**: `src/elements/<tipo_do_elemento>/`.
2. **Crie o contrato de propriedades**: `schema.ts` exportando `propControls: PropertyControlSpec[]`.
3. **Crie os valores padrão de fábrica**: `defaults.ts` com `defaultProps` e `defaultStyle`.
4. **Crie o arquivo de registro**: `index.ts` registrando a `ElementDefinition` em `ElementRegistry`.
5. **Crie a documentação do elemento**: `README.md` detalhando o uso e formato JSON.

---

## 📋 Catálogo de Elementos Registrados

- `heading` — Título Hierárquico H1-H4
- `paragraph` — Parágrafo de Texto
- `label` — Subtítulo / Etiqueta
- `button` — Botão CTA
- `icon` — Ícone Lucide
- `badge` — Selo / Badge
- `image` — Imagem / Foto (R2)
- `video` — Vídeo (YouTube / Vimeo)
- `avatar` — Foto de Perfil
- `list` — Lista de Tópicos
- `card` — Card de Conteúdo
- `faq_item` — Pergunta Frequente
- `testimonial` — Depoimento
- `stat_counter` — Contador de Métricas
- `divider` — Linha Divisória
- `spacer` — Espaçador
- `logo` — Marca / Logotipo
- `navbar_links` — Links de Navegação
- `social_links` — Redes Sociais
