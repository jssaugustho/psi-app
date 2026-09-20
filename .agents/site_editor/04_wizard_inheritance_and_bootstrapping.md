# 🪄 Herança do Wizard, Bootstrapping & Identidade Visual

> **Scope**: Arquitetura de captura de dados no Wizard de Boas-Vindas, bootstrapping atômico do workspace via RPC, interpolação dinâmica de variáveis (`{{psychologist_name}}`, `{{crp}}`) e binding de variáveis CSS do tema.

---

## 1. Scope & Triggers

Leia este arquivo quando trabalhar em:
- Wizard de criação de site/workspace (`frontend/apps/web/src/app/onboarding/`)
- Inicialização de novos profissionais e workspaces (`bootstrap_workspace` RPC)
- Substituição dinâmica de variáveis de texto no canvas
- Identidade visual, temas e variáveis CSS de cores (`--brand-gradient-start`, `--brand-contrast-color`)

---

## 2. Inviolable Directives (ALWAYS / NEVER)

1. **ALWAYS interpolate professional dynamic variables at render time**:
   - As propriedades de texto dos elementos do editor não devem conter nomes fixos gravados no banco se forem dados cadastrais do profissional.
   - Textos como `"Dra. {{psychologist_name}} - CRP {{crp}}"` devem ser dinamicamente interpolados no carregamento da página ou renderização do canvas usando os dados do perfil do psicólogo.
2. **ALWAYS initialize workspace defaults via atomic RPC**:
   - A criação do workspace, perfil do profissional, formulário padrão de captura e a primeira página de captura (`capture_page`) com o template inicial do site deve ser executada em uma **única transação PostgreSQL atômica** via a RPC `bootstrap_workspace`.
3. **ALWAYS bind brand colors to global CSS variables**:
   - As cores primárias, secundárias e fundos escolhidos pelo profissional no Wizard devem alimentar as variáveis CSS Globais da página:
     - `var(--brand-gradient-start)`
     - `var(--brand-gradient-end)`
     - `var(--brand-contrast-color)`
     - `var(--site-bg)`
   - **NEVER** atribuir cores hexadecimais fixas nos seletores de elementos quando a intenção for utilizar a cor da identidade visual do psicólogo. Utilize sempre as variáveis do tema.

---

## 3. Fluxo do Wizard ao Editor Visual

```mermaid
graph TD
    W1["Wizard Passo 1: Dados Pessoais (Nome, CRP, Foto)"] --> W2
    W2["Wizard Passo 2: Contato & Atendimento (WhatsApp, Cidade, Valor)"] --> W3
    W3["Wizard Passo 3: Identidade Visual (Paleta & Fontes)"] --> W4
    W4["Wizard Passo 4: Seleção do Template de Página"] --> RPC

    RPC["POST /rpc/bootstrap_workspace"] -->|Transação Atômica DB| DB

    DB -->|Cria Workspace| T1["public.workspaces"]
    DB -->|Cria Perfil Psicólogo| T2["public.psychologist_profiles"]
    DB -->|Cria Form Padrão| T3["public.forms"]
    DB -->|Cria Página Inicial com Template| T4["public.capture_pages"]

    T4 --> EDITOR["Redireciona para /dashboard/captacao/[pageId]"]

    EDITOR --> INTERP["Interpolador de Variáveis (canvasHelpers / styleBuilder)"]
    INTERP -->|Substitui {{psychologist_name}}| CANVAS["Canvas Renderizado com Identidade Completa"]
```

---

## 4. Tabela de Variáveis Dinâmicas Suportadas

| Chave da Variável | Origem no Banco (`psychologist_profiles`) | Exemplo de Saída Interpolada |
|---|---|---|
| **`{{psychologist_name}}`** | `full_name` / `display_name` | `Dra. Ana Maria Souza` |
| **`{{crp}}`** | `crp_number` | `CRP 06/123456` |
| **`{{whatsapp}}`** | `phone_whatsapp` | `(11) 99999-8888` |
| **`{{city}}`** | `city` | `São Paulo - SP` |
| **`{{specialty}}`** | `specialties[0]` | `Terapia Cognitivo-Comportamental (TCC)` |
| **`{{bio}}`** | `bio_summary` | `Especialista em ansiedade, burnout e relacionamentos.` |

---

## 5. Implementação da RPC de Bootstrapping (`bootstrap_workspace`)

```sql
CREATE OR REPLACE FUNCTION public.bootstrap_workspace(
    p_user_id UUID,
    p_full_name VARCHAR,
    p_crp VARCHAR,
    p_whatsapp VARCHAR,
    p_city VARCHAR,
    p_primary_color VARCHAR DEFAULT '#4F46E5',
    p_secondary_color VARCHAR DEFAULT '#7C3AED',
    p_template_key VARCHAR DEFAULT 'default_clinic'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workspace_id UUID;
    v_page_id UUID;
    v_form_id UUID;
    v_initial_canvas JSONB;
BEGIN
    -- 1. Criar o Workspace do Psicólogo
    INSERT INTO public.workspaces (owner_id, name, created_at)
    VALUES (p_user_id, 'Consultório ' || p_full_name, NOW())
    RETURNING id INTO v_workspace_id;

    -- 2. Criar o Perfil do Profissional
    INSERT INTO public.psychologist_profiles (
        workspace_id, user_id, full_name, crp_number, phone_whatsapp, city
    ) VALUES (
        v_workspace_id, p_user_id, p_full_name, p_crp, p_whatsapp, p_city
    );

    -- 3. Criar o Formulário Padrão de Agendamento
    INSERT INTO public.forms (workspace_id, title, fields)
    VALUES (
        v_workspace_id,
        'Agendamento de Consulta',
        '[{"id": "name", "label": "Nome Completo", "type": "text", "required": true}, {"id": "phone", "label": "WhatsApp", "type": "phone", "required": true}]'::jsonb
    ) RETURNING id INTO v_form_id;

    -- 4. Injetar Template Inicial com Variáveis e Cores
    v_initial_canvas := public.get_default_page_template(p_template_key, v_form_id, p_primary_color, p_secondary_color);

    -- 5. Criar a Primeira Página de Captura (draft_data)
    INSERT INTO public.capture_pages (
        workspace_id, title, slug, subdomain, status, draft_data, canvas_data
    ) VALUES (
        v_workspace_id,
        'Página Principal',
        'home',
        lower(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g')),
        'draft',
        v_initial_canvas,
        v_initial_canvas
    ) RETURNING id INTO v_page_id;

    RETURN jsonb_build_object(
        'success', true,
        'workspace_id', v_workspace_id,
        'page_id', v_page_id
    );
END;
$$;
```

---

## 6. Anti-Patterns & Proibições

### ❌ Errado (Hardcodear Nome e CRP Fixo no JSON do Template)
```json
{
  "type": "heading",
  "props": {
    "text": "Dra. Juliana Silva - CRP 06/9999"
  }
}
```

### ✅ Correto (Uso de Variáveis Dinâmicas Interpoláveis)
```json
{
  "type": "heading",
  "props": {
    "text": "Dra. {{psychologist_name}} - CRP {{crp}}"
  }
}
```
