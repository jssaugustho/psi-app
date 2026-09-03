# ⚙️ Core Rule 03: Async Processing, Unified Logging & Observability Standards

> **Scope**: Sistema de logs centralizado (`logs` table), fila unificada AMQP Quorum Queue (`system.logs`), workers assíncronos, rastreabilidade de requisições (`requestId` / `traceId`), observabilidade da jornada do usuário, resiliência contra falhas de FK, suporte a Dead-Letter Queue (DLQ) e streaming em tempo real via WebSockets.

---

## 🏛️ 1. Arquitetura do Sistema de Logs (PSI-APP)

O sistema de observabilidade do PSI-APP adota um modelo **100% assíncrono e não-bloqueante**. Nenhuma rota HTTP ou ação de negócio aguarda gravações no banco de dados para salvar logs de diagnóstico ou auditoria.

```
 [Cliente / HTTP API / Workers]
               │
               ▼ (Função Universal log())
 ┌──────────────────────────────────────────────┐
 │ 1. Enfileiramento Assíncrono                 │
 │    (Com Buffer FIFO em Memória para Quedas)  │
 └─────────────────────┬────────────────────────┘
                       │
                       ▼
         [RabbitMQ Queue: system.logs]
                       │
                       ▼ (Worker Consumidor Assíncrono)
 ┌──────────────────────────────────────────────┐
 │ 2. Sanitização & Persistência                │
 │    (Inserção na Tabela `logs` no PostgreSQL) │
 └─────────────────────┬────────────────────────┘
                       │
                       ▼ (Apenas Pós-Sucesso no Banco)
 ┌──────────────────────────────────────────────┐
 │ 3. Broadcast Realtime WebSocket              │
 │    (Publica em `realtime.broadcast`)         │
 └─────────────────────┬────────────────────────┘
                       │
                       ▼
      [WebSocket Room: platform:admin_logs]
```

---

## 🚫 2. Regra de Ouro: ZERO DB NO PATH CRÍTICO HTTP

### ❌ NUNCA execute inserções diretas no banco de dados para salvar logs dentro de rotas HTTP
```typescript
// ❌ INCORRETO: Inserção direta bloqueia a resposta HTTP e sobrecarrega o PostgreSQL
fastify.setErrorHandler(async (error, req, reply) => {
  await db.insert(logs).values({ message: error.message, stack: error.stack });
  reply.status(500).send({ error: 'Internal Server Error' });
});
```

### ✅ SEMPRE use a função unificada `log()` de `src/shared/queue.ts`
> ⚠️ **ATENÇÃO**: As funções legadas `publishAuditLog` e `publishErrorLog` foram **100% removidas**. Use exclusivamente a função `log()` para todas as operações de log, erro e auditoria.

```typescript
// ✅ CORRETO: Função universal de log com nome explícito e classificação automática de erro
import { log } from '../../shared/queue';

fastify.setErrorHandler(async (error, req, reply) => {
  log({
    name: 'api.global_error',
    type: 'error',
    severity: 'error',
    message: error.message || 'Erro interno na API',
    stack: error.stack,
    url: req.url,
    userAgent: req.headers['user-agent'] || null,
    userId: req.user?.userId || null,
    workspaceId: req.user?.workspaceId || null,
    sessionId: req.user?.sessionId || null,
    serviceName: 'core-api',
    metadata: {
      requestId: req.id, // Traceability ID da requisição
      method: req.method,
      statusCode: error.statusCode || 500
    }
  });

  reply.status(500).send({ error: 'Internal Server Error' });
});
```

---

## 📊 3. Matriz de Aplicação: Quando e Como Utilizar os Logs

Para manter a observabilidade clara em produção e evitar poluição de dados, siga a matriz de severidade e tipos de logs:

| Categoria (`type`) | Severidades Permitidas | Quando Deve Ser Utilizado | Exemplos de Uso |
| :--- | :--- | :--- | :--- |
| **`error`** | `error`, `fatal` | Exceções de runtime, falhas em rotas HTTP, erros de sintaxe, falhas de DB, erros de parsing de JSON. | Erro no `fastify.setErrorHandler`, exceção não capturada em worker, falha de conexão com Cloudflare R2 ou Resend. |
| **`http`** | `info`, `warning`, `error` | Log de acesso HTTP registrado automaticamente pelo middleware `onResponse` do Fastify. | `GET /v1/platform/workspaces 200 - 15ms`, `POST /v1/auth/login 401 - 32ms`. |
| **`audit`** | `info`, `warning` | Ações sensíveis que alteram permissões, acessos, dados financeiros ou controle de acesso. | `auth.login`, `auth.password_reset`, `workspace.created`, `workspace.deleted`, `user.role_changed`. |
| **`info`** | `info` | Eventos relevantes de sucesso do ciclo de vida das tarefas e ações do usuário. | E-mail transacional enviado com sucesso, página do site publicada, lead capturado no CRM, formulário de triagem enviado. |
| **`warn`** | `warning` | Condições anômalas que não quebraram a requisição, mas exigem atenção do operador. | Retentativa de consumo em fila, rate limit próximo de estourar, uso de heap memory > 85%, IP suspeito bloqueado. |
| **`system`** | `info`, `debug` | Batimentos de saúde (heartbeats), rotação de chaves e eventos de infraestrutura. | Worker heartbeat (`system.status`), notificação de reload no PostgREST, inicialização de queues no RabbitMQ. |
| **`dlq`** | `warning` | Mensagens recuperadas da Dead-Letter Queue que falharam no consumo original. | Consumidor de `messages.dlq` resgatando payloads com erros irrecuperáveis. |

