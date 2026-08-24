# Regras de Identidade Visual, Cores da Marca, Overrides & Prevenção de Vazamento Multi-Tenant

Para preservar a coerência visual e garantir o isolamento estrito da identidade visual de cada psicóloga no **Psi App**, todas as interfaces e agentes de IA devem seguir rigorosamente as diretrizes abaixo.

---

## 🏛️ 1. Arquitetura de Cores em 4 Níveis

A resolução de cores na plataforma e nos ativos de captação é dividida em 4 níveis claros de escopo:

1. **Nível 1: Plataforma SaaS (App / Dashboard / Admin)**
   - **Regra:** Toda a interface do software SaaS (menus, navegação do painel, botões administrativos) segue **estritamente** a identidade visual registrada em **`platform_settings`** (`PlatformBrand`).
   - **Objetivo:** Manter a consistência de marca do software da empresa para todos os usuários logados.

2. **Nível 2: Tenant (Psicólogo/a / Conta do Cliente)**
   - **Isolamento Estrito de Marca por Tenant**:
     - Em um **tenant comum**, o sistema **JAMAIS** deve misturar cores do tenant com outros tenants.
     - A marca global em `platform_settings` dita a identidade visual da **Plataforma / Dashboard**, mas **NUNCA** interfere nas cores dos sites criados pelos psicólogos.
     - Se o tenant logado possui marca/logotipo cadastrados (`hasTenantBrandConfigured = true`), o site herda essas configurações do próprio tenant por padrão.
     - Se o tenant logado **não** possui marca/logotipo cadastrados (`hasTenantBrandConfigured = false`), o Wizard abre o modo de personalização para criar novas cores/logotipos exclusivos para o site.
   - **Regra:** Cada tenant define suas cores oficiais de marca no onboarding ou nas configurações da conta (`tenant.gradientColorStart`, `tenant.gradientColorEnd`, `tenant.contrastColor`).
   - **Função:** Serve como a **fonte padrão de herança** para todos os sites e formulários criados por esse tenant.

3. **Nível 3: Sites (Capture Pages / Landing Pages)**
   - **Regra:** Por padrão, um novo site **herda automaticamente** as cores do seu Tenant proprietário.
   - **Overrides:** O editor/wizard permite definir **overrides visuais editáveis** (`siteConfig.theme.colors`). Se houver override ativado, o site renderiza com esse override; caso contrário, herda dinamicamente da marca do Tenant dono.

4. **Nível 4: Formulários (Screening Forms / Diagnósticos)**
   - **Regra:** Por padrão, um formulário **herda automaticamente** as cores do Tenant proprietário (ou do site no qual foi embutido).
   - **Overrides:** O construtor de formulários permite definir **overrides visuais editáveis** (`themeConfig`).
   - **Resolução de Renderização Pública:**
     - **Formulário Standalone (Link Direto `/f/[slug]`):** `Override do Formulário` ➔ `Cores do Tenant Dono` ➔ `Fallback Neutro Slate`.
     - **Formulário Incorporado (Embed no Site):** `Override do Formulário` ➔ `Override do Site` ➔ `Cores do Tenant Dono` ➔ `Fallback Neutro Slate`.

---

## 🧙‍♂️ 2. Regras de UX do Wizard de Criação (Etapa 2: Identidade Visual)

No Wizard de Criação de Páginas (`/dashboard/captacao/nova`), a interface deve apresentar a escolha clara ao usuário:

1. **Quando o Tenant POSSUI Marca Cadastrada (`hasTenantBrandConfigured = true`)**:
   - Exibe a escolha por radio buttons/cards:
     - 🔘 **"Herdar Identidade Visual da Minha Conta"** *(Recomendado & Selecionado por Padrão)*: Aplica as cores e logotipo da conta. O site é salvo com `isOverride = false`, garantindo sincronização automática com alterações futuras no perfil.
     - 🔘 **"Personalizar Identidade Visual para este Site"**: Expande as paletas e seletores hexadecimais, salvando o site com `isOverride = true`.

