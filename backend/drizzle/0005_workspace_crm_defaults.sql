-- Alter workspaces traffic_sources default value
ALTER TABLE public.workspaces 
  ALTER COLUMN traffic_sources SET DEFAULT '["Manual", "Instagram", "Google Ads", "Facebook Ads", "Indicação", "TikTok", "Site / Orgânico", "Webhook"]'::jsonb;

-- Trigger function to add default pipeline columns and default visual identity to new workspaces
CREATE OR REPLACE FUNCTION public.auto_create_workspace_crm_defaults()
RETURNS trigger AS $$
BEGIN
  -- 1. Insert default pipeline columns for the new workspace
  INSERT INTO public.pipeline_columns (workspace_id, name, slug, color, category, "order")
  VALUES 
    (NEW.id, 'Contato Inicial', 'contato-inicial', '#6366F1', 'pendente', 0),
    (NEW.id, 'Triagem', 'triagem', '#F59E0B', 'acolhimento', 1),
    (NEW.id, '1ª Sessão Agendada', '1a-sessao-agendada', '#3B82F6', 'acolhimento', 2),
    (NEW.id, 'Sessão Realizada', 'sessao-realizada', '#10B981', 'acolhimento', 3),
    (NEW.id, 'Paciente Ativo', 'paciente-ativo', '#8B5CF6', 'paciente', 4),
    (NEW.id, 'Alta Clínica', 'alta-clinica', '#14B8A6', 'alta', 5),
    (NEW.id, 'Arquivado', 'arquivado', '#EF4444', 'negativa', 6)
  ON CONFLICT DO NOTHING;

  -- 2. Insert default visual identity for the new workspace
  INSERT INTO public.visual_identities (workspace_id, name, is_workspace_default, primary_color, secondary_color, contrast_color, bg_color, card_color, text_color, font_heading, font_body)
  VALUES (NEW.id, 'Padrão', true, '#4F46E5', '#06B6D4', '#FFFFFF', '#F8FAFC', '#FFFFFF', '#0F172A', 'Playfair Display', 'Inter')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after a workspace is inserted
DROP TRIGGER IF EXISTS trg_auto_create_workspace_crm_defaults ON public.workspaces;
CREATE TRIGGER trg_auto_create_workspace_crm_defaults
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_workspace_crm_defaults();

-- Backfill existing workspaces with default settings
DO $$
DECLARE
  ws RECORD;
  has_columns boolean;
  has_visual_identity boolean;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    -- 1. Check if workspace has pipeline columns
    SELECT EXISTS(SELECT 1 FROM public.pipeline_columns WHERE workspace_id = ws.id) INTO has_columns;
    IF NOT has_columns THEN
      INSERT INTO public.pipeline_columns (workspace_id, name, slug, color, category, "order")
      VALUES 
        (ws.id, 'Contato Inicial', 'contato-inicial', '#6366F1', 'pendente', 0),
        (ws.id, 'Triagem', 'triagem', '#F59E0B', 'acolhimento', 1),
        (ws.id, '1ª Sessão Agendada', '1a-sessao-agendada', '#3B82F6', 'acolhimento', 2),
        (ws.id, 'Sessão Realizada', 'sessao-realizada', '#10B981', 'acolhimento', 3),
        (ws.id, 'Paciente Ativo', 'paciente-ativo', '#8B5CF6', 'paciente', 4),
        (ws.id, 'Alta Clínica', 'alta-clinica', '#14B8A6', 'alta', 5),
        (ws.id, 'Arquivado', 'arquivado', '#EF4444', 'negativa', 6);
    END IF;

    -- 2. Check if workspace has a default visual identity
    SELECT EXISTS(SELECT 1 FROM public.visual_identities WHERE workspace_id = ws.id AND is_workspace_default = true) INTO has_visual_identity;
    IF NOT has_visual_identity THEN
      INSERT INTO public.visual_identities (workspace_id, name, is_workspace_default, primary_color, secondary_color, contrast_color, bg_color, card_color, text_color, font_heading, font_body)
      VALUES (ws.id, 'Padrão', true, '#4F46E5', '#06B6D4', '#FFFFFF', '#F8FAFC', '#FFFFFF', '#0F172A', 'Playfair Display', 'Inter');
    END IF;

    -- 3. Update traffic sources if they are the old default
    UPDATE public.workspaces 
    SET traffic_sources = '["Manual", "Instagram", "Google Ads", "Facebook Ads", "Indicação", "TikTok", "Site / Orgânico", "Webhook"]'::jsonb
    WHERE id = ws.id 
      AND (
        traffic_sources::jsonb = '["Manual", "Instagram", "Google Ads", "Facebook Ads", "Webhook"]'::jsonb
        OR traffic_sources::jsonb = '[]'::jsonb
        OR traffic_sources IS NULL
      );
  END LOOP;
END;
$$;
