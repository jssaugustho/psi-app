# 🧩 Catálogo de Elementos, Construtores & Templates de Páginas

> **Scope**: Especificação técnica detalhada de cada um dos 17 elementos atômicos do editor, construtores auxiliares, tratamento de destinos de ação CTA (Formulário, WhatsApp, URL) e estrutura do template inicial de página.

---

## 1. Scope & Triggers

Leia este arquivo quando trabalhar em:
- Adição de novos elementos atômicos ou novos atributos
- Construtores de componentes (`packages/canvas-renderer/src/utils/elementConstructors.ts`)
- Painéis de propriedades (`PropertiesPanel/ContentPropsPanel.tsx`)
- Configuração de ações de clique em botões e destinos de CTA (`destinationType`)
- Criação e manutenção de templates iniciais de páginas (`createDefaultPageTemplate`)

---

## 2. Inviolable Directives (ALWAYS / NEVER)

1. **ALWAYS instantiate components through helper constructors**:
   - Criar seções, divs ou componentes atômicos deve utilizar exclusivamente os construtores declarativos: `createDefaultSection()`, `createDefaultDiv()`, e `createDefaultComponent(type)`.
   - **NEVER** montar manualmente a estrutura JSON de um elemento inline em views ou componentes React.
2. **ALWAYS handle CTA Destinations declaratively**:
   - Botões (`button`), cards e formulários devem suportar a propriedade `destinationType` com 3 opções:
     - `'form'`: Scroll automático suave até a seção do formulário OU abertura de modal do formulário vinculado via `form_id`.
     - `'whatsapp'`: Abertura imediata do WhatsApp (`https://wa.me/55...`) contendo mensagem pré-configurada em `whatsappMessage`.
     - `'external_url'`: Redirecionamento direto para o link configurado em `url` (com opção `openInNewTab`).
3. **ALWAYS supply sensible default content and styling**:
   - Todo elemento recém-criado deve conter textos de espaço reservado (placeholders) realistas, margens padrão e cores neutras baseadas nas variáveis CSS do tema (`var(--brand-gradient-start)`, `var(--brand-contrast-color)`).

---

## 3. Construtores Padrão de Elementos (`elementConstructors.ts`)

```typescript
import { Section, DivComponent, AtomicComponent } from '../types';

export function createDefaultComponent(type: string, overrides: Partial<AtomicComponent> = {}): AtomicComponent {
  const id = `comp_${type}_${Math.random().toString(36).substring(2, 9)}`;
  const base: AtomicComponent = {
    id,
    type: type as any,
    style: {
      fontSize: '1rem',
      color: 'inherit',
      marginTop: '0px',
      marginBottom: '12px',
    },
    layout: {
      width: 'auto',
      height: 'auto',
    },
    props: {},
  };

  switch (type) {
    case 'heading':
      base.props = { text: 'Título Principal Impactante', level: 1 };
      base.style!.fontSize = '2.25rem';
      base.style!.fontWeight = '800';
      break;
    case 'paragraph':
      base.props = { text: 'Escreva um parágrafo claro e acolhedor explicando seus serviços de psicologia.' };
      base.style!.lineHeight = '1.6';
      break;
    case 'label':
      base.props = { text: 'ATENDIMENTO PRESENCIAL & ONLINE' };
      base.style!.fontSize = '0.75rem';
      base.style!.fontWeight = '700';
      base.style!.letterSpacing = '0.05em';
      base.style!.textTransform = 'uppercase';
      break;
    case 'button':
      base.props = {
        label: 'Agendar Consulta via WhatsApp',
        destinationType: 'whatsapp',
        whatsappNumber: '5511999998888',
        whatsappMessage: 'Olá Dra., gostaria de agendar uma consulta!',
      };
      base.style!.backgroundColor = 'var(--brand-gradient-start)';
      base.style!.color = 'var(--brand-contrast-color)';
      base.style!.borderRadius = '12px';
      base.style!.paddingTop = '14px';
      base.style!.paddingBottom = '14px';
      base.style!.paddingLeft = '24px';
      base.style!.paddingRight = '24px';
      break;
    // ...demais casos do catálogo
  }

  return { ...base, ...overrides };
}

export function createDefaultDiv(overrides: Partial<DivComponent> = {}): DivComponent {
  const id = `div_${Math.random().toString(36).substring(2, 9)}`;
  return {
    id,
    type: 'div',
    components: [],
    layout: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      gap: '16px',
      width: '100%',
    },
    ...overrides,
  };
}

export function createDefaultSection(type: string = 'custom', overrides: Partial<Section> = {}): Section {
  const id = `sec_${type}_${Math.random().toString(36).substring(2, 9)}`;
  return {
    id,
    type: type as any,
    components: [],
    layout: {
      paddingTop: '64px',
      paddingBottom: '64px',
      width: '100%',
    },
    background: {
      type: 'color',
      color: 'transparent',
    },
    ...overrides,
  };
}
```