---

## 🔍 4. Boas Práticas de Observabilidade & Rastreabilidade (`requestId` + `userId` + `sessionId`)

### A) Propagação e Captura Sintática na API HTTP
Toda requisição HTTP que chega à API passa obrigatoriamente pelos hooks globais do Fastify em [server.ts](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/backend/src/apis/core/server.ts):

1. **`onRequest` Hook**:
   - Injeta ou lê o header `X-Request-ID`. Se o cliente não enviou, gera um UUID sintático (`crypto.randomUUID()`).
   - Retorna o header `X-Request-ID` em 100% das respostas da API.
   - Decodifica o token JWT (se presente) usando `extractUserAndSessionFromToken(token)` e anexa `userId` e `sessionId` ao contexto da requisição.
2. **`onResponse` Hook (Global Access Logger)**:
   - Registra automaticamente o log de encerramento da requisição HTTP (`type: 'http'`), salvando a duração em ms, status HTTP, rota, `userId`, `sessionId` e `requestId`.

---

### B) Rastreabilidade de Ponta a Ponta em Filas & Workers (Correlation Tracing)
Para conseguir rastrear uma requisição completa desde o clique do usuário até a execução de um background worker, **SEMPRE repasse `requestId`, `userId` e `sessionId` no envelope da mensagem RabbitMQ**:

```typescript
// Na API HTTP ao publicar para uma fila de trabalho:
await publishToQueue('email.transactional', {
  to: 'cliente@exemplo.com',
  template: 'welcome',
  metadata: { requestId: req.raw.requestId, userId: req.raw.userId, sessionId: req.raw.sessionId }
});

// No Worker ao consumir a mensagem:
log({
  type: 'info',
  serviceName: 'email-worker',
  message: `E-mail de boas-vindas enviado para cliente@exemplo.com`,
  userId: payload.metadata?.userId,
  sessionId: payload.metadata?.sessionId,
  metadata: { requestId: payload.metadata?.requestId, attempts: 1 }
});
```

> 💡 **Benefício do Tracing Duplo (`userId` + `sessionId`)**:
> - **`userId` (QUEM)**: Retorna todas as ações do usuário *Dr. Carlos*.
> - **`sessionId` (QUAL DISPOSITIVO/SESSÃO)**: Se o Dr. Carlos tiver 2 conexões ativas (Celular e Notebook), o `sessionId` isola **exatamente a sessão/dispositivo** onde ocorreu um evento ou erro.

---

## 🏛️ 5. Tabela Unificada no Banco de Dados (`public.logs`)

| Coluna | Tipo | Nullable | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `NO` | Identificador único (`defaultRandom()`) |
| `type` | `text` | `NO` | Categoria do log (`'error'`, `'http'`, `'audit'`, `'info'`, `'system'`, `'warn'`, `'dlq'`) |
| `name` | `text` | `YES` | Nome legível do erro ou ação (ex: `'auth.login_failed'`, `'captacao.lead_captured'`) |
| `message` | `text` | `NO` | Mensagem descritiva em linguagem natural detalhando o que aconteceu, o recurso afetado e o motivo |
| `stack` | `text` | `YES` | Stacktrace detalhada em caso de exceções (Caixa preta de código com botão de cópia no Admin) |
| `url` | `text` | `YES` | URL completa do navegador no cliente (`X-Client-Url` / `Referer`) ou rota HTTP |
| `client_app` | `text` | `YES` | Aplicação de origem (`'admin'`, `'web'`, `'sites'`, `'core-api'`, `'workers'`, `'unknown'`) |
| `user_role` | `text` | `YES` | Papel do usuário (`'admin'`, `'psychologist'`, `'collaborator'`, `'anon'`) |
| `user_agent` | `text` | `YES` | User Agent do navegador do cliente |
| `user_id` | `uuid` | `YES` | FK para `profiles.id` (QUEM realizou a ação; `null` se visitante) |
| `session_id` | `uuid` | `YES` | Identificador da Sessão Autenticada Ativa no GoTrue (`sid` / `session_id`) |
| `workspace_id` | `uuid` | `YES` | FK para `workspaces.id` (`null` para eventos globais) |
| `service_name` | `text` | `NO` | Serviço gerador (`'core-api'`, `'workers'`, `'postgres'`, `'gotrue'`, `'postgrest'`) |
| `severity` | `text` | `NO` | Severidade (`'error'`, `'warning'`, `'fatal'`, `'info'`, `'debug'`) |
| `metadata` | `jsonb` | `YES` | Objeto JSON contendo `requestId`, `workerName`, IP, duração e parâmetros de negócio |
| `created_at` | `timestamptz` | `NO` | Data e hora exatas do evento (`defaultNow()`) |

