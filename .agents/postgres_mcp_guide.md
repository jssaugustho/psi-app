# 🐘 Guia do PostgreSQL MCP para Agentes de IA: Auditoria de Logs & Consumo de Schema

Este documento é um guia especializado para **Agentes de IA (Gemini, Cursor, Copilot, Antigravity)**. Ele especifica como utilizar o servidor **PostgreSQL MCP** (`postgres:query`) para monitorar os logs da aplicação em tempo real, auditar eventos sensíveis e consultar o schema do banco de dados com segurança e máxima eficiência.

---

## 🎯 1. Diretrizes de Uso Seguro da MCP do PostgreSQL

> [!IMPORTANT]
> **REGRAS OBRIGATÓRIAS PARA AGENTES DE IA:**
> 1. **Apenas Operações de Leitura (`SELECT`)**: Ao utilizar a ferramenta MCP `postgres:query`, faça **apenas consultas `SELECT`**. Mutações (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`) devem ser feitas via migrações SQL no repositório (`backend/drizzle/`) ou endpoints da API.
> 2. **Sempre Limitar Resultados (`LIMIT 50`)**: Para não sobrecarregar o contexto nem gerar payloads massivos, limite todas as consultas de logs e auditoria a no máximo 50 registros por query.
> 3. **Ordenação Cronológica**: Sempre ordene por `created_at DESC` para inspecionar os eventos mais recentes do sistema.

---

## 📜 2. Como Acompanhar os Logs da Aplicação via MCP

O ecossistema possui 4 tabelas dedicadas de log e monitoramento que podem ser consultadas via MCP:

### 2.1 Consultar Logs de Erros e Exceções (`logs`)
A tabela `logs` (antiga `error_logs`) centraliza todos os erros capturados no Fastify, Workers e Frontend:

#### 🔍 Buscar os últimos 20 erros da aplicação:
```sql
SELECT id, service_name, name, message, severity, user_id, url, created_at
FROM public.logs
WHERE severity IN ('error', 'fatal')
ORDER BY created_at DESC
LIMIT 20;
```

#### 🔍 Buscar erros de um serviço específico (ex: `core-api`, `workers`, `frontend`, `postgres`):
```sql
SELECT id, name, message, stack, metadata, created_at
FROM public.logs
WHERE service_name = 'core-api'
ORDER BY created_at DESC
LIMIT 15;
```

#### 🔍 Investigar erros associados a um Usuário específico:
```sql
SELECT id, service_name, name, message, url, created_at
FROM public.logs
WHERE user_id = 'UUID_DO_USUARIO'
ORDER BY created_at DESC
LIMIT 20;
```

---

### 2.2 Consultar Trilha de Auditoria Sensível (`audit_logs`)
A tabela `audit_logs` grava eventos de segurança, login, alterações de credenciais e webhooks:

#### 🔍 Rastrear tentativas de Login recentes (sucesso e falha):
```sql
SELECT id, action, status, user_id, ip, user_agent, details, created_at
FROM public.audit_logs
WHERE action = 'auth.login'
ORDER BY created_at DESC
LIMIT 20;
```

#### 🔍 Buscar falhas de autenticação ou acessos negados:
```sql
SELECT id, action, category, service_name, ip, user_agent, details, created_at
FROM public.audit_logs
WHERE status = 'failure'
ORDER BY created_at DESC
LIMIT 20;
```

#### 🔍 Auditar alterações de infraestrutura e credenciais (`Cloudflare`, `R2`, `Resend`):
```sql
SELECT id, action, category, user_id, status, details, created_at
FROM public.audit_logs
WHERE category = 'config'
ORDER BY created_at DESC
LIMIT 15;
```

#### 🔍 Verificar recebimento de Webhooks no CRM:
```sql
SELECT id, action, workspace_id, status, details, created_at
FROM public.audit_logs
WHERE action = 'webhook.crm_received'
ORDER BY created_at DESC
LIMIT 15;
```

---

### 2.3 Consultar Saúde e Heartbeats do Sistema (`system_status_logs`)
Verifica se os serviços (Fastify API, PostgreSQL, RabbitMQ) estão operacionais:

```sql
SELECT service_name, status, response_time_ms, message, created_at
FROM public.system_status_logs
ORDER BY created_at DESC
LIMIT 20;
```

---

### 2.4 Consultar Disparos de E-mails Transacionais (`email_logs`)
Verifica se e-mails de notificação ou reset de senha foram enviados com sucesso:

```sql
SELECT id, to_email, subject, template, status, error, sent_at
FROM public.email_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 15;
```

---

## 🗄️ 3. Mapeamento Completo do Schema do Banco de Dados

### 3.1 Diagrama de Relacionamento das Tabelas Principais

```text
[ profiles ] (Usuários / Psicólogos)
    │
    ├──< [ workspace_members ] (Ponte M:N com papéis role/permissions)
    │          │
    │          ▼
    └───> [ workspaces ] (Consultórios / Clínicas)
               │
               ├──1:1─> [ workspace_domains ] (Subdomínio & Domínio customizado DNS)
               ├──1:N─> [ visual_identities ] (Temas, Cores e Logos)
               ├──1:N─> [ capture_pages ] (Landing Pages)
               ├──1:N─> [ screening_forms ] (Formulários de Triagem)
               ├──1:N─> [ pipeline_columns ] (Estágios do CRM)
               └──1:N─> [ contacts ] (Leads / Pacientes)
                             │
                             └──1:N─> [ interaction_history ] (Histórico de Ações)
```

---

### 3.2 Tabela por Tabela: Estrutura e Propósito

| Tabela | Propósito do Negócio | Chaves Principais & Colunas Relevantes |
|---|---|---|
| **`profiles`** | Usuários cadastrados (Psicólogos, Admins). | `id` (FK `auth.users.id`), `email`, `first_name`, `last_name`, `cpf`, `crp`, `role` (`'admin'`/`'user'`). |
| **`workspaces`** | Espaços de trabalho (Consultórios/Clínicas). | `id`, `name`, `owner_id` (FK `profiles.id`), `crp`, `bio`, `traffic_sources`, `default_traffic_source`. |
| **`workspace_domains`** | Roteamento de domínios e subdomínios DNS. | `id`, `workspace_id` (FK `workspaces.id`), `subdomain`, `custom_domain`, `dns_status`, `dns_records`. |
| **`visual_identities`** | Identidades visuais, logos e cores. | `id`, `workspace_id`, `logo_url`, `primary_color`, `secondary_color`, `font_heading`, `font_body`. |
| **`workspace_members`** | Membros e privilégios RBAC por espaço. | `id`, `workspace_id`, `user_id`, `role` (`'owner'`, `'admin'`, `'secretaria'`, `'psicologo'`), `permissions`. |
| **`platform_settings`** | Configurações globais White-Label SaaS. | `id`, `platform_name`, `cloudflare_api_token`, `r2_bucket_name`, `resend_api_key`, `resend_from_domain`. |
| **`capture_pages`** | Landing pages de captação de pacientes. | `id`, `workspace_id`, `title`, `slug`, `is_active`, `seo_config`, `site_config`, `dictionary`, `draft_data`. |
| **`screening_forms`** | Formulários de triagem clínica. | `id`, `workspace_id`, `title`, `slug`, `is_active`, `theme_config`, `form_flow`, `draft_data`. |
| **`pipeline_columns`** | Etapas do funil de vendas do CRM. | `id`, `workspace_id`, `name`, `category` (`'acolhimento'`, `'paciente'`, etc.), `order`. |
| **`contacts`** | Leads e Pacientes no CRM. | `id`, `workspace_id`, `pipeline_column_id`, `name`, `phone`, `email`, `status`, `utm_source`, `custom_field_values`. |
| **`interaction_history`** | Timeline de interações com o paciente. | `id`, `contact_id`, `workspace_id`, `type`, `notes`, `created_at`. |
| **`media_assets`** | Galeria de imagens/mídia no R2. | `id`, `workspace_id`, `name`, `key`, `url`, `mime_type`, `file_size`. |
| **`logs`** | Logs centralizados de exceções e erros. | `id`, `name`, `message`, `stack`, `service_name`, `severity`, `user_id`, `url`, `metadata`, `created_at`. |
| **`audit_logs`** | Auditoria de ações sensíveis e segurança. | `id`, `action`, `category`, `service_name`, `status`, `user_id`, `workspace_id`, `ip`, `details`, `created_at`. |

---

## 💡 4. Exemplo Completo de Consulta MCP para Agente de IA

Se o usuário perguntar: *"IA, veja se houve algum erro recente no cadastro de usuários ou envio de e-mails"*:

1. **Passo 1: Consultar erros recentes na tabela `logs`**:
   ```sql
   SELECT service_name, name, message, created_at
   FROM public.logs
   WHERE message ILIKE '%register%' OR message ILIKE '%email%' OR service_name = 'workers'
   ORDER BY created_at DESC
   LIMIT 10;
   ```
2. **Passo 2: Consultar logs de e-mail com falha**:
   ```sql
   SELECT to_email, subject, template, error, sent_at
   FROM public.email_logs
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 10;
   ```
3. **Passo 3: Sintetizar a resposta em linguagem clara** indicando a causa exata identificada nas queries SQL.