---

## 4. Especificação Técnica dos 17 Elementos Atômicos

| # | Tipo (`type`) | Descrição e Recursos Visuais | Props Principais (`props`) | Suporta Gradiente em Texto? |
|---|---|---|---|:---:|
| 1 | **`heading`** | Títulos H1-H4 com suporte a destaque de palavras-chave. | `text`, `html`, `level` (1-4), `highlightWords`, `highlightColor` | ✅ SIM (`background-clip: text`) |
| 2 | **`paragraph`** | Parágrafo e texto explicativo com edição inline. | `text`, `html` | ✅ SIM (`background-clip: text`) |
| 3 | **`label`** | Subtítulos ou etiquetas em caixa alta / badge. | `text`, `html` | ✅ SIM (`background-clip: text`) |
| 4 | **`button`** | Botão CTA interativo com ícone esquerdo/direito. | `label`, `destinationType`, `form_id`, `whatsappNumber`, `url`, `iconLeft`, `iconRight` | ✅ SIM (Text clip sem cobrir o fundo do botão) |
| 5 | **`image`** | Imagem com alt text, borda, sombra e proporção. | `src`, `alt`, `aspectRatio`, `objectFit` | ❌ N/A (Elemento de mídia) |
| 6 | **`video`** | Player de vídeo (YouTube, Vimeo ou MP4). | `url`, `autoplay`, `loop`, `controls` | ❌ N/A (Elemento de mídia) |
| 7 | **`form`** | Formulário dinâmico integrado ao Form Builder. | `form_id`, `submitButtonLabel`, `successMessage` | ✅ SIM (No botão de envio) |
| 8 | **`map`** | Embed de mapa do Google Maps (Localização). | `address`, `zoomLevel`, `height` | ❌ N/A (Embed Iframe) |
| 9 | **`card`** | Card informativo com ícone, título, corpo e capa. | `title`, `body`, `imageUrl`, `titleColor`, `bodyColor`, `iconName` | ✅ SIM (Nos textos internos) |
| 10 | **`testimonial`** | Depoimento de paciente com avatar e avaliação. | `quote`, `authorName`, `authorTitle`, `rating`, `authorAvatar` | ✅ SIM (Nos textos internos) |
| 11 | **`stat_counter`** | Contador numérico animado (ex: +500 Pacientes). | `value`, `label`, `enableAnimation`, `duration`, `valueColor` | ✅ SIM (No número e descrição) |
| 12 | **`faq_item`** | Accordion retrátil de Pergunta & Resposta. | `question`, `answer`, `defaultOpen`, `questionColor`, `answerColor` | ✅ SIM (Na pergunta e resposta) |
| 13 | **`list`** | Lista de tópicos com ícones customizáveis. | `items`, `iconName`, `iconColor`, `textColor` | ✅ SIM (Nos itens de texto) |
| 14 | **`icon`** | Ícone vetorial isolado Lucide. | `name`, `size`, `strokeWidth`, `color` | ❌ NÃO (Exige cor sólida no SVG `stroke`) |
| 15 | **`divider`** | Linha divisora com estilo sólido, tracejado ou pontilhado. | `style`, `thickness`, `color` | ❌ NÃO (Borda plana exigida pelo CSS) |
| 16 | **`social_links`** | Bloco de ícones de redes sociais (Insta, Whats, LinkedIn). | `links` (`[{ network, url }]`), `iconSize`, `color` | ❌ NÃO (Exige cor sólida no SVG `fill`) |
| 17 | **`carousel`** | Carrossel de imagens ou cards deslizante. | `items`, `autoplay`, `intervalMs`, `arrowColor` | ❌ N/A (Contêiner) |

