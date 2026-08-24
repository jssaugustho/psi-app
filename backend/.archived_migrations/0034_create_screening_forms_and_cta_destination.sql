SET search_path TO public;

-- 1. Create screening_forms table
CREATE TABLE IF NOT EXISTS public.screening_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,

  theme_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  form_flow JSONB NOT NULL DEFAULT '{}'::jsonb,

  title_draft TEXT,
  slug_draft TEXT,
  theme_config_draft JSONB,
  form_flow_draft JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on tenant_id and slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_screening_forms_tenant ON public.screening_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_screening_forms_slug ON public.screening_forms(slug);

-- 2. Add columns to capture_pages for CTA Destination & Form binding
ALTER TABLE public.capture_pages ADD COLUMN IF NOT EXISTS cta_type TEXT DEFAULT 'form' NOT NULL;
ALTER TABLE public.capture_pages ADD COLUMN IF NOT EXISTS cta_whatsapp_message TEXT;
ALTER TABLE public.capture_pages ADD COLUMN IF NOT EXISTS cta_external_url TEXT;
ALTER TABLE public.capture_pages ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES public.screening_forms(id) ON DELETE SET NULL;

ALTER TABLE public.capture_pages ADD COLUMN IF NOT EXISTS cta_type_draft TEXT;
ALTER TABLE public.capture_pages ADD COLUMN IF NOT EXISTS cta_whatsapp_message_draft TEXT;
ALTER TABLE public.capture_pages ADD COLUMN IF NOT EXISTS cta_external_url_draft TEXT;
ALTER TABLE public.capture_pages ADD COLUMN IF NOT EXISTS form_id_draft UUID REFERENCES public.screening_forms(id) ON DELETE SET NULL;

-- 3. Add form_id and capture_page_id to contacts (leads)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES public.screening_forms(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS capture_page_id UUID REFERENCES public.capture_pages(id) ON DELETE SET NULL;

-- 4. Enable RLS on screening_forms
ALTER TABLE public.screening_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can read screening forms" ON public.screening_forms;
CREATE POLICY "Tenant members can read screening forms" ON public.screening_forms
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Tenant admins can manage screening forms" ON public.screening_forms;
CREATE POLICY "Tenant admins can manage screening forms" ON public.screening_forms
  FOR ALL TO authenticated USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Public select for active screening forms" ON public.screening_forms;
CREATE POLICY "Public select for active screening forms" ON public.screening_forms
  FOR SELECT TO anon, authenticated, service_role USING (is_active = true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_forms TO authenticated, service_role;
GRANT SELECT ON public.screening_forms TO anon;
