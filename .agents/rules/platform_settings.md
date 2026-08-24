# Regras de Configurações Globais da Plataforma (`platform_settings`) vs Isolamento por Workspace

Este documento estabelece as diretrizes arquiteturais para o gerenciamento de configurações da plataforma SaaS versus o isolamento de cada espaço de trabalho (`workspace`).

---

## 🏛️ 1. Separação Absoluta de Responsabilidades

### 1.1 Tabela `platform_settings` (Marca Global & Infraestrutura SaaS)
A tabela `platform_settings` é a **fonte única de verdade** para as configurações globais do software SaaS. Ela centraliza:
- **Marca da Plataforma (App Shell):** Nome oficial (`platform_name`), Logotipos (`logo_light_url`, `logo_dark_url`), Ícones (`icon_light_url`, `icon_dark_url`), Favicons, Título do Documento e Paleta de Cores base do SaaS.
- **Credenciais Globais de Infraestrutura:** Cloudflare (`api_token`, `zone_id`, `account_id`, `base_domain`), Armazenamento R2 (`r2_bucket_name`, `r2_public_domain`, `access_key_id`, `secret_access_key`, `backup_r2_buckets`), Resend (`resend_api_key`, `resend_from_domain`), Configuração de preços base e membros.

### 1.2 Tabela `workspaces` (Espaços de Trabalho / Consultórios / Clientes)
A tabela `workspaces` contém exclusivamente os dados referentes a cada consultório, clínica ou psicólogo individual:
- **NENHUM workspace possui papel "master", "primary" ou "workspace-pai".**
- Todos os registros na tabela `workspaces` são espaços de trabalho de usuários em igualdade estrutural.
- Cada workspace gerencia seus próprios dados clínicos, pacientes, CRM, páginas de captação e sua própria identidade visual (armazenada de forma limpa na tabela relacional `visual_identities`).

---

## 🚫 2. Proibição Estrita da Lógica de Workspace-Pai (`is_primary`)

> [!CAUTION]
> **DIRETRIZ OBRIGATÓRIA PARA DESENVOLVEDORES E AGENTES DE IA:**
> 1. **Proibido criar/manter a coluna `is_primary` ou `primary_workspace_id`**: Não adicione seletores, flags ou relacionamentos que tentem elevar um `workspace` a principal da plataforma.
> 2. **Sem Vazamento de Branding de Workspaces**: A interface da plataforma/dashboard (`apps/admin` e `apps/web`) consome o tema global de `platform_settings`.
> 3. **Consumo via Rotas da Plataforma**: Sempre consuma a marca da plataforma via rotas `/v1/platform/brand` ou `/v1/platform/settings`. Nunca faça queries diretas em `workspaces` tentando localizar um "workspace pai".

---

## 🎨 3. Fluxo Obrigatório de Resolução da Identidade Visual

Ao carregar a identidade visual de um workspace no front-end, utilize exclusivamente o utilitário `getWorkspaceVisualIdentity(workspace)`, que consulta a relação com a tabela `visual_identities`:

```
1. Identidade Visual do Workspace (tabela visual_identities via API)
   └─► (Se não encontrar)
2. Cores da Plataforma (tabela platform_settings)
   └─► (Se offline ou indisponível)
3. Tema Padrão em Tons Neutros (#7C3AED / #A855F7)
```
