-- Migration 0003_workspace_owner_auto_member.sql
--
-- CONTEXTO:
-- Ao criar um workspace, o usuario criador (owner_id) deve ser automaticamente
-- adicionado como membro com role 'owner'. Isso elimina a necessidade de um
-- segundo request HTTP para inserir em workspace_members, evitando o problema
-- de bootstrap de RLS (o usuario nao pode ser validado como admin do workspace
-- antes de existir como membro).
--
-- SOLUCAO: Trigger AFTER INSERT ON workspaces que insere o owner como membro
-- automaticamente. A funcao do trigger e declarada como SECURITY DEFINER, ou
-- seja, roda com privilegios de postgres (bypassa RLS), garantindo que a
-- insercao em workspace_members sempre funcione independente das policies.
--
-- CORRECAO DA SELECT POLICY de workspace_members:
-- A policy de SELECT precisa permitir que o owner do workspace visualize os
-- membros mesmo antes de existir um registro seu em workspace_members.
-- Isso e necessario porque o PostgREST usa INSERT ... RETURNING *, que avalia
-- a SELECT policy nos rows retornados. Sem isso, o RETURNING falharia mesmo
-- com o INSERT passando no WITH CHECK.

-- 1. Funcao do trigger: adiciona o owner como membro automaticamente
CREATE OR REPLACE FUNCTION public.auto_add_workspace_owner_as_member()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT ON CONSTRAINT workspace_members_workspace_user_unique DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger na tabela workspaces
DROP TRIGGER IF EXISTS trg_auto_add_workspace_owner ON public.workspaces;
CREATE TRIGGER trg_auto_add_workspace_owner
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_workspace_owner_as_member();

-- 3. Corrige a SELECT policy de workspace_members para incluir o owner do workspace
--    (necessario para INSERT ... RETURNING funcionar via PostgREST)
DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_select_policy" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_workspace_member(workspace_id)
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id
        AND w.owner_id = (auth.uid())::uuid
    )
  );