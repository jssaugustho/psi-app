# Arquitetura de Segurança em Camadas e Políticas RLS (Row Level Security)

Este documento especifica o desenho arquitetural da segurança em camadas do sistema, detalhando o fluxo de execução das requisições, a aplicação de **Row Level Security (RLS)** no PostgreSQL, o controle de papéis de dois níveis (Plataforma + Workspace) e a futura integração da camada de Billing e controle de inadimplência.

---

## 📐 1. Fluxo Geral da Arquitetura de Segurança em Camadas

O sistema aplica o princípio de **Defesa em Profundidade (Defense-in-Depth)**. Cada requisição passa sequencialmente por 3 camadas independentes de validação:

```mermaid
flowchart TD
    Client["Client Web / Admin / Mobile"] --> Gateway["Nginx API Gateway (:8000)"]
    
    subgraph Layer1["1ª CAMADA: Identidade & Autenticação (GoTrue & JWT)"]
        Gateway --> AuthCheck["Validação de Assinatura JWT (JWT_SECRET)"]
        AuthCheck --> ExtractClaims["Extração de Claims (auth.uid, role, email)"]
    end

    subgraph Layer2["2ª CAMADA: Autorização RBAC & RLS (PostgreSQL & Backend)"]
        ExtractClaims --> RLSCheck{"PostgreSQL RLS & Triggers"}
        RLSCheck -->|Plataforma| PlatformPolicy["is_platform_admin()"]
        RLSCheck -->|Workspace| WorkspacePolicy["is_workspace_member(ws_id)"]
        RLSCheck -->|Bloqueio de Role| TriggerCheck["trg_prevent_profile_role_elevation"]
    end

    subgraph Layer3["3ª CAMADA FUTURA: Controle Financeiro & Inadimplência (Billing)"]
        WorkspacePolicy --> BillingCheck{"Workspace Status (workspaces.subscription_status)"}
        BillingCheck -->|active / trialing| GrantAccess["Permissão de Leitura/Escrita Liberada"]
        BillingCheck -->|past_due / canceled| BlockWrite["Bloqueio de Ações (402 Payment Required / RLS Read-Only)"]
    end

    GrantAccess --> DB[("PostgreSQL Database")]
```

---

## 🛡️ 2. Desenho das Políticas de RLS por Tabela no PostgreSQL

### 2.1 Funções `SECURITY DEFINER` de Apoio
Para garantir alta performance sem loops de recursão nas políticas de RLS:

* **`public.is_platform_admin()`**:
  Checa se o usuário atual (`auth.uid()`) é Super Admin na tabela `profiles`.
* **`public.is_workspace_member(ws_id)`**:
  Checa se o usuário atual faz parte da tabela `workspace_members` para determinado workspace.
* **`public.is_workspace_admin(ws_id)`**:
  Checa se o usuário atual é o `owner_id` do workspace ou se é membro com `role = 'admin'` em `workspace_members`.

---

### 2.2 Matriz de RLS e Controle de Acesso por Tabela

```mermaid
graph LR
    subgraph SchemaPublic["Public Schema (PostgreSQL)"]
        Profiles["profiles"]
        Workspaces["workspaces"]
        Members["workspace_members"]
        CRM["contacts / interaction_history / pipeline_columns"]
        Sites["capture_pages / screening_forms / visual_identities"]
        Platform["platform_settings / email_logs / status_logs"]
    end

    subgraph Policies["Regras RLS Aplicadas"]
        P_Profiles["auth.uid() = id OR is_platform_admin() (Trigger bloqueia elevação de role)"]
        P_Workspaces["is_workspace_member(id) OR is_platform_admin()"]
        P_Members["is_workspace_member(workspace_id) OR is_platform_admin()"]
        P_CRM["is_workspace_member(workspace_id) OR is_platform_admin()"]
        P_Sites["SELECT Aberto (anon/auth) se ativo | INSERT/UPDATE por membros"]
        P_Platform["Restrito Apenas para is_platform_admin() / service_role"]
    end

    Profiles --> P_Profiles
    Workspaces --> P_Workspaces
    Members --> P_Members
    CRM --> P_CRM
    Sites --> P_Sites
    Platform --> P_Platform
```

