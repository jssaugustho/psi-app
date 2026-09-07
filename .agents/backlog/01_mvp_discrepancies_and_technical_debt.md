# 📋 Technical Backlog: MVP Discrepancies & Post-MVP Refactoring Roadmap

> **Scope & Triggers**: Este documento registra oficialmente todas as divergências arquiteturais, inconsistências de schema, débitos técnicos e especificações diferidas identificadas durante a auditoria do PSI-APP. **Leia este arquivo ao planejar sprints pós-lançamento do MVP ou ao refatorar módulos legados.**

---

## ⚡ 1. Directives & Principles (Estratégia do MVP vs Pós-MVP)

- **ALWAYS prioritize MVP stability**: Divergências funcionais que não impedem a operação do MVP permanecem congeladas e catalogadas neste documento.
- **NEVER break production features for cosmetic documentation alignment**: Se o código do app funciona perfeitamente no MVP (ex: Trigger de workspace, `capture_pages`), o código é mantido e a refatoração/alinhamento é agendada para pós-lançamento.
- **ALWAYS resolve pending SQL migrations before production release**: O fechamento de versão (`npm run db:version`) deve ser executado no marco final do MVP.

---

## 🗺️ 2. Matriz Sintética de Divergências & Débitos Técnicos

| ID | Área / Módulo | Estado no MVP | Divergência / Débito Registrado | Ação Pós-MVP / Solução Agendada | Prioridade |
|---|---|---|---|---|---|
| **GAP-01** | Visual Editor & Sites | `capture_pages` + JSONB | Specs (`site_editor.md`, `site_staging_and_publishing.md`) preveem tabelas `sites` e `site_drafts` e RPC `publish_site`. App usa `capture_pages` com Fastify route. | Avaliar migração para tabelas dedicadas ou oficializar `capture_pages` na documentação. | Média |
| **GAP-02** | Bootstrapping Workspaces | Trigger PostgreSQL | Spec (`site_wizard_and_defaults.md`) prevê RPC `bootstrap_workspace_defaults()` e 4 colunas. App usa Trigger com 7 estágios clínicos. | Atualizar documentação para oficializar a Trigger PostgreSQL e a esteira clínica de 7 estágios. | Baixa |
| **GAP-03** | CRM & Captação | Tabela `contacts` | Spec (`captacao_ux.md`) cita `crm_leads`, `status_id` e Captcha. App usa `contacts`, `pipeline_column_id` e secret header. | Atualizar documento para refletir `contacts` e agendar implementação de Captcha pós-MVP. | Baixa |
| **GAP-04** | Feature Flags & Roles | `platform_settings` | Spec (`platform_settings.md`) prevê `workspace_settings`, helper `isFeatureEnabled()` e role `superadmin`. | Implementar `workspace_settings` quando o sistema de planos/assinaturas for lançado. | Média |
| **GAP-05** | Tabela Unificada de Logs | Tab. unificada + legadas | Spec (`03_async_logging_and_events.md`) cita remoção de `audit_logs` e `system_status_logs`. Schema ainda mantém tabelas legadas. | Excluir tabelas legadas do `schema.ts` e refatorar fallback de emergência dos workers. | Baixa |
| **GAP-06** | Fastify vs PostgREST | Rotas CRUD no Fastify | Diretivas 2 e 3 proíbem CRUD no Fastify. Algumas rotas administrativas (`DELETE /pages/:id`) usam Fastify em vez de PostgREST + RLS. | Migrar endpoints simples para PostgREST (`/rest/v1/*`) com RLS. | Média |
| **GAP-07** | Arquivos `page.tsx` | Componentes monolíticos | Diretiva 5 exige `page.tsx` < 50 linhas. `captacao/[pageId]/page.tsx` possui 6.311 linhas e `crm/page.tsx` possui 2.164 linhas. | Extrair custom hooks (`useSiteEditor`, `useCrmBoard`) e atomicizar componentes em `@psi/ui`. | Alta |
| **GAP-08** | Migrações SQL Drizzle | 6 arquivos soltos | Diretiva 10 exige versionamento. Existem 6 SQLs soltos na raiz de `./drizzle/` sem arquivamento em `v1.0.X`. | Executar `npm run db:version` antes da publicação final da versão v1.0.0. | Alta |

