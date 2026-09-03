# 🛠️ Core Rule 01: Stack Architecture & Decision Tree

> **Scope & Triggers**: Leia este arquivo antes de criar qualquer novo endpoint, tabela, procedure ou consumidor de fila. Ele define a decisão arquitetural de onde posicionar o seu código no PSI-APP.

---

## ⚡ 1. Directives & Constraints (ALWAYS / NEVER)

- **ALWAYS use PostgREST for single-table CRUD**: Leituras e escritas em tabelas únicas pertencem exclusivamente ao PostgREST (`/rest/v1/*`) com Row Level Security (RLS).
- **ALWAYS use PostgreSQL Stored Functions (RPC) for multi-table DB transactions**: Operações atômicas no banco de dados pertencem a funções PL/pgSQL expostas em `/rest/v1/rpc/*`.
- **ALWAYS restrict Fastify (`/v1/*`) to non-PostgREST capabilities**: Webhooks, upload de arquivos/imagens, cookies HttpOnly e integrações externas (Cloudflare R2, Resend).
- **ALWAYS use RabbitMQ Quorum Queues for async processing**: Tarefas de segundo plano que não exigem resposta HTTP síncrona devem ser enviadas para filas AMQP.
- **NEVER create mirror Fastify routes for basic CRUD operations**.

---

## 🗺️ 2. Architecture & Decision Flowchart

```mermaid
graph TD
    A[Nova Funcionalidade / Requisito] --> B{Operação CRUD em Tabela Única?}
    B -- Sim --> C[1. PostgREST CRUD + RLS (/rest/v1/*)]
    B -- Não --> D{Lógica Pura de Banco / Transação Multi-tabela?}
    D -- Sim --> E[2. PostgREST RPC / Stored Function (/rest/v1/rpc/*)]
    D -- Não (Envolve APIs Externas: Cloudflare, Resend, S3/R2) --> F{Exige Resposta HTTP Síncrona?}
    F -- Sim --> G[3. Fastify Core API (/v1/*)]
    F -- Não --> H[4. RabbitMQ Queue + Async TS Worker]

    style C fill:#10B981,stroke:#333,stroke-width:2px,color:#fff
    style E fill:#8B5CF6,stroke:#333,stroke-width:2px,color:#fff
    style G fill:#3B82F6,stroke:#333,stroke-width:2px,color:#fff
    style H fill:#F59E0B,stroke:#333,stroke-width:2px,color:#fff
```

---

## 🏗️ 3. Stack Services Overview

| Serviço | Porta / URI | Responsabilidade Primária |
|---|---|---|
| **Nginx Proxy** | Host `:8000` | Edge gateway. Roteia `/auth/v1/*` ➔ GoTrue, `/rest/v1/*` ➔ PostgREST, `/v1/*` ➔ Fastify. |
| **GoTrue Auth** | `gotrue:9999` | Servidor Supabase Auth. Gerencia logins, cadastros, resets de senha e emissão de JWTs. |
| **PostgREST** | `postgrest:3000` | API REST auto-gerada sobre o schema `public`. Aplica RLS baseado no token JWT. |
| **Fastify Core API** | `api:5000` | Regras de negócio customizadas, upload de arquivos, cookies HttpOnly, webhooks, WebSockets. |
| **RabbitMQ Broker** | `rabbitmq:5672` | Broker AMQP com Quorum Queues (`system.logs`, `email.transactional`, `domain.verify`). |
| **TS Workers** | Background | Consumidores assíncronos que executam tarefas de fila e gravam na tabela unificada `logs`. |

---

## 📖 4. Concrete Code Recipes

### Caminho 1: Chamada Direta ao PostgREST (Frontend)
```typescript
// ✅ Buscar contatos de um workspace respeitando RLS
const response = await fetch('/rest/v1/contacts?workspace_id=eq.' + workspaceId + '&select=*', {
  headers: {
    'Authorization': `Bearer ${userJwt}`,
    'apikey': anonKey
  }
});
const contacts = await response.json();
```

### Caminho 2: Chamada a RPC no PostgREST (Frontend / Backend)
```typescript
// ✅ Invocar Stored Function transacional via RPC
const response = await fetch('/rest/v1/rpc/create_workspace_with_defaults', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userJwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'Nova Clínica' })
});
```

### Caminho 3: Rota Rápida no Fastify com Rate Limit (`/v1/*`)
```typescript
fastify.post('/v1/media/upload', {
  config: {
    rateLimit: { max: 5, timeWindow: '1 minute' }
  },
  schema: {
    body: z.object({ fileName: z.string() })
  }
}, async (request, reply) => {
  const requestId = (request.raw as any).requestId;
  // Upload logic...
  return reply.send({ success: true, requestId });
});
```

---

## ❌ 5. Anti-Patterns & Prohibitions

### ❌ ERRADO: Criar rota Fastify para buscar dados de uma tabela
```typescript
// ❌ NÃO FAÇA ISSO: Rota espelho desnecessária no Fastify
fastify.get('/v1/workspaces', async (req, reply) => {
  const data = await db.select().from(workspaces);
  return reply.send(data);
});
```

### ✅ CORRETO: Consultar diretamente o PostgREST com RLS
```typescript
// ✅ FAÇA ISSO: O PostgREST aplica RLS automaticamente sem código backend duplicado
const res = await fetch('/rest/v1/workspaces?select=*', { headers: { Authorization: `Bearer ${token}` } });
```

---

## 🚀 6. Local Deploy Workflow (`docker compose`)

- **Deploy Rápido de Código (`npm run dev:deploy`)**: Recompila `api` e `workers` em **~3 segundos**, recarregando o Nginx sem reiniciar banco ou filas.
- **Rebuild Total de Infraestrutura (`npm run dev:deploy -- --full`)**: Reinicia todos os contêineres Docker (`docker compose down && docker compose up -d --build`).