---

## 🛡️ 6. Resiliência Total contra Perda de Logs

1. **Buffer em Memória FIFO (RabbitMQ Offline)**:
   - Se o RabbitMQ estiver inacessível, a função `log()` armazena as mensagens em um buffer em RAM (limite de 1.000 itens).
   - Um timer em background tenta descarregar o buffer a cada 5 segundos assim que a conexão é restaurada.
2. **Higienização de UUID (`isValidUuid`)**:
   - IDs inválidos (ex: `"system"`) são limpos e movidos para `metadata.unlinkedUserId`.
3. **Fallback de FK no Worker**:
   - Se um `userId` ou `workspaceId` não existir nas tabelas de referência, o worker realiza um fallback inserindo com `userId: null` e retém o ID em `metadata`, evitando rejeição da mensagem.
4. **Recuperação de DLQ (`messages.dlq`)**:
   - Mensagens descartadas na fila original são resgatadas pela DLQ e gravadas na tabela `logs` com `type: 'dlq'`.

---

## 📡 7. Transmissão Realtime Global via WebSockets & Dispatcher (Desacoplado em 2 Workers)

Toda a comunicação em tempo real e presença da plataforma utiliza **dois trabalhadores especializados desacoplados** e **Micro-Batching (Lotes em 50ms)**:

```
[Navegadores / Sockets]
       │ (1. Sinais de conexão: pulse, subscribe, leave)
       ▼
 [Fila RabbitMQ: presence.events]
       │ (2. Processado exclusivamente pela Engine de Presença)
       ▼
┌─────────────────────────────────────────────────────────────┐
│ WORKER 1: PRESENCE ENGINE (`presenceConsumer.ts`)           │
│  - Controla máquina de estado da presença (Map em memória)  │
│  - Aplica Grace Period de 3s em eventos de 'leave'          │
│  - Pruning automático de inatividade (25s)                  │
│  - Gera evento calculado: { entity: 'presence', action: 'list' }│
└──────────────┬──────────────────────────────────────────────┘
               │ (3. Envia o snapshot calculado)
               │
[Outros Serviços (CRM, Forms, Logs, pg_notify)] 
               │ (4. Publicam eventos brutos de negócio)
               ▼
 [Fila RabbitMQ: realtime.events]
               │ (5. Consumido pelo Dispatcher Genérico)
               ▼
┌─────────────────────────────────────────────────────────────┐
│ WORKER 2: REALTIME BATCH DISPATCHER (`realtimeConsumer.ts`) │
│  - 100% GENÉRICO (Sem código específico de presença/CRM)    │
│  - Micro-Batching: Agrupa eventos em janelas de 50ms        │
│  - Publica lotes em 'realtime.broadcast' (Fanout Exchange)  │
└──────────────┬──────────────────────────────────────────────┘
               │ (6. Transmissão para todas as instâncias da API)
               ▼
┌─────────────────────────────────────────────────────────────┐
│ INSTÂNCIAS DA CORE API (Fastify + Socket.io)                │
│  - Roteiam lotes recebidos para as salas:                   │
│    * `tenant:${tenantId}`                                   │
│    * `user:${userId}`                                       │
│    * `platform:admin_logs`                                  │
└─────────────────────────────────────────────────────────────┘
```

### 🔹 Princípios e Regras da Arquitetura:
1. **Engine de Presença (`presenceConsumer.ts`)**:
   - Consome a fila `presence.events`.
   - Controla a máquina de estados da presença, o Grace Period (3s) em reloads e expurgo por inatividade (25s).
   - Quando a presença muda, envia a lista consolidada para a fila `realtime.events`.
2. **Dispatcher Realtime Genérico (`realtimeConsumer.ts`)**:
   - Consome a fila `realtime.events`.
   - Isento de regras de negócio, atua puramente como um empacotador de alta performance com Micro-Batching de 50ms.
3. **Escala Multisservidor**:
   - O Exchange Fanout `realtime.broadcast` repassa os lotes para 100% das instâncias da API Core sem necessidade de sticky sessions.

### 📊 Matriz de Filas no RabbitMQ

| Nome da Fila | Routing Key | Consumidor (Worker) | Finalidade |
| :--- | :--- | :--- | :--- |
| **`presence.events`** | `presence.events` | `presenceConsumer.ts` | Processa sinais brutos de presença e mantém a máquina de estado (Grace Period). |
| **`realtime.events`** | `realtime.events` | `realtimeConsumer.ts` | Fila global de transmissão. Agrupa mensagens em lotes de 50ms. |
| **`realtime.broadcast`** (Exchange Fanout) | N/A | Instâncias da `core-api` | Transmite os lotes processados para todas as instâncias da API via WebSockets. |



