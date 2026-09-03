# 🤖 System Prompt Context & AI Protocol — PSI-APP

> **CRITICAL INSTRUCTION FOR ALL AI AGENTS**: Read this file BEFORE making any code changes in this repository. Obey all `ALWAYS` and `NEVER` constraints strictly. This document is the primary context prompt for LLMs working on this repository, defining system boundaries, SOLID principles, code recipes, database migrations, and deploy commands.

---

## ⚡ 1. Top 10 Inviolable Directives (Regras de Ouro)

1. **NEVER insert logs directly to DB inside HTTP handlers or workers**:
   - ALWAYS use the unified `log(payload)` function from `src/shared/queue.ts` (providing an explicit `name`, contextual natural-language `message`, `clientApp`, `userRole`, `stack` for errors, and metadata tracing `requestId`, `userId`, `sessionId`, `workerName`).
   - DB writes for logging are executed asynchronously by RabbitMQ background workers into the unified `public.logs` table (`system.logs` queue).
2. **NEVER create mirror Fastify routes for simple CRUD**:
   - ALWAYS use PostgREST (`/rest/v1/<table_name>`) + Row Level Security (RLS) for single-table reads/writes.
3. **ALWAYS restrict Fastify Core API (`/v1/*`) to**:
   - External integrations (Cloudflare R2, DNS, Resend API).
   - Binary/Buffer file uploads and image processing.
   - HttpOnly authentication cookies (`/v1/auth/*`).
   - Partner Webhooks (`/v1/crm/webhook`).
4. **NEVER hardcode colors or duplicate UI components**:
   - ALWAYS use CSS variables (`var(--brand-gradient-start)`, `var(--brand-contrast-color)`, `var(--mix-base)`).
   - Shared UI components belong exclusively in `@psi/ui` (`frontend/packages/ui`).
5. **ALWAYS keep `page.tsx` files concise (< 50 lines)**:
   - Delegate business logic to custom hooks (e.g. `usePageEditor`) and presentation to atomic components in `@psi/ui`.
6. **ALWAYS enforce Row Level Security (RLS) on all PostgreSQL tables**:
   - Every public schema table must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
   - Multi-tenant data must be isolated by `workspace_id` linked to the JWT claim `sub` / user profile.
7. **ALWAYS use atomic procedures (RPC) for multi-table transactions**:
   - Use PL/pgSQL Stored Functions exposed via PostgREST RPC (`POST /rest/v1/rpc/<func_name>`).
   - For elevated permissions without exposing service keys, use `SECURITY DEFINER` procedures.
8. **NEVER expose Service Keys to the Frontend**:
   - Perform administrative or elevated operations via Fastify backend routes or `SECURITY DEFINER` RPC functions.
9. **ALWAYS propagate `requestId`, `userId` and `sessionId` for End-to-End Tracing**:
   - Fastify injects a syntactic UUID `X-Request-ID` into every HTTP response (`request.raw.requestId`).
   - Repasse `requestId`, `userId` e `sessionId` em todas as mensagens publicadas no RabbitMQ para observabilidade total no worker.
10. **NEVER bypass the database migration CLI (`db:migrate` & `db:version`)**:
    - **VINCULAÇÃO À VERSÃO ATIVA**: Qualquer nova migração pertence à **versão ativa atual** (ex: `v1.0.1`) e é gravada com essa versão na tabela `public.schema_migrations`.
    - **RAIZ DE ./DRIZZLE**: Migrações em desenvolvimento ficam na raiz da pasta `./drizzle/`.
    - **ARQUIVAMENTO NO RELEASE**: Arquivos `.sql` só são movidos para subpastas de histórico (`./drizzle/migrations/vX.X.X/`) via `npm run db:version`.
    - ALWAYS verify TypeScript types (`npx tsc --noEmit`) before concluding your work.
11. **ALWAYS document new features or edits in `.agents/` and map them in `AGENTS.md`**:
    - Sempre que desenvolver ou alterar uma funcionalidade, adicione ou atualize a documentação em `.agents/architectures/<feature_name>.md` ou `.agents/core/`.
    - Mapeie a documentação na tabela **Context Loading Matrix** em `AGENTS.md`.
    - Siga estritamente a **Anatomia Oficial em 5 Seções** (Scope, Directives, Architecture, Recipes & Schemas e Anti-Patterns).

---

## 🗺️ 2. Context Loading Matrix (Gatilhos de Leitura sob Demanda)

