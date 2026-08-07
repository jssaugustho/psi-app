-- Função para notificar mudanças na tabela interaction_history
CREATE OR REPLACE FUNCTION public.notify_interaction_changes()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    payload = json_build_object(
      'entity', 'interaction_history',
      'action', 'created',
      'tenantId', NEW.tenant_id,
      'data', row_to_json(NEW)
    );
    PERFORM pg_notify('realtime_events', payload::text);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger associada
DROP TRIGGER IF EXISTS interaction_realtime_trigger ON public.interaction_history;
CREATE TRIGGER interaction_realtime_trigger
AFTER INSERT ON public.interaction_history
FOR EACH ROW EXECUTE FUNCTION public.notify_interaction_changes();
