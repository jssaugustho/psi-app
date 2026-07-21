# 🗺️ Documentação da Arquitetura e Guia do Template Base

Este documento descreve detalhadamente a infraestrutura, a finalidade de cada serviço, suas portas de exposição, comportamentos esperados, garantias de escalabilidade, **suporte a múltiplas APIs (arquitetura modular)** e instruções práticas de uso.

---

## 🏗️ Desenho Físico da Infraestrutura

O **Nginx Proxy** centraliza todo o tráfego de entrada público no backend (portas 80/8000 ou via Cloudflare Tunnel). Todos os demais serviços rodam isolados dentro de uma rede Docker interna compartilhada (`foxbase-network`).

```text
                           [ INTERNET / CLOUDFLARE ]
                                      │
                               (Porta 8000 / 80)
                                      │
                                      ▼
                             [ 🟢 Nginx Proxy ]
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │ (Rotas HTTP /auth/v1/*)      │ (Rotas HTTP & WS /v1/*)      │ (Rotas HTTP /rest/v1/*)
       ▼                              ▼                              ▼
[ 🔑 GoTrue Auth ]             [ ⚡ Fastify APIs ]            [ 📝 PostgREST ]
       │                        (Core, Admin, etc.)                  │
       │ (Auth Schema)                │ (Ações / WS Realtime)        │ (Leitura & Escrita RLS)
       ▼                              ▼                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    [ 🐘 PostgreSQL (Docker) ]                      │
└────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ (Consome e atualiza status)
                              [ ⚙️ TS Workers ]
                                      ▲
                                      │ (Consome / Publica Quorum Queues)
                            [ 🐇 RabbitMQ Broker ]
```

---

## 🛠️ Detalhamento dos Serviços da Stack

### 1. 🟢 Nginx Proxy (Serviço: `nginx`)
* **Finalidade:** Gateway de borda leve e proxy reverso centralizado.
* **Exposição:** Porta `8000` pública do host (redirecionada para a porta `80` interna do container).
* **Comportamento Esperado:**
  * Redireciona `/auth/v1/*` ➔ `http://gotrue:9999/`
  * Redireciona `/rest/v1/*` ➔ `http://postgrest:3000/`
  * Redireciona `/v1/*` ➔ `http://api:5000/` (Fastify Core API, com suporte a WebSockets).
* **Como Usar:** Toda requisição do frontend ou cliente externo deve ser feita na porta do Nginx (ex: `http://localhost:8000`).

---

### 2. 🔑 GoTrue / Supabase Auth (Serviço: `gotrue`)
* **Finalidade:** Gestão independente de usuários, cadastros, logins, recuperação de senhas e emissão de tokens JWT.
* **Exposição:** Apenas interno na rede Docker (`gotrue:9999`). Exposto externamente pelo Nginx em `http://localhost:8000/auth/v1/*`.
* **Comportamento Esperado:** Gerencia o schema `auth` do PostgreSQL. Emite tokens JWT assinados pelo `JWT_SECRET` contendo as claims do usuário (`sub`, `role`).
* **Como Usar:** Chamadas via cliente HTTP ou SDK Supabase enviando requisições para `/auth/v1/signup`, `/auth/v1/token`, etc.

---

### 3. 📝 PostgREST (Serviço: `postgrest`)
* **Finalidade:** API REST instantânea gerada automaticamente a partir do schema `public` do PostgreSQL.
* **Exposição:** Apenas interno na rede Docker (`postgrest:3000`). Exposto externamente pelo Nginx em `http://localhost:8000/rest/v1/*`.
* **Comportamento Esperado:** Converte chamadas HTTP em queries SQL altamente otimizadas, aplicando estritamente as políticas de Row-Level Security (RLS) baseadas no token JWT do cabeçalho `Authorization: Bearer <JWT>`.
* **Como Usar:** Fazer requisições HTTP diretamente para `/rest/v1/sua_tabela` para realizar CRUD sem escrever rotas manuais.

---