Before executing tasks, read **ONLY** the specific context file relevant to your domain to minimize token waste and ensure strict compliance:

| Target Task / Domain | Context File to Read First | Key Topics Covered |
|---|---|---|
| Routing decisions, stack choices, Fastify vs PostgREST | [.agents/core/01_stack_and_decision_tree.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/core/01_stack_and_decision_tree.md) | Flowchart, Fastify vs PostgREST vs RPC, Rate Limits, Docker deploy |
| Database schema changes, RLS, Auth, JWT, RPCs | [.agents/core/02_db_rls_and_security.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/core/02_db_rls_and_security.md) | Drizzle CLI (`db:migrate`), RLS policies, GoTrue Auth, Security Definer RPCs |
| Async processing, RabbitMQ, Unified Logs, WebSockets | [.agents/core/03_async_logging_and_events.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/core/03_async_logging_and_events.md) | Quorum Queues, TS Workers, `requestId`/`sessionId` tracing, Socket.io broadcast |
| UI, Tailwind, CSS Vars, White-Label, Modals | [.agents/core/04_ui_and_design_system.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/core/04_ui_and_design_system.md) | CSS variables, `color-mix()`, `@psi/ui` components, Glassmorphism, Modals |
| Email notifications & transaction queues | [.agents/core/05_email_and_communications.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/core/05_email_and_communications.md) | Resend API, Queue Email consumer, React Email templates |
| Site Editor / Visual Builder | [.agents/architectures/site_editor.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/architectures/site_editor.md) | Canvas, Blocks, Section state, Hook patterns |
| Site Creation Wizard & Workspace Defaults | [.agents/architectures/site_wizard_and_defaults.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/architectures/site_wizard_and_defaults.md) | Wizard flow, RPC bootstrapping, default columns & visual identity |
| Staging, Drafts & Publishing | [.agents/architectures/site_staging_and_publishing.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/architectures/site_staging_and_publishing.md) | Draft state vs Published state, Cloudflare subdomains |
| Captacao Funnel & Psychologist CRM | [.agents/architectures/captacao_ux.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/architectures/captacao_ux.md) | Lead capture flow, CRM board, Kanban columns |
| Platform Settings & Feature Flags | [.agents/architectures/platform_settings.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/architectures/platform_settings.md) | Tenant configuration, feature flags, global settings |

---

## 🏛️ 3. Stack Decision Matrix (Onde Escrever Cada Código)

| Camada | Tecnologia | Quando Utilizar | Exemplo de Endpoint |
|---|---|---|---|
| **CRUD Direto** | PostgREST + RLS | Leituras e escritas simples em uma única tabela. | `GET /rest/v1/contacts?select=*` |
| **Transações Atômicas** | PostgreSQL RPC (PL/pgSQL) | Multi-tabelas na mesma transação DB. | `POST /rest/v1/rpc/create_workspace_with_defaults` |
| **Backend Core API** | Fastify (`/v1/*`) | Uploads de arquivos, Webhooks, cookies HttpOnly, Resend API. | `POST /v1/media/upload` |
| **Processamento Assíncrono** | RabbitMQ + TS Workers | Tarefas pesadas em background (e-mails, logs, domínios). | Fila `email.transactional` |
| **Frontend UI** | Next.js 14 + `@psi/ui` | Interfaces web responsivas com tema dinâmico. | `@psi/ui/components/button` |

---

## 📖 4. Guia de Desenvolvimento & Receitas para IAs

### 🟢 Receita 1: Como Criar uma Nova Rota na API Fastify (`/v1/*`)

1. Crie ou atualize o arquivo em `backend/src/apis/core/routes/<domínio>.ts`.
2. Adicione **validação Zod** e **Rate Limiting por Rota**:
   ```typescript
   import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
   import z from 'zod';
   import { log } from '../../../shared/queue';

   export const exampleRoutes: FastifyPluginAsyncZod = async (fastify) => {
     fastify.post(
       '/action',
       {
         config: {
           rateLimit: {
             max: 10,
             timeWindow: '1 minute'
           }
         },
         schema: {
           body: z.object({
             title: z.string().min(1)
           }),
           response: {
             200: z.object({ success: z.boolean() })
           }
         }
       },
       async (request, reply) => {
         const requestId = (request.raw as any).requestId;
         const userId = (request.raw as any).userId;
         const sessionId = (request.raw as any).sessionId;

         // Lógica do serviço...

         return reply.send({ success: true });
       }
     );
   };
   ```