2. **Quando o Tenant NÃO POSSUI Marca Cadastrada (`hasTenantBrandConfigured = false`)**:
   - O sistema detecta que o psicólogo ainda não configurou uma marca no perfil.
   - A opção "Herdar da Minha Conta" é desativada com a mensagem: *"Sua conta ainda não possui uma identidade visual padrão cadastrada no perfil."*
   - O Wizard seleciona automaticamente **"Personalizar Identidade Visual para este Site"** e incentiva o usuário a criar as cores.
   - Ao finalizar, o sistema oferece a opção de salvar essas cores também como a **marca padrão da conta**, adiantando o onboarding do cliente.

---

## 🤖 3. Regra Estrita para Agentes de IA (Diretriz Antialucinação)

> [!IMPORTANT]
> **DIRETRIZ OBRIGATÓRIA PARA IAs E DESENVOLVEDORES:**
> 1. **NUNCA altere o tema do Dashboard/Plataforma** com base no tenant secundário logado. O Dashboard SEMPRE consome as cores de `platform_settings` (`PlatformBrand`).
> 2. **NUNCA aplique hex estáticos hardcoded antigos (ex: `#CC8667`, `#4F46E5`)** como fallback inicial. O fallback inicial deve ser SEMPRE a marca do Tenant dono (`tenant`), seguida pela escala de cinza neutra (`#27272A` / `#52525B`).
> 3. **Sites e Formulários herdam por padrão** a identidade visual do Tenant proprietário, mas preservam **overrides editáveis salvos em rascunhos e no banco de dados**.
> 4. Se a psicóloga atualizar as cores da conta, todos os sites e formulários sem override devem acompanhar essa mudança automaticamente.

---

## 🎨 4. Fluxo de Fallback da Identidade Visual da Plataforma no Front-End

A resolução técnica da marca da plataforma SaaS (App Shell, Dashboard e Admin) segue a ordem estrita de 3 etapas:

```
1. Marca Global em platform_settings (API /v1/platform/tenant/primary)
   └─► (Se não encontrar ou estiver offline)
2. Cache Local salvo no localStorage (theraos_admin_platform_brand_cache)
   └─► (Se não encontrar no cache)
3. Cores Neutras em Tons de Cinza (#52525B para início, #27272A para fim, #FFFFFF para contraste)
```

---

## 🖼️ 5. Regras de Extração de Cores de Logotipo e Ícone (Favicon)

Quando o usuário faz upload de um logotipo ou ícone de site, o sistema executa a extração automática de cores respeitando estas diretrizes:

### 5.1 Imunidade Total a CORS (Conversão Base64 Data URL)
- NUNCA desenhe uma URL HTTP/S3 remota diretamente no Canvas sem antes convertê-la em **Base64 Data URL** via `FileReader.readAsDataURL(blob)` ou via proxy do mesmo domínio.
- Imagens em Base64 Data URI são 100% imunes a bloqueios de segurança de CORS (`SecurityError`) no método `ctx.getImageData()`.

### 5.2 Isolamento de Erros
- Chamadas ao método `ctx.getImageData()` devem ser contidas em um bloco `try/catch` individual para que falhas de leitura sejam tratadas de forma limpa.

### 5.3 Proibição de Cores Falsas/Mockadas (Zero Fake Swatches)
- O popover overlay **CORES DO LOGOTIPO** deve exibir **exclusivamente as cores reais extraídas** da marca enviada pelo usuário.
- É **estritamente proibido** exibir arrays de cores fallback hardcoded fictícias.

---

## 🎨 6. Utilitários CSS e Variáveis de Marca

Utilize sempre as variáveis reativas da marca em vez de cores arbitrárias do Tailwind:

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

## 🚫 7. O Que NUNCA Fazer

❌ **NUNCA defina cores fallback padrão como azul ou indigo no CSS global.**
✅ **CORRETO:** Usar a escala de cinza/preto neutra (`#27272A` / `#52525B`).

❌ **NUNCA sobrescreva a cor do Dashboard com o tenant do psicólogo.**
✅ **CORRETO:** O Dashboard é a Plataforma SaaS e usa as cores de `platform_settings`.

❌ **NUNCA ignore o override de um site ou formulário se ele foi definido pelo usuário.**
✅ **CORRETO:** Resolver na cascata `Override -> Tenant Dono -> Slate Neutro`.
