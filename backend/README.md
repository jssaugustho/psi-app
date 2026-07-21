# 🦊 Foxbase Backend Stack Base

Template base de backend em TypeScript containerizado com Docker, unificando Fastify APIs (estrutura multi-API), TS Workers, RabbitMQ (Quorum Queues), PostgREST, GoTrue (Supabase Auth), PostgreSQL com RLS e Nginx Proxy.

---

## 🛠️ Serviços & Exposição

| Serviço | Container | Porta Exposta (Host) | Endereço Interno | Função |
| :--- | :--- | :--- | :--- | :--- |
| **Nginx Proxy** | `foxbase-nginx` | `8000` | `http://nginx:80` | Proxy Reverso e Gateway único. |
| **Fastify Core API** | `foxbase-api` | `5000` | `http://api:5000` | HTTP API & WebSockets (Socket.io). Exposto no Nginx em `/v1/*`. |
| **GoTrue (Auth)** | `foxbase-gotrue` | - | `http://gotrue:9999` | Supabase Auth (Sign up, login, JWT). Exposto no Nginx em `/auth/v1/*`. |
| **PostgREST** | `foxbase-postgrest` | - | `http://postgrest:3000` | API REST automática via RLS Postgres. Exposto no Nginx em `/rest/v1/*`. |
| **PostgreSQL** | `foxbase-postgres` | `5432` | `postgres:5432` | Banco relacional e motor RLS (`public` e `auth` schemas). |
| **RabbitMQ** | `foxbase-rabbitmq` | `5672` / `15672` (Web UI) | `rabbitmq:5672` | Broker AMQP com Quorum Queues e Fanout Realtime. |
| **TS Workers** | `foxbase-workers` | - | - | Consumidor de filas assíncronas em segundo plano. |
| **Dbmate** | `foxbase-dbmate` | - | - | Executa migrações SQL na pasta `db/migrations/`. |
| **Cloudflare Tunnel**| `foxbase-tunnel` | - | - | Exposição pública criptografada apontando para `http://nginx:80`. |

---

## 📂 Estrutura de Pastas Multi-API (`src/apis/`)

As APIs são organizadas de forma modular em `src/apis/`:
* `src/apis/core/server.ts`: API Principal (Core API).
* `src/apis/<nova-api>/server.ts`: Novas APIs (ex: `admin`, `billing`, `webhooks`).

---

## 🔀 Como Adicionar uma Nova API (Passo a Passo)

1. Crie a pasta `src/apis/admin/` e o arquivo `server.ts`.
2. Adicione no `package.json`: `"dev:api-admin": "ts-node-dev --respawn --transpile-only src/apis/admin/server.ts"`.
3. Adicione o serviço `admin-api` no `docker-compose.yml` especificando uma porta única (ex: `5001`).
4. Adicione a rota no `.docker/nginx/nginx.conf`:
   ```nginx
   location /admin/v1/ {
       proxy_pass http://admin-api:5001/;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

---

## 🚀 Como Desenvolver

### Iniciar o Backend no Docker
```bash
docker compose up -d
```

### Compilar TypeScript Localmente
```bash
npm run build
```

### Criar Novas Migrações de Banco
Crie um novo arquivo em `db/migrations/YYYYMMDDHHMMSS_sua_migracao.sql`:
```sql
-- migrate:up
CREATE TABLE public.exemplo (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    title TEXT NOT NULL
);
ALTER TABLE public.exemplo ENABLE ROW LEVEL SECURITY;

-- migrate:down
DROP TABLE IF EXISTS public.exemplo;
```
