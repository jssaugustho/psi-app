# 🔑 Core Rule 07: Environment Variables & Platform Settings Guide

> **Scope & Triggers**: Leia este arquivo antes de adicionar, alterar ou documentar variáveis de ambiente (`.env`) no backend, frontend ou arquivos de orquestração Docker Compose (`docker-compose.yml` / `docker-compose.prod.yml`).

---

## ⚡ 1. Directives & Rules (ALWAYS / NEVER)

1. **NEVER place Cloudflare R2, S3 or Resend API keys in `.env`**:
   - As credenciais de armazenamento (Bucket, Public Domain, Access Keys) e integrações de email (Resend API Key) são configuradas **dinamicamente no banco de dados** na tabela `public.platform_settings` pelo painel Superadmin (`/setup/status` e `/v1/platform/...`).
2. **ALWAYS validate mandatory env vars using Zod in `backend/src/config/env.ts`**:
   - `JWT_SECRET` deve possuir no mínimo 32 caracteres.
   - `SERVICE_SECRET_KEY` deve possuir no mínimo 16 caracteres.
3. **ALWAYS keep secret keys out of git repositories**:
   - `backend/.env` deve estar explicitamente incluído no `.gitignore`.
   - Utilize apenas arquivos de modelo (`.env.example` e `.env.production.example`) com valores genéricos/placeholders no repositório.

---

## 🗺️ 2. Separation of Concerns: `.env` vs Database (`platform_settings`)

```mermaid
flowchart TD
    subgraph Environment Variables [backend/.env]
        A[Segredos de Infraestrutura & Conexão]
        A --> A1["JWT_SECRET (mínimo 32 chars)"]
        A --> A2["SERVICE_SECRET_KEY (UUIDv4)"]
        A --> A3["DATABASE_URL (PostgreSQL)"]
        A --> A4["RABBITMQ_URL (AMQP Broker)"]
        A --> A5["GOTRUE_URL (Auth Interno)"]
    end

    subgraph Database Table [public.platform_settings]
        B[Configurações Dinâmicas da Plataforma]
        B --> B1["Cloudflare R2 Access & Secret Keys"]
        B --> B2["Cloudflare R2 Bucket & Public Domain"]
        B --> B3["Resend API Key & From Domain"]
        B --> B4["Visual Identity & Brand Colors"]
    end

    style Environment Variables fill:#1E293B,stroke:#3B82F6,stroke-width:2px,color:#fff
    style Database Table fill:#1E293B,stroke:#10B981,stroke-width:2px,color:#fff
```

---

## 📋 3. Complete Environment Variables Reference Matrix

| Variável | Obrigatoriedade | Valor Padrão / Exemplo | Descrição & Uso |
|---|---|---|---|
| `NODE_ENV` | Opcional | `development` (dev) / `production` (prod) | Define o modo de execução do Node.js e otimizações do Fastify. |
| `PORT` | Opcional | `5000` | Porta interna em que a API Fastify escuta conexões. |
| `DATABASE_URL` | **Obrigatório** | `postgres://postgres:pwd@postgres:5432/postgres` | URL de conexão PostgreSQL usada pela API, Drizzle e scripts de migração. |
| `JWT_SECRET` | **Obrigatório** | Min 32 chars (`psi_super_secret_jwt_token...`) | Chave simétrica usada para assinar e verificar tokens JWT (compartilhada com GoTrue e PostgREST). |
| `SERVICE_SECRET_KEY` | **Obrigatório** | Min 16 chars (`c3d9a7e1-8f2b-4d5c-9e1a...`) | Chave secreta interna para comunicação privilegiada entre microsserviços. |
| `RABBITMQ_URL` | **Obrigatório** | `amqp://guest:guest@rabbitmq:5672` | String de conexão AMQP para o broker RabbitMQ e os TS Workers. |
| `GOTRUE_URL` | **Obrigatório** | `http://gotrue:9999` | Endpoint interno da API de autenticação GoTrue (Supabase Auth). |
| `GOTRUE_SITE_URL` | Opcional | `http://localhost:3000` / `https://app.dom.com` | URL base do frontend para redirecionamentos de login/reset de senha no GoTrue. |
| `POSTGRES_USER` | Opcional | `postgres` | Usuário do banco de dados no container PostgreSQL. |
| `POSTGRES_PASSWORD` | **Obrigatório** | Senha forte | Senha de autenticação do container PostgreSQL. |
| `POSTGRES_DB` | Opcional | `postgres` | Nome do banco de dados relacional. |
| `POSTGRES_PORT` | Opcional | `5432` | Porta mapeada no host para o PostgreSQL (em prod: bound a `127.0.0.1`). |
| `RABBITMQ_DEFAULT_USER` | Opcional | `guest` (dev) / `psi_admin` (prod) | Usuário administrador do broker RabbitMQ. |
| `RABBITMQ_DEFAULT_PASS` | **Obrigatório** | Senha forte | Senha de acesso ao broker e painel de gerenciamento RabbitMQ. |
| `RABBITMQ_PORT` | Opcional | `5672` | Porta AMQP exposta no host para o RabbitMQ (em prod: bound a `127.0.0.1`). |
| `RABBITMQ_MANAGEMENT_PORT`| Opcional | `15672` | Porta da interface web de gerenciamento do RabbitMQ (em prod: bound a `127.0.0.1`). |
| `NGINX_PORT` | Opcional | `8000` | Porta do host em que o Nginx API Gateway aceita requisições. |
| `GOTRUE_API_EXTERNAL_URL` | Opcional | `http://localhost:8000/auth/v1` | URL pública através da qual os clientes acessam a API do GoTrue via Nginx. |
| `GOTRUE_URI_ALLOW_LIST` | Opcional | `http://localhost:3000/*` | Padrão de URIs autorizadas para redirecionamento pós-login. |
| `TUNNEL_TOKEN` | Opcional | Token base64 | Token de autenticação do Cloudflare Tunnel container (se utilizado). |

---

## ❌ 4. Anti-Patterns & Prohibitions

### ❌ ERRADO: Adicionar credenciais de bucket S3/R2 ou chave da Resend no `.env`
```env
# ❌ NÃO FAÇA ISSO: Credenciais de storage e email pertencem à tabela platform_settings
S3_ACCESS_KEY_ID=sua_chave
S3_SECRET_ACCESS_KEY=sua_secret
RESEND_API_KEY=re_123456
```

### ✅ CORRETO: Manter apenas variáveis de infra no `.env` e gerenciar storage/email via DB
```env
# ✅ FAÇA ISSO: Variáveis de infraestrutura limpas no .env
JWT_SECRET=sua_chave_jwt_com_mais_de_32_caracteres_de_tamanho
DATABASE_URL=postgres://postgres:senha@postgres:5432/postgres
RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
```
