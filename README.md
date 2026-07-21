# 🦊 Stack Base - Fullstack Monorepo Template

Template monorepo completo e modular projetado para desenvolvimento rápido, escala horizontal em produção e tolerância a falhas.

---

## 🏗️ Estrutura de Pastas

O repositório é organizado no modelo lado a lado:

```text
stack-base/
├── 📁 backend/             # Infraestrutura Docker, Fastify Multi-APIs e TS Workers
├── 📁 frontend/            # Aplicação Next.js (App Router, Tailwind CSS, pronta para Vercel)
└── 📁 .agents/             # Documentação de arquitetura do sistema e premissas
```

---

## 🛠️ Stack Tecnológica

### Backend (`/backend`)
* **Framework Web:** Fastify API com arquitetura **Multi-API** (`src/apis/core`, `src/apis/admin`, etc.).
* **WebSockets:** Socket.io (configurado com transport `websocket` estrito para escala sem *sticky sessions*).
* **Autenticação:** Supabase Auth (GoTrue v2.x) gerenciando usuários e tokens JWT.
* **API REST Automática:** PostgREST v12+ expondo tabelas do PostgreSQL com **Row-Level Security (RLS)**.
* **Mensageria:** RabbitMQ v3.12 (configurado com **Quorum Queues** e Dead Letter Queue para alta disponibilidade).
* **Workers Assíncronos:** TS Workers para processamento em segundo plano (`src/workers/`).
* **Banco de Dados & Migrações:** PostgreSQL 16 e **Dbmate** para migrações SQL puras.
* **Proxy Reverso:** Nginx Proxy de borda leve.
* **Exposição Externa:** Cloudflare Tunnel (`cloudflared`) integrado.

### Frontend (`/frontend`)
* **Framework:** Next.js (App Router, TypeScript, Tailwind CSS, ESLint).
* **Deploy:** Independente e otimizado para a Vercel.

---

## 🚀 Como Iniciar em Desenvolvimento

### 1. Iniciar o Backend no Docker
```bash
cd backend
docker compose up -d
```

### 2. Iniciar o Frontend Next.js
```bash
cd frontend
npm run dev
```

### 3. URLs do Ambiente Local
* **Gateway Unificado (Nginx):** `http://localhost:8000`
  * **Core API Health:** `http://localhost:8000/v1/health`
  * **Auth GoTrue:** `http://localhost:8000/auth/v1/`
  * **PostgREST:** `http://localhost:8000/rest/v1/`
* **Painel RabbitMQ Management:** `http://localhost:15672` (User: `guest` / Pass: `guest`)
* **Frontend Next.js:** `http://localhost:3000`

---

## 📚 Documentação Adicional

* 📖 **[Arquitetura Detalhada da Stack](file:///.agents/stack_architecture.md):** Especificações de rede, portas, comportamentos de escala e guia passo a passo para criar novas APIs e Workers.
* 🛠️ **[Guia do Backend](file:///backend/README.md):** Manual técnico rápido do módulo backend.
