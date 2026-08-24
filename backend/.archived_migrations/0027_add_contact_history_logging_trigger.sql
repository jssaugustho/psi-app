CREATE OR REPLACE FUNCTION public.log_contact_changes_to_history()
RETURNS TRIGGER AS $$
DECLARE
  notes_text TEXT := '';
BEGIN
  -- Compara campos importantes apenas em UPDATE
  IF (OLD.name IS DISTINCT FROM NEW.name) THEN
    notes_text = notes_text || 'Nome alterado de "' || COALESCE(OLD.name, '') || '" para "' || NEW.name || '". ';
  END IF;

  IF (OLD.phone IS DISTINCT FROM NEW.phone) THEN
    notes_text = notes_text || 'Telefone alterado de "' || COALESCE(OLD.phone, 'Sem telefone') || '" para "' || COALESCE(NEW.phone, 'Sem telefone') || '". ';
  END IF;

  IF (OLD.email IS DISTINCT FROM NEW.email) THEN
    notes_text = notes_text || 'E-mail alterado de "' || COALESCE(OLD.email, 'Sem e-mail') || '" para "' || COALESCE(NEW.email, 'Sem e-mail') || '". ';
  END IF;

  IF (OLD.screening_notes IS DISTINCT FROM NEW.screening_notes) THEN
    notes_text = notes_text || 'Observações de acolhimento atualizadas. ';
  END IF;

  IF (OLD.emergency_contact_name IS DISTINCT FROM NEW.emergency_contact_name) THEN
    notes_text = notes_text || 'Contato de emergência alterado de "' || COALESCE(OLD.emergency_contact_name, 'Nenhum') || '" para "' || COALESCE(NEW.emergency_contact_name, 'Nenhum') || '". ';
  END IF;

  IF (notes_text <> '') THEN
    INSERT INTO public.interaction_history (contact_id, tenant_id, type, notes)
    VALUES (NEW.id, NEW.tenant_id, 'update', notes_text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criando a trigger no banco
DROP TRIGGER IF EXISTS contact_history_log_trigger ON public.contacts;
CREATE TRIGGER contact_history_log_trigger
AFTER UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.log_contact_changes_to_history();
