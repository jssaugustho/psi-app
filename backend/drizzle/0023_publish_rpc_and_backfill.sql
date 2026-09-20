-- Migration 0023: Enhance publish_capture_page RPC and backfill is_published on active pages
CREATE OR REPLACE FUNCTION public.publish_capture_page(p_page_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page public.capture_pages%ROWTYPE;
  v_draft JSONB;
  v_new_canvas JSONB;
  v_new_site_config JSONB;
BEGIN
  SELECT * INTO v_page
  FROM public.capture_pages
  WHERE id = p_page_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Página de captação não encontrada.';
  END IF;

  v_draft := COALESCE(v_page.draft_data, '{}'::jsonb);

  -- Resolve o canvas_data do rascunho
  IF v_draft ? 'canvas_data' THEN
    v_new_canvas := v_draft->'canvas_data';
  ELSIF v_draft ? 'canvasData' THEN
    v_new_canvas := v_draft->'canvasData';
  ELSIF v_page.site_config ? 'canvas_data' THEN
    v_new_canvas := v_page.site_config->'canvas_data';
  ELSIF v_page.site_config ? 'canvasData' THEN
    v_new_canvas := v_page.site_config->'canvasData';
  ELSE
    v_new_canvas := '{}'::jsonb;
  END IF;

  -- Resolve o site_config do rascunho
  IF v_draft ? 'siteConfig' THEN
    v_new_site_config := v_draft->'siteConfig';
  ELSIF v_draft ? 'site_config' THEN
    v_new_site_config := v_draft->'site_config';
  ELSE
    v_new_site_config := COALESCE(v_page.site_config, '{}'::jsonb);
  END IF;

  -- Garante que site_config contenha canvas_data e status 'published'
  IF v_new_site_config IS NULL THEN
    v_new_site_config := jsonb_build_object('canvas_data', v_new_canvas, 'status', 'published');
  ELSE
    v_new_site_config := jsonb_set(v_new_site_config, '{canvas_data}', COALESCE(v_new_canvas, '{}'::jsonb));
    v_new_site_config := jsonb_set(v_new_site_config, '{status}', '"published"'::jsonb);
  END IF;

  UPDATE public.capture_pages
  SET
    site_config = v_new_site_config,
    seo_config = CASE WHEN v_draft ? 'seoConfig' THEN v_draft->'seoConfig' WHEN v_draft ? 'seo_config' THEN v_draft->'seo_config' ELSE seo_config END,
    dictionary = CASE WHEN v_draft ? 'dictionary' THEN v_draft->'dictionary' ELSE dictionary END,
    form_flow = CASE WHEN v_draft ? 'formFlow' THEN v_draft->'formFlow' WHEN v_draft ? 'form_flow' THEN v_draft->'form_flow' ELSE form_flow END,
    title = CASE WHEN v_draft->>'title' IS NOT NULL AND v_draft->>'title' != '' THEN v_draft->>'title' ELSE title END,
    slug = CASE WHEN v_draft->>'slug' IS NOT NULL AND v_draft->>'slug' != '' THEN v_draft->>'slug' ELSE slug END,
    custom_domain = CASE WHEN v_draft ? 'customDomain' THEN v_draft->>'customDomain' ELSE custom_domain END,
    cta_type = CASE WHEN v_draft ? 'ctaType' THEN v_draft->>'ctaType' ELSE cta_type END,
    cta_whatsapp_message = CASE WHEN v_draft ? 'ctaWhatsappMessage' THEN v_draft->>'ctaWhatsappMessage' ELSE cta_whatsapp_message END,
    cta_external_url = CASE WHEN v_draft ? 'ctaExternalUrl' THEN v_draft->>'ctaExternalUrl' ELSE cta_external_url END,
    form_id = CASE WHEN v_draft ? 'formId' AND v_draft->>'formId' != '' THEN (v_draft->>'formId')::uuid ELSE form_id END,
    is_published = true,
    published_at = now(),
    updated_at = now()
  WHERE id = p_page_id;

  RETURN jsonb_build_object(
    'success', true,
    'page_id', p_page_id,
    'published_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_capture_page(UUID) TO authenticated, service_role;

-- Backfill: Marca como published todas as páginas ativas que possuem site_config
UPDATE public.capture_pages
SET is_published = true,
    published_at = COALESCE(published_at, updated_at, now())
WHERE is_active = true AND (is_published = false OR is_published IS NULL);
