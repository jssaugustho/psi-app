-- Migration 0017_add_realtime_event_triggers.sql
-- Funcao e triggers PostgreSQL para emitir notificacao pg_notify no canal 'realtime_events'
-- padronizado estritamente com workspaceId e workspace_id para contacts, interaction_history e pipeline_columns

CREATE OR REPLACE FUNCTION public.notify_realtime_event()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  target_workspace_id uuid;
  entity_name text;
  action_type text;
  record_data jsonb;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    action_type := 'deleted';
    record_data := to_jsonb(OLD);
  ELSIF (TG_OP = 'UPDATE') THEN
    action_type := 'updated';
    record_data := to_jsonb(NEW);
  ELSE
    action_type := 'created';
    record_data := to_jsonb(NEW);
  END IF;

  IF (TG_TABLE_NAME = 'contacts') THEN
    entity_name := 'lead';
    target_workspace_id := (record_data->>'workspace_id')::uuid;
  ELSIF (TG_TABLE_NAME = 'interaction_history') THEN
    entity_name := 'interaction_history';
    target_workspace_id := (record_data->>'workspace_id')::uuid;
  ELSIF (TG_TABLE_NAME = 'pipeline_columns') THEN
    entity_name := 'pipeline_column';
    target_workspace_id := (record_data->>'workspace_id')::uuid;
  ELSE
    RETURN NULL;
  END IF;

  payload := jsonb_build_object(
    'entity', entity_name,
    'action', action_type,
    'workspaceId', target_workspace_id,
    'workspace_id', target_workspace_id,
    'data', record_data
  );

  PERFORM pg_notify('realtime_events', payload::text);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para a tabela contacts
DROP TRIGGER IF EXISTS trg_realtime_contacts ON public.contacts;
CREATE TRIGGER trg_realtime_contacts
  AFTER INSERT OR UPDATE OR DELETE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.notify_realtime_event();

-- Triggers para a tabela interaction_history
DROP TRIGGER IF EXISTS trg_realtime_interaction_history ON public.interaction_history;
CREATE TRIGGER trg_realtime_interaction_history
  AFTER INSERT OR UPDATE OR DELETE ON public.interaction_history
  FOR EACH ROW EXECUTE FUNCTION public.notify_realtime_event();

-- Triggers para a tabela pipeline_columns
DROP TRIGGER IF EXISTS trg_realtime_pipeline_columns ON public.pipeline_columns;
CREATE TRIGGER trg_realtime_pipeline_columns
  AFTER INSERT OR UPDATE OR DELETE ON public.pipeline_columns
  FOR EACH ROW EXECUTE FUNCTION public.notify_realtime_event();
