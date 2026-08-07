-- Criar função para garantir apenas um tenant principal
CREATE OR REPLACE FUNCTION public.ensure_single_primary_tenant()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Desativar is_primary de todos os outros tenants
    UPDATE public.tenants
    SET is_primary = false
    WHERE id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Associar trigger na tabela tenants
DROP TRIGGER IF EXISTS trg_ensure_single_primary_tenant ON public.tenants;
CREATE TRIGGER trg_ensure_single_primary_tenant
BEFORE INSERT OR UPDATE OF is_primary ON public.tenants
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION public.ensure_single_primary_tenant();