---

## 🔐 3. Especificação das Políticas por Tabela

| Tabela | RLS Status | Política `SELECT` | Política `INSERT / UPDATE / DELETE` |
|---|---|---|---|
| **`profiles`** | ✅ Habilitado | Próprio usuário (`id = auth.uid()`), Super Admins ou membros do mesmo workspace. | **Update**: Próprio usuário ou Admin. **Trigger** impede alteração da coluna `role` por usuários comuns. |
| **`workspaces`** | ✅ Habilitado | Membros do workspace (`is_workspace_member(id)`) ou Super Admins. | Owner (`owner_id = auth.uid()`), Admins do workspace ou Super Admins. |
| **`workspace_members`** | ✅ Habilitado | Membros do mesmo workspace ou Super Admins. | Admins do workspace (`is_workspace_admin(ws_id)`) ou Super Admins. |
| **`workspace_domains`** | ✅ Habilitado | **Público (`anon`/`authenticated`)** para resolução de sites e DNS. | Admins do workspace ou Super Admins. |
| **`visual_identities`** | ✅ Habilitado | **Público (`anon`/`authenticated`)** para branding dos sites. | Membros do workspace ou Super Admins. |
| **`capture_pages`** | ✅ Habilitado | **Público (`anon`/`authenticated`)** se `is_active = true`. | Membros do workspace ou Super Admins. |
| **`screening_forms`** | ✅ Habilitado | **Público (`anon`/`authenticated`)** se `is_active = true`. | Membros do workspace ou Super Admins. |
| **`contacts`** | ✅ Habilitado | Membros do workspace. **Insert público (`anon`)** para geração de leads. | Membros do workspace. |
| **`interaction_history`** | ✅ Habilitado | Membros do workspace. | Membros do workspace. |
| **`pipeline_columns`** | ✅ Habilitado | Membros do workspace. | Membros do workspace. |
| **`media_assets`** | ✅ Habilitado | Membros do workspace. | Membros do workspace. |
| **`platform_settings`** | ✅ Habilitado | **Apenas Super Admin (`is_platform_admin()`)**. | Apenas Super Admin ou `service_role`. |
| **`email_logs`** | ✅ Habilitado | **Apenas Super Admin (`is_platform_admin()`)**. | Apenas Super Admin ou `service_role`. |
| **`system_status_logs`** | ✅ Habilitado | **Apenas Super Admin (`is_platform_admin()`)**. | Apenas Super Admin ou `service_role`. |

---

## 💳 4. Integração Futura: Camada Financeira (Billing & Inadimplência)

Quando a lógica de pagamentos (Stripe, Asaas, etc.) for integrada:

1. **Novo Campo na Tabela `workspaces`**:
   ```sql
   ALTER TABLE workspaces ADD COLUMN subscription_status text DEFAULT 'trialing' NOT NULL;
   -- Valores possíveis: 'trialing', 'active', 'past_due', 'canceled'
   ```

2. **Extensão RLS para Controle Financeiro**:
   As políticas de escrita (`INSERT`/`UPDATE`) em dados de CRM/Pacientes podem consultar o status do workspace:
   ```sql
   CREATE OR REPLACE FUNCTION public.is_workspace_active(ws_id uuid)
   RETURNS boolean AS $$
   BEGIN
     RETURN EXISTS (
       SELECT 1 FROM public.workspaces
       WHERE id = ws_id
         AND subscription_status IN ('active', 'trialing')
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
   ```

3. **Integração no Backend (Fastify API Middleware)**:
   * A API validará a 1ª camada (RBAC) e, em seguida, consultará o status da assinatura antes de processar ações que gerem custo ou escrita de novos registros.
