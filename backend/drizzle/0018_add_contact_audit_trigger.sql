-- Migration 0018_add_contact_audit_trigger.sql
-- Trigger de auditoria automatica no PostgreSQL para a tabela contacts.
-- Rastreia QUALQUER alteracao nos dados do lead e gera uma entrada legivel em interaction_history,
-- que e automaticamente transmitida via Realtime WebSockets para todos os usuarios logados.

CREATE OR REPLACE FUNCTION public.auto_log_contact_changes()
RETURNS trigger AS $$
DECLARE
  changes text[] := ARRAY[]::text[];
  log_type text := 'contact_update';
  summary_text text;
BEGIN
  -- Se os dados forem identicos, ignora
  IF OLD IS NOT DISTINCT FROM NEW THEN
    RETURN NEW;
  END IF;

  -- 1. Nome
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    changes := array_append(changes, format('Nome alterado de "%s" para "%s"', COALESCE(OLD.name, '-'), COALESCE(NEW.name, '-')));
  END IF;

  -- 2. Telefone
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    changes := array_append(changes, format('Telefone alterado de "%s" para "%s"', COALESCE(OLD.phone, '-'), COALESCE(NEW.phone, '-')));
  END IF;

  -- 3. E-mail
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    changes := array_append(changes, format('E-mail alterado de "%s" para "%s"', COALESCE(OLD.email, '-'), COALESCE(NEW.email, '-')));
  END IF;

  -- 4. Estagio / Status no Funil
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    log_type := 'status_change';
    changes := array_append(changes, format('Estágio alterado de "%s" para "%s"', COALESCE(OLD.status, '-'), COALESCE(NEW.status, '-')));
  END IF;

  -- 5. Origem do Lead
  IF OLD.source IS DISTINCT FROM NEW.source THEN
    changes := array_append(changes, format('Origem alterada de "%s" para "%s"', COALESCE(OLD.source, '-'), COALESCE(NEW.source, '-')));
  END IF;

  -- 6. Notas de Triagem
  IF OLD.screening_notes IS DISTINCT FROM NEW.screening_notes THEN
    changes := array_append(changes, 'Notas de triagem atualizadas');
  END IF;

  -- 7. Contato de Emergência
  IF OLD.emergency_contact_name IS DISTINCT FROM NEW.emergency_contact_name OR
     OLD.emergency_contact_phone IS DISTINCT FROM NEW.emergency_contact_phone OR
     OLD.emergency_contact_relation IS DISTINCT FROM NEW.emergency_contact_relation THEN
    changes := array_append(changes, format('Contato de emergência atualizado (%s - %s)', COALESCE(NEW.emergency_contact_name, 'Não informado'), COALESCE(NEW.emergency_contact_phone, '-')));
  END IF;

  -- 8. Menor de Idade / Responsável Legal
  IF OLD.is_minor IS DISTINCT FROM NEW.is_minor THEN
    IF NEW.is_minor THEN
      changes := array_append(changes, 'Marcado como menor de idade');
    ELSE
      changes := array_append(changes, 'Desmarcado como menor de idade');
    END IF;
  END IF;

  IF OLD.parent_name IS DISTINCT FROM NEW.parent_name OR OLD.parent_phone IS DISTINCT FROM NEW.parent_phone THEN
    changes := array_append(changes, format('Responsável legal atualizado (%s - %s)', COALESCE(NEW.parent_name, '-'), COALESCE(NEW.parent_phone, '-')));
  END IF;

  -- 9. Próximo Contato / Agendamento
  IF OLD.next_contact_at IS DISTINCT FROM NEW.next_contact_at THEN
    IF NEW.next_contact_at IS NULL THEN
      changes := array_append(changes, 'Lembrete de próximo contato removido');
    ELSE
      changes := array_append(changes, format('Próximo contato agendado para %s', to_char(NEW.next_contact_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')));
    END IF;
  END IF;

  -- 10. Campos personalizados
  IF OLD.custom_field_values IS DISTINCT FROM NEW.custom_field_values THEN
    changes := array_append(changes, 'Campos personalizados atualizados');
  END IF;

  -- Insere registro resumido no historico se houver alteracoes mapeadas
  IF array_length(changes, 1) > 0 THEN
    summary_text := array_to_string(changes, E'\n• ');
    INSERT INTO public.interaction_history (contact_id, workspace_id, type, notes)
    VALUES (NEW.id, NEW.workspace_id, log_type, '• ' || summary_text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger AFTER UPDATE em contacts
DROP TRIGGER IF EXISTS trg_auto_log_contact_changes ON public.contacts;
CREATE TRIGGER trg_auto_log_contact_changes
  AFTER UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_contact_changes();