### 4. ⚡ Fastify APIs (Serviço: `api`, `admin-api`, etc.)
* **Finalidade:** Servidores HTTP para regras de negócio customizadas, receptores de webhooks e servidores de WebSockets (Socket.io).
* **Exposição:** Organizadas em pastas independentes sob `src/apis/` (ex: `src/apis/core`, `src/apis/admin`).
* **Comportamento Esperado:** Força o uso do transporte `websocket` no Socket.io (permitindo escala sem *sticky sessions*). Mantém consumidores internos na exchange `realtime.broadcast` do RabbitMQ para repassar mensagens aos clientes conectados.
* **Como Usar:** Adicione novas rotas em `src/apis/<sua-api>/routes/` e registre-as no servidor correspondente.

---

### 5. ⚙️ TS Workers (Serviço: `workers`)
* **Finalidade:** Processamento assíncrono e resiliente de tarefas pesadas em segundo plano.
* **Exposição:** Nenhuma porta HTTP exposta (atua estritamente como consumidor de filas).
* **Comportamento Esperado:** Inicializa no container executando `npm run dev:worker` (ou `node dist/workers/index.js` em prod). Conecta no RabbitMQ com `prefetch(1)` para concorrência justa.
* **Como Usar:** Adicione lógica de consumo de filas em `src/workers/` usando o helper `getChannel()` ou `assertQuorumQueue()` e registre a execução em `src/workers/index.ts`.

---

### 6. 🐘 PostgreSQL (Serviço: `postgres`)
* **Finalidade:** Banco de dados relacional e motor de segurança via Row-Level Security (RLS).
* **Exposição:** Porta `5432` pública do host (para depuração) e porta `5432` interna.
* **Comportamento Esperado:** Hospeda o schema de sistema `auth` e o schema de negócios `public`.
* **Como Usar:** As APIs e Workers se conectam via biblioteca `postgres` utilizando a variável `DATABASE_URL`. O tamanho do pool de conexões é parametrizado via `POSTGRES_POOL_SIZE`.

---

### 7. 📥 Dbmate (Serviço: `db-migrate`)
* **Finalidade:** Gerenciador de migrações de banco de dados SQL puras.
* **Exposição:** Container efêmero de uso interno.
* **Comportamento Esperado:** Executa automaticamente após a confirmação de saúde (`pg_isready`) do PostgreSQL. Aplica os scripts SQL da pasta `./db/migrations/` e encerra a execução.
* **Como Usar:** Crie arquivos versionados em `db/migrations/YYYYMMDDHHMMSS_nome_da_migracao.sql` contendo os blocos `-- migrate:up` e `-- migrate:down`.

---

### 8. 🐇 RabbitMQ Broker (Serviço: `rabbitmq`)
* **Finalidade:** Broker de mensageria assíncrona e desacoplamento de serviços.
* **Exposição:** Porta `5672` (protocolo AMQP) e porta `15672` (Painel Web Management).
* **Comportamento Esperado:** Gerencia a troca de mensagens utilizando Quorum Queues (`x-queue-type: quorum`) para permitir escala em cluster e replicação sem perda de dados, além de Dead Letter Queue (`foxbase.dlx`) e Fanout Exchange (`realtime.broadcast`).
* **Como Usar:** Importe e utilize as funções `publishToQueue(routingKey, payload)` ou `publishRealtime(payload)` disponíveis em `src/shared/queue.ts`.

---

### 9. ☁️ Cloudflare Tunnel (Serviço: `tunnel`)
* **Finalidade:** Exposição pública segura da aplicação para a internet via HTTPS sem necessidade de IP fixo.
* **Exposição:** Sem portas de entrada locais.
* **Comportamento Esperado:** Conecta-se à rede da Cloudflare e direciona as chamadas externas recebidas para o container do Nginx (`http://nginx:80`).
* **Como Usar:** Adicione o token do túnel na variável `TUNNEL_TOKEN` do arquivo `.env`.

---

## 📁 Estrutura Módulo-Multi-API (`backend/src/apis/`)

