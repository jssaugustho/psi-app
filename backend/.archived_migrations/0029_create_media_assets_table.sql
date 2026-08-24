SET search_path TO public;

-- Create table media_assets
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  is_cropped BOOLEAN DEFAULT FALSE NOT NULL,
  parent_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  usage_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Select policies
DROP POLICY IF EXISTS "Tenant members can read media assets" ON public.media_assets;
CREATE POLICY "Tenant members can read media assets" ON public.media_assets
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Public can select media assets" ON public.media_assets;
CREATE POLICY "Public can select media assets" ON public.media_assets
  FOR SELECT TO anon, authenticated, service_role USING (true);

-- Insert/Delete/Update manage policies (Admins of tenant)
DROP POLICY IF EXISTS "Tenant admins can manage media assets" ON public.media_assets;
CREATE POLICY "Tenant admins can manage media assets" ON public.media_assets
  FOR ALL TO authenticated USING (public.is_tenant_admin(tenant_id));

-- Grant privileges for PostgREST
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated, service_role;
GRANT SELECT ON public.media_assets TO anon;