---

## 📖 3. Inventário Detalhado dos Itens Registrados

### 🔹 GAP-01: Arquitetura do Editor de Sites e Tabelas de Publicação
- **Descrição**: `.agents/architectures/site_editor.md` e `site_staging_and_publishing.md` documentam uma arquitetura baseada nas tabelas `sites` e `site_drafts`, na procedure RPC `publish_site`, e no custom hook `useSiteEditor()`. O código funcional do MVP utiliza a tabela `capture_pages` com colunas JSONB `draftData` e `publishedData`, publica via `POST /v1/crm/captacao/pages/:id/publish` no Fastify e possui a lógica no editor visual.
- **Decisão MVP**: Manter o fluxo atual com `capture_pages`, pois atende 100% das demandas de lançamento sem instabilidade.
- **Plano Pós-MVP**: Atualizar as especificações para refletir `capture_pages` ou realizar a refatoração do schema se houver necessidade de separação estrita entre landing pages e sites multi-páginas.

### 🔹 GAP-02: Bootstrapping do Workspace e Estágios Padrão do CRM
- **Descrição**: `.agents/architectures/site_wizard_and_defaults.md` especifica a chamada síncrona de uma RPC `POST /rest/v1/rpc/bootstrap_workspace_defaults` com 4 colunas Kanban ("Novos Leads", "Contatados", "Agendados", "Finalizados"). No app real, a inicialização ocorre de forma transparente via **Trigger de Banco de Dados PostgreSQL** (`trg_auto_create_workspace_crm_defaults`) ao inserir em `workspaces`, gerando 7 colunas focadas na jornada do psicólogo ("Contato Inicial", "Triagem", "1ª Sessão Agendada", "Sessão Realizada", "Paciente Ativo", "Alta Clínica", "Arquivado").
- **Decisão MVP**: Manter a Trigger PostgreSQL ativa (garante criação atômica sem falhas de rede no cliente).
- **Plano Pós-MVP**: Reescrever o documento `site_wizard_and_defaults.md` para documentar a Trigger PostgreSQL como o padrão oficial do PSI-APP.

### 🔹 GAP-03: Nomenclatura das Tabelas de Captação e Segurança de Webhook
- **Descrição**: `.agents/architectures/captacao_ux.md` menciona a tabela `crm_leads`, a coluna `status_id` e verificação de Captcha em envios de formulários. O banco de dados utiliza a tabela `contacts`, a chave estrangeira `pipeline_column_id` e autenticação por `x-webhook-secret`.
- **Decisão MVP**: Manter `contacts` e `pipeline_column_id`.
- **Plano Pós-MVP**: Atualizar a documentação da arquitetura do CRM e agendar a integração de Captcha (Turnstile/reCAPTCHA) para formulários públicos expostos a spam.

### 🔹 GAP-04: Feature Flags, Configurações de Tenant e Permissões
- **Descrição**: `.agents/architectures/platform_settings.md` prevê a tabela `workspace_settings` com coluna JSONB `feature_flags`, o helper `isFeatureEnabled()` e a permissão `superadmin`. No MVP, o controle fica em `platform_settings` e as roles no JWT são `'admin'` ou `'user'`.
- **Decisão MVP**: Manter `platform_settings` e as roles atuais.
- **Plano Pós-MVP**: Criar a estrutura de `workspace_settings` e `feature_flags` quando o PSI-APP introduzir planos tarifários (Basic, Pro, Premium).

