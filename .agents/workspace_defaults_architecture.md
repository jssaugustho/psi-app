# Arquitetura de Provisionamento Automático de Workspaces (Workspace Defaults)

Este documento detalha o funcionamento técnico da inicialização automática de novos Workspaces (consultórios/clínicas) criados na plataforma **psi-app**. 

---

## 1. Princípio Arquitetural (Database Triggers)

Para garantir que qualquer novo Workspace criado no sistema venha pré-configurado com as estruturas ideais (independente de ter sido criado via Admin Dashboard, signup flow, setup wizard ou scripts de backend), a plataforma delega o provisionamento de dados padrões diretamente para **Triggers no PostgreSQL**.

### Vantagens dessa abordagem:
1. **Transacionalidade e Consistência**: O setup padrão ocorre na mesma transação de criação do workspace. Se qualquer etapa falhar, ocorre rollback completo.
2. **Independência de Cliente/API**: Evita a necessidade de múltiplos requests HTTP sequenciais da API ou do Frontend (o que gerava problemas com políticas RLS ao tentar inserir registros filhos antes do usuário ser reconhecido como membro).
3. **Segurança (SECURITY DEFINER)**: Os triggers rodam sob o privilégio do superusuário do banco, ignorando temporariamente políticas de RLS e garantindo a inserção das tabelas filhas essenciais.

---

## 2. Triggers de Inicialização Ativos

Atualmente, existem dois triggers principais que agem na criação de um registro na tabela `workspaces`:

### A. Adicionar Criador como Administrador (`trg_auto_add_workspace_owner`)
* **Arquivo SQL:** `backend/drizzle/0003_workspace_owner_auto_member.sql`
* **Responsabilidade:** Adiciona automaticamente o usuário que criou o workspace (`owner_id`) como membro oficial da tabela `workspace_members` com a role `owner`.

### B. Inicializar Estrutura Padrão de CRM e Marca (`trg_auto_create_workspace_crm_defaults`)
* **Arquivo SQL:** `backend/drizzle/0005_workspace_crm_defaults.sql`
* **Responsabilidade:**
  1. Cria as colunas padrão no funil (Kanban) de psicologia clínica na tabela `pipeline_columns`.
  2. Cria uma identidade visual inicial na tabela `visual_identities` (marcada como `is_workspace_default = true`) para evitar falhas de carregamento de páginas públicas e portal.

---

## 3. Como Estender o Provisionamento Padrão

Se no futuro a plataforma precisar de novas tabelas pré-configuradas (como campos personalizados padrão, mensagens/templates de e-mail iniciais, formulários de triagem padrão), siga este procedimento de desenvolvimento:

### Passo 1: Atualizar a Função do Trigger SQL
Localize ou altere a função plpgsql `public.auto_create_workspace_crm_defaults()`. Por exemplo, para adicionar uma nova linha padrão na tabela `custom_field_definitions`:

```sql
CREATE OR REPLACE FUNCTION public.auto_create_workspace_crm_defaults()
RETURNS trigger AS $$
BEGIN
  -- [CÓDIGO DAS PIPELINE COLUMNS E VISUAL IDENTITIES AQUI]

  -- Exemplo de extensão: Inserir campos personalizados padrões
  INSERT INTO public.custom_field_definitions (workspace_id, key, name, type)
  VALUES 
    (NEW.id, 'queixa_principal', 'Queixa Principal', 'text'),
    (NEW.id, 'idade', 'Idade', 'number')
  ON CONFLICT DO NOTHING;

  -- Exemplo de rollback/retorno
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Passo 2: Criar uma Nova Migração
1. Crie um novo arquivo de migração na pasta `backend/drizzle/` (respeitando a numeração sequencial, ex: `0006_nome_do_recurso.sql`).
2. Escreva as instruções `CREATE OR REPLACE FUNCTION` com as atualizações desejadas.
3. Se necessário, escreva um bloco PL/pgSQL temporário para aplicar os novos defaults também para os workspaces que **já existem** na base de dados (backfill):

```sql
-- Exemplo de Script de Backfill para workspaces existentes
DO $$
DECLARE
  ws RECORD;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    -- Inserir os novos defaults para workspaces antigos que não possuem o registro
    INSERT INTO public.custom_field_definitions (workspace_id, key, name, type)
    VALUES (ws.id, 'queixa_principal', 'Queixa Principal', 'text')
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
```

### Passo 3: Sincronizar o Schema Drizzle (Opcional, mas Recomendado)
Se você estiver alterando colunas ou adicionando novos campos padrão diretamente em arquivos TypeScript, lembre-se de atualizar o `backend/src/shared/schema.ts` para manter o ORM ciente das alterações dos valores padrão (`.default(...)`).