---

### 🟢 Receita 2: Como Criar uma Nova Fila no RabbitMQ & Worker Assíncrono

1. **Declarar a Fila em `src/shared/queue.ts`**:
   No array `coreQueues` dentro de `getChannel()`, adicione a nova Quorum Queue:
   ```typescript
   { name: 'domain.process', routingKey: 'domain.process' }
   ```
2. **Criar o Consumidor em `src/consumers/` ou `src/workers/index.ts`**:
   ```typescript
   import { getChannel, assertQuorumQueue, log } from '../shared/queue';

   export async function startDomainConsumer() {
     const channel = await getChannel();
     const queueName = 'domain.process';
     await assertQuorumQueue(queueName, queueName);

     await channel.consume(queueName, async (msg) => {
       if (!msg) return;
       try {
         const payload = JSON.parse(msg.content.toString());
         
         // Processar tarefa...

         await log({
           type: 'info',
           serviceName: 'domain-worker',
           message: `Processamento concluído com sucesso`,
           userId: payload.metadata?.userId,
           sessionId: payload.metadata?.sessionId,
           metadata: { requestId: payload.metadata?.requestId }
         });

         channel.ack(msg);
       } catch (err: any) {
         console.error('❌ Erro no worker:', err);
         channel.nack(msg, false, false); // Reencaminha para a DLQ
       }
     });
   }
   ```

---

### 🟢 Receita 3: Como Alterar o Banco de Dados e Rodar Migrações

1. Altere o schema TypeScript em [schema.ts](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/backend/src/shared/schema.ts).
2. Execute o CLI de migração:
   ```bash
   npm run db:migrate
   ```
---

### 🟢 Receita 4: Como Documentar uma Nova Feature (`.agents/architectures/<feature>.md`)

Sempre que criar ou alterar uma funcionalidade, adicione ou atualize a documentação em `.agents/architectures/` seguindo o padrão oficial de 5 seções:

1. **Criar o arquivo**: `.agents/architectures/<feature_name>.md`
2. **Estruturar em 5 Seções**:
   - `1. Scope & Triggers`: O que a funcionalidade faz e quando ler este arquivo.
   - `2. Inviolable Directives (ALWAYS / NEVER)`: Regras de negócio da funcionalidade.
   - `3. Feature Architecture & Flowchart`: Fluxo de dados em diagrama Mermaid.
   - `4. Concrete Code Recipes & Schemas`: Tabelas SQL, endpoints e componentes `@psi/ui` utilizados.
   - `5. Anti-Patterns & Prohibitions`: Exemplo explicito de ❌ Errado vs ✅ Correto.
3. **Mapear na Tabela Mestre**: Adicione o arquivo à tabela **Context Loading Matrix** na seção 2 do `AGENTS.md`.

---

## ⚡ 5. Essential CLI Productivity & Deploy Commands

```bash
# Database & Migrations
npm run db:migrate   # Auto-generates SQL from schema.ts, applies in transaction, updates schema_migrations, reloads PostgREST
npm run db:version   # Applies pending migrations, prompts tag (e.g. v1.1.0), updates schema_versions
npm run db:reset     # Resets DB (Localhost only, requires "CONFIRMAR")

# Local Docker Deploy (Windows/WSL)
npm run dev:deploy          # Full deploy por padrão: docker compose down && docker compose up -d --build + healthcheck
npm run dev:deploy -- --fast # Fast deploy (~3s): rebuilds apenas api/workers e reinicia Nginx
```

---

## 🛠️ 6. Repository Architecture Overview

```text
psi-app/
├── backend/                  # Fastify Core API, RabbitMQ Workers & GoTrue Integration
│   ├── src/
│   │   ├── apis/core/        # Fastify HTTP Server (/v1/*) & Routes
│   │   ├── consumers/        # RabbitMQ Queue Consumers (workers)
│   │   ├── emails/           # React Email templates & send helpers
│   │   └── shared/           # DB connection, Queue client (log, publishLog), Auth helpers
├── frontend/                 # Next.js Apps & Monorepo Packages
│   ├── apps/
│   │   ├── web/              # Main Client Application (Dashboard, Site Editor, CRM)
│   │   └── admin/            # Superadmin Portal
│   └── packages/
│       ├── ui/               # Shared Design System Component Library (@psi/ui)
│       └── image-utils/      # Image compression & manipulation helpers
└── .agents/                  # Otimized AI Rules, Architectures & Domain Specs
```
