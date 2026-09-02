# Arquitetura de Logs, Auditoria de Ações Sensíveis e Resiliência AMQP

Este documento especifica as diretrizes arquiteturais obrigatórias para o registro de **Logs de Erro (`logs`)** e **Auditoria de Ações Sensíveis (`audit_logs`)** em todo o ecossistema da aplicação (**Fastify API**, **TS Workers**, **Frontend** e **Serviços de Background**).

---

## 📐 1. Princípios Arquiteturais Globais

1. **Zero DB no Path Crítico HTTP**:
   - Nenhuma rota HTTP da API Fastify ou componente do Frontend deve realizar escritas síncronas de log diretamente no PostgreSQL (`db.insert(...)`).
   - Todo registro de log ou auditoria deve ser enviado assincronamente via **RabbitMQ** ou mantido em buffer em memória durante oscilações de rede.

2. **Garantia de Persistência Assíncrona via TS Workers**:
   - A gravação em banco de dados é realizada exclusivamente pelo processo **TS Worker** (`src/workers/index.ts`) que consome as filas Quorum `system.errors` (tabela `logs`) e `system.audit` (tabela `audit_logs`).

3. **Resiliência via Buffer em Memória (`InMemoryLogBuffer`)**:
   - Se o RabbitMQ estiver temporariamente indisponível ou reconectando, os helpers `publishErrorLog` e `publishAuditLog` em `src/shared/queue.ts` armazenam as mensagens em um array em memória com limite estrito de **1.000 itens (FIFO)**.
   - Um timer de background no processo Node (`setInterval` a cada 5 segundos) descarrega o buffer automaticamente assim que a conexão com o RabbitMQ for reestabelecida.

---

## 🗄️ 2. Mapeamento de Tabelas de Banco de Dados

### 2.1 Tabela `logs` (Antiga `error_logs`)
Armazena falhas de execução, exceções do sistema e erros reportados client-side.

* **Campos**: `id`, `name`, `message`, `stack`, `url`, `user_agent`, `user_id`, `service_name`, `severity` (`'error' | 'warning' | 'fatal' | 'info'`), `metadata`, `created_at`.
* **RLS**: Habilitado (`logs_admin_policy` restrito a `is_platform_admin()`).
* **Alias Drizzle**: `export const errorLogs = logs;` (mantido para compatibilidade).

### 2.2 Tabela `audit_logs` (Audit Trail de Ações Sensíveis)
Armazena a trilha de auditoria de operações de negócios, segurança e alterações de infraestrutura.

* **Campos**: `id`, `action`, `category` (`'auth' | 'security' | 'config' | 'email' | 'webhook' | 'data'`), `service_name`, `status` (`'success' | 'failure'`), `user_id`, `workspace_id`, `ip`, `user_agent`, `details`, `created_at`.
* **RLS**: Habilitado (`audit_logs_admin_policy` restrito a `is_platform_admin()`).

---

## 🔐 3. Rastreamento Obrigatório de Ações Sensíveis (`publishAuditLog`)

Desenvolvedores e Agentes de IA devem incluir `publishAuditLog` nas seguintes situações:

| Categoria | Ação (`action`) | Descrição da Operação |
|---|---|---|
| **`auth`** | `auth.bootstrap` | Inicialização do primeiro Administrador da plataforma. |
| **`auth`** | `auth.register` | Cadastro de nova conta de usuário. |
| **`auth`** | `auth.login` | Tentativa de login (sucesso ou falha, com IP e User-Agent). |
| **`auth`** | `auth.forgot_password` | Solicitação de link para redefinição de senha. |
| **`auth`** | `auth.reset_password` | Alteração de senha via token de recuperação. |
| **`auth`** | `auth.update_profile` | Atualização de perfil, senha ou dados pessoais do usuário. |
| **`config`** | `config.cloudflare_update` | Alteração de credenciais do Cloudflare (API Token / Zone). |
| **`config`** | `config.r2_storage_update` | Configuração de Buckets R2 de armazenamento em nuvem. |
| **`config`** | `config.resend_update` | Alteração da chave e domínio do serviço de e-mail Resend. |
| **`config`** | `config.white_label_update` | Alteração da identidade visual master da plataforma. |
| **`config`** | `domain.verified` | Confirmação de domínio ativo no Cloudflare DNS. |
| **`email`** | `email.sent` / `email.failed` | Disparo e resultado do envio de e-mail transacional. |
| **`webhook`** | `webhook.crm_received` | Recebimento de payload via webhook externo no CRM. |

---

## 📡 4. Endpoints REST da API Fastify

* **`GET /v1/platform/errors`**: Consulta com filtros (`serviceName`, `severity`, `name`, `message`, `userId`, datas, limites e offset) dos logs de erros na tabela `logs`.
* **`POST /v1/platform/errors`**: Endpoint aberto para o Frontend reportar exceções client-side com `serviceName: 'frontend'`.
* **`GET /v1/platform/audit-logs`**: Consulta com filtros (`action`, `category`, `serviceName`, `status`, `userId`, `workspaceId`, datas, limites e offset) dos logs na tabela `audit_logs`.
