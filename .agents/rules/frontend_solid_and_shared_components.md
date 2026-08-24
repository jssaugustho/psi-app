# Regras Arquiteturais SOLID, Compartilhamento de Componentes & Uso do Back-End

Este documento estabelece as diretrizes obrigatórias de arquitetura, princípios **SOLID**, reutilização de componentes entre as 3 aplicações Front-End (`apps/web`, `apps/admin`, `apps/sites`) e o padrão de integração com o Back-End (Fastify API, PostgREST & `HttpOnly` Cookies).

---

## 🏛️ 1. Princípios SOLID no Front-End

Todas as alterações no Front-End devem seguir rigorosamente os princípios **SOLID**:

### 1.1 Single Responsibility Principle (SRP)
- **Um arquivo, uma responsabilidade**: Componentes React de página (ex: `page.tsx`) devem conter apenas a rota e o contêiner mestre (`PageEditorWorkspace`), sem declarar 5.000 linhas de modais, formulários, estilos inline e lógica de requisição HTTP no mesmo arquivo.
- **Decomposição do Criador de Páginas**:
  - `usePageEditor`: Hook que gerencia o estado, rascunhos em `draftData: jsonb` e persistência.
  - `PageEditorHeader`: Barra de topo, alternador de dispositivo (Desktop/Mobile) e botões de ação.
  - `PageEditorSidebar`: Controles de seções, SEO e temas.
  - `PageEditorCanvas`: Visualização em tempo real das seções.

### 1.2 Open/Closed Principle (OCP)
- Componentes e renderizadores de blocos (ex: seções da landing page, passos do formulário) devem ser **abertos para extensão, mas fechados para modificação**.
- O registro de novos tipos de seções deve ser feito via mapas ou registries (`sectionRegistry`), sem a necessidade de modificar estruturas `switch/case` monolíticas em arquivos legados.

### 1.3 Liskov Substitution Principle (LSP)
- Os tipos `Workspace`, `VisualIdentity` e `WorkspaceDomain` declarados no cliente API devem ser mantidos consistentes em todo o ecossistema.
- Subtipos e formulários devem ser intercambiáveis sem quebras ou asserções forçadas do tipo `as any`.

### 1.4 Interface Segregation Principle (ISP)
- Componentes reutilizáveis não devem depender de interfaces gigantes que não utilizam.
- Passe apenas as props estritamente necessárias. Exemplo: um distintivo de marca deve receber `VisualIdentityProps` ou `primaryColor` e `logoUrl`, em vez de forçar o envio do objeto `Workspace` completo com 40 campos.

### 1.5 Dependency Inversion Principle (DIP)
- Componentes de interface de alto nível devem depender de **abstrações** (`useBrand()`, `useWorkspaceBrand()`, `getWorkspaceVisualIdentity()`), e nunca de requisições `fetch` diretas ou mutações locais desordenadas.

---

## 📦 2. Estratégia de Compartilhamento de Componentes

O projeto adota uma arquitetura Monorepo gerenciada por pnpm/turborepo:

```text
frontend/
├── packages/
│   ├── ui/                    # Componentes visuais atômicos compartilhados (@psi/ui)
│   └── image-utils/           # Utilitários de compressão e validação de imagens (@psi/image-utils)
└── apps/
    ├── web/                   # App Dashboard Principal do Psicólogo (Porta 3000)
    ├── admin/                 # App de Gestão do Backoffice SaaS (Porta 3001)
    └── sites/                 # Renderizador de Landing Pages & Formulários (Porta 3002)
```

### Regras de Compartilhamento:
1. **Componentes Atômicos em `@psi/ui`**:
   - `Button`, `Input`, `Textarea`, `Card`, `Select`, `BrandModal`, `ConfirmModal`, `LoadingSpinner`, `AppShell`.
   - NENHUM componente dentro de `@psi/ui` pode conter chamadas diretas de API ou estado global do app. Eles devem ser totalmente puros/apresentacionais.
2. **Utilitários de Mídia em `@psi/image-utils`**:
   - Compressão no browser, validação de canal alpha (transparência) e cálculo de luminância.
3. **Módulos Específicos por App**:
   - O criador de páginas em `apps/web/src/components/landing-builder` e o formulário `workspace-settings-form.tsx` residem dentro de `apps/web`.

---

## ⚡ 3. Como Utilizar o Back-End A Partir de Agora

### 3.1 Autenticação via Cookies `HttpOnly`
- Os tokens JWT **não devem ser mantidos ou expostos em `localStorage`**.
- O login e refresh gravam a sessão no cookie seguro `access_token` (`HttpOnly`, `SameSite=Lax`, `Secure`).
- Todas as chamadas `fetchApi` nos apps Front-End devem utilizar o parâmetro **`credentials: 'include'`**.

### 3.2 PostgREST CRUD vs PostgREST RPC vs Fastify Core API
- **PostgREST CRUD (`/rest/v1/<tabela>`)**: Utilizado para consultas diretas e operações CRUD simples de 1 tabela respeitando as políticas RLS.
- **PostgREST RPC (`/rest/v1/rpc/<funcao>`)**: Utilizado para relatórios/agregações pesadas e transações atômicas multitabelas direto no banco PostgreSQL.
- **Fastify Core API (`/v1/*`)**: Utilizado para integrações externas (Cloudflare R2, DNS, Resend, Webhook CRM) e gestão de cookies `HttpOnly`.

### 3.3 Utilitário de Identidade Visual (`visual-identity.ts`)
- Sempre que um componente precisar resolver cores, logo, favicon ou fontes do workspace, utilize o helper puro:
```ts
import { getWorkspaceVisualIdentity } from '@/lib/visual-identity';

const visualIdentity = getWorkspaceVisualIdentity(workspace);
// Retorna: { logoUrl, faviconUrl, primaryColor, secondaryColor, contrastColor, fontHeading, fontBody }
```
- NUNCA crie correntes manuais de fallback com `||` nos componentes visuais.