A estrutura do projeto foi desenhada nativamente em formato de **monorepo modular**. Todas as APIs vivem dentro de `src/apis/`:

```text
backend/
├── 📁 .docker/                       # Configurações de containers
│   └── 📁 nginx/
│       └── nginx.conf                # Roteamento do Nginx para cada API
├── 📁 db/
│   └── 📁 migrations/                # Migrações SQL puras (Dbmate)
├── 📁 src/                           # Código TypeScript da aplicação
│   ├── 📁 apis/                      # 👈 DIRETÓRIO MULTI-APIS
│   │   ├── 📁 core/                  # API Principal (Core API)
│   │   │   ├── server.ts
│   │   │   └── 📁 routes/
│   │   └── 📁 admin/                 # Exemplo de Segunda API (Admin, Billing, etc.)
│   │       ├── server.ts
│   │       └── 📁 routes/
│   ├── 📁 shared/                    # Código compartilhado entre todas as APIs e Workers
│   │   ├── db.ts
│   │   ├── queue.ts
│   │   └── types.ts
│   └── 📁 workers/                   # Consumidores de fila assíncronos
│       └── index.ts
├── Dockerfile                        # Dockerfile único para compilar todas as APIs
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## 🔀 Como Adicionar uma Nova API (Passo a Passo)

Caso seu projeto necessite de uma nova API (ex: `admin-api`, `billing-api`, `webhooks-api`), siga este procedimento em 4 passos:

### 1. Criar a pasta e servidor da nova API
Crie a pasta `src/apis/admin/` e o arquivo `server.ts` contendo as rotas da nova API (pode reutilizar `src/shared/db.ts` e `src/shared/queue.ts`).

### 2. Adicionar o script no `package.json`
```json
"scripts": {
  "start:api-admin": "node dist/apis/admin/server.js",
  "dev:api-admin": "ts-node-dev --respawn --transpile-only src/apis/admin/server.ts"
}
```

### 3. Declarar o novo serviço no `docker-compose.yml`
```yaml
  admin-api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: foxbase-admin-api
    depends_on:
      db-migrate:
        condition: service_completed_successfully
      rabbitmq:
        condition: service_healthy
    volumes:
      - .:/usr/src/app
      - /usr/src/app/node_modules
    environment:
      DATABASE_URL: "postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-foxbase_secure_pwd}@postgres:5432/${POSTGRES_DB:-postgres}?sslmode=disable"
      RABBITMQ_URL: "amqp://${RABBITMQ_DEFAULT_USER:-guest}:${RABBITMQ_DEFAULT_PASS:-guest}@rabbitmq:5672"
      JWT_SECRET: ${JWT_SECRET}
      PORT: 5001
      NODE_ENV: development
    command: npm run dev:api-admin
    ports:
      - "5001:5001"
    networks:
      - foxbase-network
```

### 4. Rotear a nova API no `.docker/nginx/nginx.conf`
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

## ⚡ Escala Horizontal e Tolerância a Falhas

1. **Sem Sticky Sessions:** O Socket.io usa o transporte estrito `websocket`, permitindo escalar a API Fastify para múltiplos nós sem erros de handshake.
2. **Quorum Queues:** As filas do RabbitMQ usam `x-queue-type: quorum`, permitindo expandir o RabbitMQ para um cluster de múltiplos nós em produção sem necessitar de recriação de filas.
3. **Gerenciamento de Pool de Conexões:** O Postgres usa a variável `POSTGRES_POOL_SIZE` no `db.ts` para prevenir a exaustão de conexões ao subir réplicas de API/Workers.

---

## 🚀 Como Iniciar

1. Instale as dependências locais: `npm install`
2. Compile o TypeScript para verificação: `npm run build`
3. Inicie o ecossistema Docker: `docker compose up -d`
4. Acesse os serviços:
   * **API Core / Gateway:** `http://localhost:8000/v1/health`
   * **RabbitMQ Management:** `http://localhost:15672` (Login: `guest` / `guest`)
