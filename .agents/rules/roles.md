# Regras de Autorização e Papéis (RBAC) do Workspace

Este documento especifica a matriz de permissões e as regras de controle de acesso baseado em papéis (`workspace_members`) para os usuários integrados ao Workspace.

---

## 👥 Papéis do Sistema (Workspace Roles)

### 1. 🔑 Owner / Admin (`owner` / `admin`)
* **Identificador no Banco**: `owner` ou `admin`
* **Descrição**: Proprietário ou administrador geral do consultório/workspace.
* **Permissões**:
  - Acesso total de leitura e escrita a todas as tabelas e recursos do workspace.
  - Gerenciamento de equipe e membros (adicionar, remover e convidar novos colaboradores).
  - Alteração de configurações gerais do workspace (paleta de cores, logotipos, domínio próprio, integrações e faturamento).
  - Acesso irrestrito a CRM, leads, histórico de interações e métricas.

### 2. 📝 Secretária(o) (`secretaria`)
* **Identificador no Banco**: `secretaria`
* **Descrição**: Apoio administrativo e operacional do CRM e acolhimento de pacientes.
* **Permissões**:
  - **Acolhimento (CRM)**: Visualizar, criar, atualizar e mover leads nas colunas do funil do CRM.
  - **Formulários e Triagens**: Gerenciar respostas de formulários de triagem e termos de consentimento.
  - **Bloqueio Clínico (Restrição Crítica)**: **NÃO** deve ter acesso a anotações clínicas confidenciais ou relatórios sigilosos de prontuários.

### 3. 🧠 Psicólogo (`psicologo`)
* **Identificador no Banco**: `psicologo`
* **Descrição**: Profissionais clínicos responsáveis pelos atendimentos.
* **Permissões**:
  - Acesso a pacientes vinculados e atribuição de atendimentos.
  - **Acesso Clínico**: Acesso exclusivo de leitura e escrita a anotações de evolução e histórico dos seus pacientes.
  - **Bloqueio de Configuração**: Não pode alterar marca visual ou domínios da clínica.

---

## 🛡️ Preparação para RBAC Futuro (Future-Proof Access Control)

Para suportar futuramente permissões refinadas por recurso sem necessidade de migrações arriscadas em produção:
1. A tabela `workspace_members` contém o campo **`permissions: jsonb`**.
2. Exemplo de estrutura do campo `permissions`:
```json
{
  "crm": ["read", "write", "move_cards"],
  "forms": ["read", "create"],
  "billing": ["none"],
  "settings": ["none"]
}
```
3. O token JWT ou a consulta à API lê as permissões do campo `permissions` para autorizações granulares.
