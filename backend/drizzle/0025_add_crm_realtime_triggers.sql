-- Função para notificar mudanças na tabela contacts
CREATE OR REPLACE FUNCTION public.notify_contact_changes()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    payload = json_build_object(
      'entity', 'lead',
      'action', 'deleted',
      'tenantId', OLD.tenant_id,
      'data', json_build_object('id', OLD.id)
    );
  ELSIF (TG_OP = 'INSERT') THEN
    payload = json_build_object(
      'entity', 'lead',
      'action', 'created',
      'tenantId', NEW.tenant_id,
      'data', row_to_json(NEW)
    );
  ELSE
    payload = json_build_object(
      'entity', 'lead',
      'action', 'updated',
      'tenantId', NEW.tenant_id,
      'data', row_to_json(NEW)
    );
  END IF;

  PERFORM pg_notify('realtime_events', payload::text);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger associada
DROP TRIGGER IF EXISTS contacts_realtime_trigger ON public.contacts;
CREATE TRIGGER contacts_realtime_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.notify_contact_changes();
