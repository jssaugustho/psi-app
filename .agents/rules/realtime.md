# 📘 Regras de Sincronização em Tempo Real (Realtime Rules)

Este documento estabelece as regras de desenvolvimento e padrões comportamentais do sistema para garantir sincronização em tempo real (realtime) resiliente, livre de conflitos e otimizada para múltiplos usuários simultâneos no Dashboard.

---

## 1. 📂 Protocolo de Mensagens Realtime

Todas as mensagens transitadas no WebSocket e na exchange `realtime.broadcast` do RabbitMQ devem seguir um formato unificado para facilitar o roteamento e a filtragem pelo frontend.

### Estrutura do Payload:
```json
{
  "entity": "lead",            // Recurso afetado: "lead", "member", "invoice", "presence"
  "action": "updated",         // Ação realizada: "created", "updated", "deleted", "presence_change"
  "tenantId": "uuid-do-tenant",// Obrigatório para isolamento e segurança
  "userId": "uuid-do-usuario",  // Opcional: nulo para broadcast geral do tenant, ou ID do usuário destino
  "data": {                    // Dados da entidade atualizada ou informações adicionais
    "id": "uuid-da-entidade",
    "..." : "..."
  }
}
```

---

## 2. 🔀 Resolução de Conflitos de Concorrência (Prevenção de Sobrescrita)

Quando duas secretárias ou usuários alteram o mesmo lead ou recurso simultaneamente, o sistema deve evitar que a alteração de uma atropele silenciosamente a da outra.

### Regras do Frontend:
1. **Atualizações Otimistas com Rollback**:
   - Ao mover um card de Kanban ou editar um valor, altere o estado local no frontend imediatamente (latência percebida zero).
   - Guarde uma cópia do estado anterior.
   - Caso a requisição HTTP (via PostgREST/API) falhe ou retorne timeout, desfaça a alteração local voltando para o estado original e mostre um alerta visual para o usuário.
2. **Estilo "Last Write Wins" com Alerta**:
   - Quando o frontend receber um evento WebSocket informando que o lead que o usuário está visualizando ou editando foi modificado por outra pessoa:
     - Se o usuário **não** estiver editando ativamente o lead: Atualize a interface silenciosamente.
     - Se o usuário **estiver** com o formulário de edição do lead aberto: Exiba um aviso no topo do formulário: `"Este lead foi atualizado por [Nome do Usuário] em tempo real. [Carregar Versão Mais Recente]"`.
3. **Bloqueio Otimista por Data de Atualização (`updated_at`)**:
   - As requisições de escrita (UPDATE) de dados sensíveis devem enviar o cabeçalho de comparação da última data de modificação (`updated_at`) conhecida pelo cliente.
   - Caso o registro no banco de dados já possua uma data superior, o banco ou a API deve retornar erro `409 Conflict`, disparando o rollback no frontend.

---

## 3. 👥 Gerenciamento de Presença (Usuários Online)

Para rastrear quem está ativo no mesmo Tenant:

### Regras do Fluxo de Presença:
1. **Autenticação e Registro**:
   - Ao estabelecer a conexão WebSocket, o frontend deve enviar o cabeçalho ou parâmetro de `auth` contendo o token JWT.
   - O servidor WebSocket (Fastify) valida o JWT, extrai o `userId` e o associa ao `socket.id`.
2. **Heartbeats de Presença**:
   - A cada 10 segundos, o frontend envia um ping leve de presença (`presence-heartbeat`) informando o `tenantId` e a página/recurso em que o usuário está navegando (ex: `/dashboard/crm`).
3. **Distribuição da Lista**:
   - O backend compila os usuários ativos no mesmo `tenantId` nos últimos 25 segundos e transmite a lista completa (`presence-list`) para todos os sockets conectados ao mesmo `tenantId`.
   - Se o usuário desconectar ou fechar a aba, ele é removido imediatamente da lista ativa e uma nova transmissão de presença é enviada.