---

## 5. Estrutura do Template Inicial de Página

Ao finalizar o Wizard, a RPC `bootstrap_workspace` gera uma página inicial composta pelas seguintes seções encadeadas:

```text
[SECTION: Navbar Topo] (Cabeçalho com Logo, Links de Navegação e Botão CTA Agendar)
    └── [DIV Container]
         ├── [LOGO / NOME PROFISSIONAL]
         ├── [NAVBAR LINKS] (Sobre | Serviços | Depoimentos | FAQ)
         └── [BUTTON CTA] ("Agendar Consulta")

[SECTION: Hero] (Apresentação Principal)
    └── [DIV Coluna Esquerda]
         ├── [LABEL] ("ATENDIMENTO ONLINE & PRESENCIAL")
         ├── [HEADING H1] ("Cuide da sua saúde mental com atendimento especializado")
         ├── [PARAGRAPH] ("Psicoterapia com Dra. {{psychologist_name}} em {{city}}.")
         └── [BUTTON CTA] ("Falar no WhatsApp")
    └── [DIV Coluna Direita]
         └── [IMAGE] (Foto de Perfil do Profissional)

[SECTION: Sobre & Especialidades]
    └── [DIV Container]
         ├── [HEADING H2] ("Sobre Dra. {{psychologist_name}}")
         ├── [PARAGRAPH] ("{{bio}}")
         └── [LIST] (Especialidades e abordagens terapêuticas)

[SECTION: Depoimentos]
    └── [DIV Container 3 Colunas]
         ├── [TESTIMONIAL 1]
         ├── [TESTIMONIAL 2]
         └── [TESTIMONIAL 3]

[SECTION: Perguntas Frequentes (FAQ)]
    └── [DIV Container]
         ├── [FAQ_ITEM 1] ("Como funciona a primeira consulta?")
         ├── [FAQ_ITEM 2] ("Aceita plano de saúde / reembolso?")
         └── [FAQ_ITEM 3] ("Qual a duração e frequência das sessões?")

[SECTION: Rodapé]
    └── [DIV Container]
         ├── [PARAGRAPH] ("Dra. {{psychologist_name}} - {{crp}} | Todos os direitos reservados.")
         └── [SOCIAL_LINKS] (Instagram, WhatsApp, E-mail)
```

---

## 6. Anti-Patterns & Proibições

### ❌ Errado (Montar JSON Inline sem Helper)
```typescript
// NUNCA crie componentes com objetos literais soltos no código!
const myButton = {
  id: '123',
  type: 'button',
  style: { color: 'white' },
  props: { label: 'Clique Aqui' } // FALTAM campos de destino de CTA, mobile overrides e tipagens!
};
```

### ✅ Correto (Uso do Construtor Declarativo)
```typescript
// Use sempre o construtor oficial que garante a estrutura completa
const myButton = createDefaultComponent('button', {
  props: {
    label: 'Falar no WhatsApp',
    destinationType: 'whatsapp',
    whatsappNumber: '5511999998888',
  },
});
```
