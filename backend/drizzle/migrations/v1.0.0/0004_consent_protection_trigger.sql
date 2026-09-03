CREATE OR REPLACE FUNCTION protect_contact_consent_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.accepted_contract_at IS NOT NULL AND NEW.accepted_contract_at IS DISTINCT FROM OLD.accepted_contract_at THEN
    NEW.accepted_contract_at := OLD.accepted_contract_at;
  END IF;

  IF OLD.is_minor IS DISTINCT FROM NEW.is_minor THEN
    NEW.is_minor := OLD.is_minor;
  END IF;

  IF OLD.age_confirmed_at IS NOT NULL AND NEW.age_confirmed_at IS DISTINCT FROM OLD.age_confirmed_at THEN
    NEW.age_confirmed_at := OLD.age_confirmed_at;
  END IF;

  IF OLD.signed_contract_content IS NOT NULL AND NEW.signed_contract_content IS DISTINCT FROM OLD.signed_contract_content THEN
    NEW.signed_contract_content := OLD.signed_contract_content;
  END IF;

  IF OLD.consent_ip IS NOT NULL AND NEW.consent_ip IS DISTINCT FROM OLD.consent_ip THEN
    NEW.consent_ip := OLD.consent_ip;
  END IF;

  IF OLD.consent_user_agent IS NOT NULL AND NEW.consent_user_agent IS DISTINCT FROM OLD.consent_user_agent THEN
    NEW.consent_user_agent := OLD.consent_user_agent;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_contact_consent_metadata ON contacts;
CREATE TRIGGER trg_protect_contact_consent_metadata
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION protect_contact_consent_metadata();