### 🔹 GAP-05: Consolidação do Sistema de Logs e Tabelas Legadas
- **Descrição**: `.agents/core/03_async_logging_and_events.md` indica que as tabelas `audit_logs` e `system_status_logs` foram totalmente descontinuadas em favor de `public.logs`. No entanto, o `schema.ts` ainda declara essas tabelas e o worker de monitoramento em `backend/src/workers/index.ts` executa `db.insert(systemStatusLogs)` como fallback emergencial se a publicação AMQP falhar.
- **Decisão MVP**: Preservar o fallback atual para garantir que falhas de infraestrutura fiquem gravadas.
- **Plano Pós-MVP**: Remover declarações legadas do `schema.ts` e redirecionar fallbacks de emergência diretamente para o buffer FIFO em RAM da função `log()`.

### 🔹 GAP-06: Padronização de Rotas Fastify Core API vs. PostgREST
- **Descrição**: As Regras de Ouro 2 e 3 determinam que rotas de leitura/escrita em tabela única pertencem exclusivamente ao PostgREST (`/rest/v1/*`) com RLS. O backend Fastify contém algumas rotas espelho para exclusão (`DELETE /v1/crm/captacao/pages/:id`) e atualização (`PUT /tenant/primary`).
- **Decisão MVP**: Manter as rotas Fastify existentes funcionando.
- **Plano Pós-MVP**: Realizar varredura nos endpoints do Fastify e migrar operações CRUD simples para requisições PostgREST via frontend, mantendo o Fastify enxuto.

### 🔹 GAP-07: Refatoração Modular dos Componentes `page.tsx` Monolíticos
- **Descrição**: A Regra de Ouro 5 exige arquivos `page.tsx` < 50 linhas. No entanto, durante o desenvolvimento rápido da interface, arquivos como `captacao/[pageId]/page.tsx` (6.311 linhas), `crm/page.tsx` (2.164 linhas) e `captacao/nova/page.tsx` (2.663 linhas) acumularam estado, manipulação de drag-and-drop, modais e estilos inline.
- **Decisão MVP**: Não faturar ou quebrar os editores às vésperas do lançamento para evitar regressões visuais.
- **Plano Pós-MVP**: Refatoração progressiva em sapatas atômicas:
  1. Extração de custom hooks de estado (`useCaptacaoEditor`, `useCrmKanban`).
  2. Migração de modais e botões genéricos para o pacote `@psi/ui`.
  3. Substituição de valores hexadecimais por classes Tailwind e variáveis CSS (`var(--brand-gradient-start)`).

### 🔹 GAP-08: Versionamento e Consolidação de Migrações Drizzle SQL
- **Descrição**: A Regra de Ouro 10 estabelece que migrações ativas em desenvolvimento ficam na raiz de `./drizzle/` e são organizadas em subpastas (`./drizzle/migrations/vX.X.X/`) via `npm run db:version`. No momento, existem 6 arquivos SQL soltos (`0003_slow_wrecker.sql`, `0004_smiling_vulture.sql`, `0005_lumpy_leader.sql`, `0013_...`, `0014_...`, `0015_...`).
- **Decisão MVP**: Agendado para execução na fase final de congelamento do release MVP.
- **Plano Pós-MVP / Pre-Release**: Executar `npm run db:version`, etiquetar a versão `v1.0.0` e atualizar a tabela `schema_migrations`.

---

## ❌ 4. Anti-Patterns a Evitar Durante o Período de Backlog

### ❌ ERRADO: Ignorar os débitos registrados e criar novos arquivos monolíticos
```tsx
// ❌ NÃO FAÇA ISSO: Criar novas páginas grandes acumulando lógica e quebrando a regra de 50 linhas
export default function NewFeaturePage() {
  // 500 linhas de estado e JSX direto no page.tsx
}
```

### ✅ CORRETO: Consultar o backlog e adotar o padrão arquitetural em novas telas
```tsx
// ✅ FAÇA ISSO: Em novas funcionalidades, siga o padrão estrito de < 50 linhas
import { useNewFeature } from '@/hooks/useNewFeature';
import { FeatureContainer } from '@psi/ui';

export default function NewFeaturePage() {
  const { state, actions } = useNewFeature();
  return <FeatureContainer state={state} actions={actions} />;
}
```
