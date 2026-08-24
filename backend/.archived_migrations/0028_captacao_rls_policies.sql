SET search_path TO public;

-- Enable RLS on capture_pages and contract_templates
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capture_pages ENABLE ROW LEVEL SECURITY;

-- Policies for contract_templates
DROP POLICY IF EXISTS "Tenant members can read contract templates" ON public.contract_templates;
CREATE POLICY "Tenant members can read contract templates" ON public.contract_templates
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Tenant admins can manage contract templates" ON public.contract_templates;
CREATE POLICY "Tenant admins can manage contract templates" ON public.contract_templates
  FOR ALL TO authenticated USING (public.is_tenant_admin(tenant_id));

-- Policies for capture_pages
DROP POLICY IF EXISTS "Tenant members can read capture pages" ON public.capture_pages;
CREATE POLICY "Tenant members can read capture pages" ON public.capture_pages
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Tenant admins can manage capture pages" ON public.capture_pages;
CREATE POLICY "Tenant admins can manage capture pages" ON public.capture_pages
  FOR ALL TO authenticated USING (public.is_tenant_admin(tenant_id));

DROP POLICY IF EXISTS "Public select for active capture pages" ON public.capture_pages;
CREATE POLICY "Public select for active capture pages" ON public.capture_pages
  FOR SELECT TO anon, authenticated, service_role USING (is_active = true);

-- Grant privileges for authenticated and anon roles (needed for PostgREST)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_templates TO authenticated, service_role;
GRANT SELECT ON public.contract_templates TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.capture_pages TO authenticated, service_role;
GRANT SELECT ON public.capture_pages TO anon;
