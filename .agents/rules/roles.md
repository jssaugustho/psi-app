# Regras de Autorização e Papéis (RBAC) do Tenant

Este documento especifica a matriz de permissões e as regras de controle de acesso baseado em papéis (RBAC) para os usuários integrados ao Tenant.

---

## 👥 Papéis do Sistema (Tenant Roles)

### 1. 🔑 Admin
* **Identificador no Banco**: `admin`
* **Descrição**: Administrador geral da clínica/tenant.
* **Permissões**:
  - Acesso total de leitura e escrita a todas as tabelas e recursos do tenant.
  - Gerenciamento de equipe e membros (adicionar/remover/alterar papéis).
  - Alteração de configurações gerais do tenant (cores, logo, integrações, faturamento).
  - Acesso irrestrito a faturamento, CRM, prontuários e logs.

### 2. 📝 Secretária(o)
* **Identificador no Banco**: `secretaria`
* **Descrição**: Apoio administrativo e operacional do CRM/Acolhimento.
* **Permissões**:
  - **Acolhimento (CRM)**: Visualizar, criar, atualizar e mover leads no funil do CRM.
  - **Formulários e Contratos**: Conduzir o acolhimento até o envio do formulário de contrato.
    - *Regra Futura*: A aceitação do contrato pelo paciente deve disparar a criação automática de um prontuário vinculado a um psicólogo.
  - **Financeiro**: Acesso total a painéis financeiros e faturamento (a ser desenvolvido).
  - **Bloqueio Clínico (Restrição Crítica)**: **NÃO** deve ter acesso a dados clínicos sensíveis, sessões de prontuários ou anotações confidenciais dos psicólogos.

### 3. 🧠 Psicólogo
* **Identificador no Banco**: `psicologo` (ou `agent` com perfil especializado)
* **Descrição**: Profissionais clínicos responsáveis pelos atendimentos.
* **Permissões**:
  - Herda todas as permissões visuais e operacionais de `secretaria` (acesso a leads no CRM, formulários e financeiro básico).
  - **Acesso Clínico**: Acesso de leitura e escrita apenas para prontuários, anotações de evolução e dados clínicos dos pacientes que:
    1. Foram criados/cadastrados pelo próprio psicólogo.
    2. Tiveram o acesso expressamente atribuído a ele (designação de caso).
  - **Bloqueio de Configuração**: Não pode alterar dados administrativos ou configurações de marca e membros do Tenant.

---

## 🛠️ Diretrizes de Implementação no Código

### Frontend (Controle de Menus e Abas)
* Verificar a role do membro no tenant através de `selectedTenant.memberRole` ou no objeto `user.role` (caso seja admin global).
* Ocultar opções administrativas no menu (ex: Configurações, Equipe) para os papéis `secretaria` e `psicologo`.
* Exibir/Ocultar abas clínicas (prontuários e anotações sensíveis) na ficha do paciente se a role for menor que `psicologo`.

### Backend (Políticas RLS - Row Level Security)
* As tabelas clínicas (ex: `clinical_records`, `prontuarios`) devem possuir políticas de RLS que restrinjam a leitura/escrita com base no papel do usuário autenticado no tenant:
  ```sql
  -- Apenas psicólogos atribuídos ou admins podem ler prontuários
  CREATE POLICY "Psicologos podem ler seus prontuarios" ON public.prontuarios
    FOR SELECT TO authenticated
    USING (
      auth.uid() = psicologo_id OR 
      EXISTS (
        SELECT 1 FROM public.tenant_members 
        WHERE user_id = auth.uid() AND tenant_id = prontuarios.tenant_id AND role = 'admin'
      )
    );
  ```
