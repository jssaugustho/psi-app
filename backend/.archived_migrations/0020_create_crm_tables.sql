-- 1. Criar tabelas CRM e Email Marketing

CREATE TABLE IF NOT EXISTS public.pipeline_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  "order" integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT pipeline_columns_tenant_id_name_key UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  status text NOT NULL,
  source text,
  screening_notes text,
  next_contact_at timestamp with time zone,
  last_contact_at timestamp with time zone,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.interaction_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type text NOT NULL,
  duration_seconds integer,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text DEFAULT 'draft' NOT NULL,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Habilitar Row Level Security (RLS)

ALTER TABLE public.pipeline_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas RLS

DROP POLICY IF EXISTS "Members can view pipeline columns" ON public.pipeline_columns;
CREATE POLICY "Members can view pipeline columns" ON public.pipeline_columns
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Members can manage pipeline columns" ON public.pipeline_columns;
CREATE POLICY "Members can manage pipeline columns" ON public.pipeline_columns
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id))
  WITH CHECK (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Members can view contacts" ON public.contacts;
CREATE POLICY "Members can view contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Members can manage contacts" ON public.contacts;
CREATE POLICY "Members can manage contacts" ON public.contacts
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id))
  WITH CHECK (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Members can view interaction history" ON public.interaction_history;
CREATE POLICY "Members can view interaction history" ON public.interaction_history
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Members can manage interaction history" ON public.interaction_history;
CREATE POLICY "Members can manage interaction history" ON public.interaction_history
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id))
  WITH CHECK (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Members can view email campaigns" ON public.email_campaigns;
CREATE POLICY "Members can view email campaigns" ON public.email_campaigns
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Members can manage email campaigns" ON public.email_campaigns;
CREATE POLICY "Members can manage email campaigns" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id))
  WITH CHECK (public.is_tenant_member(tenant_id));

-- 4. Garantir Acessos aos Usuários do PostgREST

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_columns TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interaction_history TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated, service_role;

-- 5. Trigger para Popular Pipeline Padrão ao Criar Tenants

CREATE OR REPLACE FUNCTION public.populate_default_pipeline_columns()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.pipeline_columns (tenant_id, name, "order")
  VALUES 
    (NEW.id, 'Contato Inicial', 1),
    (NEW.id, 'Triagem / Alinhamento', 2),
    (NEW.id, '1ª Sessão Agendada', 3),
    (NEW.id, 'Sessão Realizada', 4),
    (NEW.id, 'Paciente Ativo', 5)
  ON CONFLICT (tenant_id, name) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_populate_default_pipeline_columns ON public.tenants;
CREATE TRIGGER trigger_populate_default_pipeline_columns
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_default_pipeline_columns();

-- 6. Retroalimentação (Backfill) dos Tenants Existentes

INSERT INTO public.pipeline_columns (tenant_id, name, "order")
SELECT id, 'Contato Inicial', 1 FROM public.tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO public.pipeline_columns (tenant_id, name, "order")
SELECT id, 'Triagem / Alinhamento', 2 FROM public.tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO public.pipeline_columns (tenant_id, name, "order")
SELECT id, '1ª Sessão Agendada', 3 FROM public.tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO public.pipeline_columns (tenant_id, name, "order")
SELECT id, 'Sessão Realizada', 4 FROM public.tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO public.pipeline_columns (tenant_id, name, "order")
SELECT id, 'Paciente Ativo', 5 FROM public.tenants
ON CONFLICT (tenant_id, name) DO NOTHING;
