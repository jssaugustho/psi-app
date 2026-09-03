--
-- PostgreSQL database dump
--

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: auto_add_workspace_owner_as_member(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_add_workspace_owner_as_member() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT ON CONSTRAINT workspace_members_workspace_user_unique DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: auto_create_workspace_crm_defaults(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_create_workspace_crm_defaults() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: is_platform_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_platform_admin() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (auth.uid())::uuid
      AND role = 'admin'
  );
END;
$$;


--
-- Name: is_workspace_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces w
    LEFT JOIN public.workspace_members wm ON wm.workspace_id = w.id
    WHERE w.id = ws_id
      AND (w.owner_id = (auth.uid())::uuid OR (wm.user_id = (auth.uid())::uuid AND wm.role = 'admin'))
  );
END;
$$;


--
-- Name: is_workspace_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = (auth.uid())::uuid
  );
END;
$$;


--
-- Name: prevent_profile_role_elevation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.prevent_profile_role_elevation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Se estiver tentando alterar a coluna 'role' e o executor não for admin da plataforma nem a service_role (null auth.uid)
  IF (NEW.role IS DISTINCT FROM OLD.role) THEN
    IF (auth.uid() IS NOT NULL AND NOT public.is_platform_admin()) THEN
      RAISE EXCEPTION 'Apenas Administradores da Plataforma podem alterar a role de um perfil.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: protect_contact_consent_metadata(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.protect_contact_consent_metadata() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: capture_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capture_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    visual_identity_id uuid,
    title text NOT NULL,
    slug text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    cta_type text DEFAULT 'form'::text NOT NULL,
    cta_whatsapp_message text,
    cta_external_url text,
    form_id uuid,
    custom_domain text,
    seo_config jsonb NOT NULL,
    site_config jsonb NOT NULL,
    dictionary jsonb NOT NULL,
    form_flow jsonb NOT NULL,
    draft_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    pipeline_column_id uuid,
    name text NOT NULL,
    phone text,
    email text,
    status text NOT NULL,
    source text,
    screening_notes text,
    next_contact_at timestamp with time zone,
    last_contact_at timestamp with time zone,
    emergency_contact_name text,
    emergency_contact_relation text,
    emergency_contact_phone text,
    is_minor boolean DEFAULT false NOT NULL,
    accepted_contract_at timestamp with time zone,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    form_id uuid,
    capture_page_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    to_email text NOT NULL,
    subject text NOT NULL,
    template text NOT NULL,
    html_body text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    error text,
    metadata jsonb,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    message text NOT NULL,
    stack text,
    url text,
    user_agent text,
    user_id uuid,
    service_name text NOT NULL,
    severity text DEFAULT 'error'::text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: interaction_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interaction_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    type text NOT NULL,
    duration_seconds integer,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: media_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    key text NOT NULL,
    url text NOT NULL,
    mime_type text NOT NULL,
    file_size integer NOT NULL,
    width integer,
    height integer,
    is_cropped boolean DEFAULT false NOT NULL,
    parent_id uuid,
    usage_context text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pipeline_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pipeline_columns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    slug text DEFAULT ''::text NOT NULL,
    color text DEFAULT '#6366F1'::text NOT NULL,
    category text DEFAULT 'acolhimento'::text NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform_name text DEFAULT 'TheraOS'::text NOT NULL,
    logo_light_url text,
    logo_dark_url text,
    icon_light_url text,
    icon_dark_url text,
    gradient_color_start text DEFAULT '#7C3AED'::text NOT NULL,
    gradient_color_end text DEFAULT '#A855F7'::text NOT NULL,
    contrast_color text DEFAULT '#FFFFFF'::text NOT NULL,
    bg_light_color text DEFAULT '#F8FAFC'::text NOT NULL,
    bg_dark_color text DEFAULT '#09090B'::text NOT NULL,
    cloudflare_api_token text,
    cloudflare_zone_id text,
    cloudflare_account_id text,
    base_domain text,
    r2_bucket_name text,
    r2_public_domain text,
    r2_access_key_id text,
    r2_secret_access_key text,
    backup_r2_buckets jsonb DEFAULT '[]'::jsonb NOT NULL,
    resend_api_key text,
    resend_from_domain text,
    has_resend boolean DEFAULT false NOT NULL,
    base_tenant_price integer DEFAULT 0 NOT NULL,
    additional_member_price integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    email text NOT NULL,
    avatar_url text,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cpf text,
    crp text,
    has_no_crp boolean DEFAULT false NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version_name text NOT NULL,
    filename text NOT NULL,
    checksum text NOT NULL,
    sql_content text NOT NULL,
    execution_time_ms integer NOT NULL,
    executed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version_name text NOT NULL,
    description text,
    is_current boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: screening_forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screening_forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    visual_identity_id uuid,
    title text NOT NULL,
    slug text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    theme_config jsonb NOT NULL,
    form_flow jsonb NOT NULL,
    draft_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_status_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_status_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name text NOT NULL,
    status text NOT NULL,
    response_time_ms integer,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: visual_identities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visual_identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    is_workspace_default boolean DEFAULT false NOT NULL,
    logo_url text,
    favicon_url text,
    logo_config jsonb,
    primary_color text DEFAULT '#4F46E5'::text NOT NULL,
    secondary_color text DEFAULT '#06B6D4'::text NOT NULL,
    contrast_color text DEFAULT '#FFFFFF'::text NOT NULL,
    bg_color text DEFAULT '#F8FAFC'::text NOT NULL,
    card_color text DEFAULT '#FFFFFF'::text NOT NULL,
    text_color text DEFAULT '#0F172A'::text NOT NULL,
    font_heading text DEFAULT 'serif'::text NOT NULL,
    font_body text DEFAULT 'sans'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workspace_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    subdomain text NOT NULL,
    custom_domain text,
    cf_hostname_id text,
    dns_status text DEFAULT 'pending'::text NOT NULL,
    dns_records jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workspace_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'membro'::text NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    owner_id uuid,
    crp text,
    bio text,
    specialties jsonb,
    city_state text,
    instagram text,
    is_online_service boolean DEFAULT true NOT NULL,
    default_site_avatar_url text,
    traffic_sources jsonb DEFAULT '["Manual", "Instagram", "Google Ads", "Facebook Ads", "Indicação", "TikTok", "Site / Orgânico", "Webhook"]'::jsonb NOT NULL,
    default_traffic_source text DEFAULT 'Manual'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: capture_pages capture_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capture_pages
    ADD CONSTRAINT capture_pages_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: interaction_history interaction_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interaction_history
    ADD CONSTRAINT interaction_history_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_key_unique UNIQUE (key);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- Name: pipeline_columns pipeline_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_columns
    ADD CONSTRAINT pipeline_columns_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_unique UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: schema_versions schema_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_versions
    ADD CONSTRAINT schema_versions_pkey PRIMARY KEY (id);


--
-- Name: schema_versions schema_versions_version_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_versions
    ADD CONSTRAINT schema_versions_version_name_key UNIQUE (version_name);


--
-- Name: screening_forms screening_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_forms
    ADD CONSTRAINT screening_forms_pkey PRIMARY KEY (id);


--
-- Name: system_status_logs system_status_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_status_logs
    ADD CONSTRAINT system_status_logs_pkey PRIMARY KEY (id);


--
-- Name: visual_identities visual_identities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visual_identities
    ADD CONSTRAINT visual_identities_pkey PRIMARY KEY (id);


--
-- Name: workspace_domains workspace_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_domains
    ADD CONSTRAINT workspace_domains_pkey PRIMARY KEY (id);


--
-- Name: workspace_domains workspace_domains_subdomain_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_domains
    ADD CONSTRAINT workspace_domains_subdomain_unique UNIQUE (subdomain);


--
-- Name: workspace_domains workspace_domains_workspace_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_domains
    ADD CONSTRAINT workspace_domains_workspace_id_unique UNIQUE (workspace_id);


--
-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);


--
-- Name: workspace_members workspace_members_workspace_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_user_unique UNIQUE (workspace_id, user_id);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: workspaces trg_auto_add_workspace_owner; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_auto_add_workspace_owner ON public.workspaces;
CREATE TRIGGER trg_auto_add_workspace_owner AFTER INSERT ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.auto_add_workspace_owner_as_member();


--
-- Name: workspaces trg_auto_create_workspace_crm_defaults; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_auto_create_workspace_crm_defaults ON public.workspaces;
CREATE TRIGGER trg_auto_create_workspace_crm_defaults AFTER INSERT ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.auto_create_workspace_crm_defaults();


--
-- Name: profiles trg_prevent_profile_role_elevation; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_prevent_profile_role_elevation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_elevation BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_elevation();


--
-- Name: contacts trg_protect_contact_consent_metadata; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_protect_contact_consent_metadata ON public.contacts;
CREATE TRIGGER trg_protect_contact_consent_metadata BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.protect_contact_consent_metadata();


--
-- Name: capture_pages capture_pages_form_id_screening_forms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capture_pages
    ADD CONSTRAINT capture_pages_form_id_screening_forms_id_fk FOREIGN KEY (form_id) REFERENCES public.screening_forms(id) ON DELETE SET NULL;


--
-- Name: capture_pages capture_pages_visual_identity_id_visual_identities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capture_pages
    ADD CONSTRAINT capture_pages_visual_identity_id_visual_identities_id_fk FOREIGN KEY (visual_identity_id) REFERENCES public.visual_identities(id) ON DELETE SET NULL;


--
-- Name: capture_pages capture_pages_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capture_pages
    ADD CONSTRAINT capture_pages_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_capture_page_id_capture_pages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_capture_page_id_capture_pages_id_fk FOREIGN KEY (capture_page_id) REFERENCES public.capture_pages(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_form_id_screening_forms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_form_id_screening_forms_id_fk FOREIGN KEY (form_id) REFERENCES public.screening_forms(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_pipeline_column_id_pipeline_columns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pipeline_column_id_pipeline_columns_id_fk FOREIGN KEY (pipeline_column_id) REFERENCES public.pipeline_columns(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: error_logs error_logs_user_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: interaction_history interaction_history_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interaction_history
    ADD CONSTRAINT interaction_history_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: interaction_history interaction_history_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interaction_history
    ADD CONSTRAINT interaction_history_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: media_assets media_assets_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: pipeline_columns pipeline_columns_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_columns
    ADD CONSTRAINT pipeline_columns_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: screening_forms screening_forms_visual_identity_id_visual_identities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_forms
    ADD CONSTRAINT screening_forms_visual_identity_id_visual_identities_id_fk FOREIGN KEY (visual_identity_id) REFERENCES public.visual_identities(id) ON DELETE SET NULL;


--
-- Name: screening_forms screening_forms_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_forms
    ADD CONSTRAINT screening_forms_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: visual_identities visual_identities_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visual_identities
    ADD CONSTRAINT visual_identities_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_domains workspace_domains_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_domains
    ADD CONSTRAINT workspace_domains_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_user_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspaces workspaces_owner_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_owner_id_profiles_id_fk FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: capture_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.capture_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: capture_pages capture_pages_all_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY capture_pages_all_member ON public.capture_pages TO authenticated USING ((public.is_platform_admin() OR public.is_workspace_member(workspace_id))) WITH CHECK ((public.is_platform_admin() OR public.is_workspace_member(workspace_id)));


--
-- Name: capture_pages capture_pages_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY capture_pages_select_public ON public.capture_pages FOR SELECT TO anon, authenticated USING (((is_active = true) OR public.is_platform_admin() OR public.is_workspace_member(workspace_id)));


--
-- Name: contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: contacts contacts_insert_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY contacts_insert_anon ON public.contacts FOR INSERT TO anon WITH CHECK (true);


--
-- Name: contacts contacts_member_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY contacts_member_policy ON public.contacts TO authenticated USING ((public.is_platform_admin() OR public.is_workspace_member(workspace_id))) WITH CHECK ((public.is_platform_admin() OR public.is_workspace_member(workspace_id)));


--
-- Name: email_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: email_logs email_logs_admin_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY email_logs_admin_policy ON public.email_logs TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());


--
-- Name: error_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: error_logs error_logs_admin_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY error_logs_admin_policy ON public.error_logs TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());


--
-- Name: interaction_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.interaction_history ENABLE ROW LEVEL SECURITY;

--
-- Name: interaction_history interaction_history_member_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY interaction_history_member_policy ON public.interaction_history TO authenticated USING ((public.is_platform_admin() OR public.is_workspace_member(workspace_id))) WITH CHECK ((public.is_platform_admin() OR public.is_workspace_member(workspace_id)));


--
-- Name: media_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: media_assets media_assets_member_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_assets_member_policy ON public.media_assets TO authenticated USING ((public.is_platform_admin() OR public.is_workspace_member(workspace_id))) WITH CHECK ((public.is_platform_admin() OR public.is_workspace_member(workspace_id)));


--
-- Name: pipeline_columns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pipeline_columns ENABLE ROW LEVEL SECURITY;

--
-- Name: pipeline_columns pipeline_columns_member_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pipeline_columns_member_policy ON public.pipeline_columns TO authenticated USING ((public.is_platform_admin() OR public.is_workspace_member(workspace_id))) WITH CHECK ((public.is_platform_admin() OR public.is_workspace_member(workspace_id)));


--
-- Name: platform_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_settings platform_settings_all_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_settings_all_admin ON public.platform_settings TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());


--
-- Name: platform_settings platform_settings_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_settings_select_policy ON public.platform_settings FOR SELECT TO authenticated USING (public.is_platform_admin());


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_delete_policy ON public.profiles FOR DELETE TO authenticated USING (public.is_platform_admin());


--
-- Name: profiles profiles_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_policy ON public.profiles FOR INSERT TO authenticated WITH CHECK (((id = auth.uid()) OR public.is_platform_admin()));


--
-- Name: profiles profiles_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_policy ON public.profiles FOR SELECT TO authenticated USING (((id = auth.uid()) OR public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM (public.workspace_members wm1
     JOIN public.workspace_members wm2 ON ((wm1.workspace_id = wm2.workspace_id)))
  WHERE ((wm1.user_id = auth.uid()) AND (wm2.user_id = profiles.id))))));


--
-- Name: profiles profiles_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_policy ON public.profiles FOR UPDATE TO authenticated USING (((id = auth.uid()) OR public.is_platform_admin())) WITH CHECK (((id = auth.uid()) OR public.is_platform_admin()));


--
-- Name: screening_forms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.screening_forms ENABLE ROW LEVEL SECURITY;

--
-- Name: screening_forms screening_forms_all_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY screening_forms_all_member ON public.screening_forms TO authenticated USING ((public.is_platform_admin() OR public.is_workspace_member(workspace_id))) WITH CHECK ((public.is_platform_admin() OR public.is_workspace_member(workspace_id)));


--
-- Name: screening_forms screening_forms_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY screening_forms_select_public ON public.screening_forms FOR SELECT TO anon, authenticated USING (((is_active = true) OR public.is_platform_admin() OR public.is_workspace_member(workspace_id)));


--
-- Name: system_status_logs status_logs_admin_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY status_logs_admin_policy ON public.system_status_logs TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());


--
-- Name: system_status_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_status_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: visual_identities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visual_identities ENABLE ROW LEVEL SECURITY;

--
-- Name: visual_identities visual_identities_all_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY visual_identities_all_admin ON public.visual_identities TO authenticated USING ((public.is_platform_admin() OR public.is_workspace_member(workspace_id))) WITH CHECK ((public.is_platform_admin() OR public.is_workspace_member(workspace_id)));


--
-- Name: visual_identities visual_identities_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY visual_identities_select_public ON public.visual_identities FOR SELECT TO anon, authenticated USING (true);


--
-- Name: workspace_domains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_domains workspace_domains_all_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspace_domains_all_admin ON public.workspace_domains TO authenticated USING ((public.is_platform_admin() OR public.is_workspace_admin(workspace_id))) WITH CHECK ((public.is_platform_admin() OR public.is_workspace_admin(workspace_id)));


--
-- Name: workspace_domains workspace_domains_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspace_domains_select_public ON public.workspace_domains FOR SELECT TO anon, authenticated USING (true);


--
-- Name: workspace_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_members workspace_members_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspace_members_delete_policy ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_platform_admin() OR public.is_workspace_admin(workspace_id)));


--
-- Name: workspace_members workspace_members_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspace_members_insert_policy ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((public.is_platform_admin() OR public.is_workspace_admin(workspace_id)));


--
-- Name: workspace_members workspace_members_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspace_members_select_policy ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_platform_admin() OR public.is_workspace_member(workspace_id) OR (EXISTS ( SELECT 1
   FROM public.workspaces w
  WHERE ((w.id = workspace_members.workspace_id) AND (w.owner_id = auth.uid()))))));


--
-- Name: workspace_members workspace_members_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspace_members_update_policy ON public.workspace_members FOR UPDATE TO authenticated USING ((public.is_platform_admin() OR public.is_workspace_admin(workspace_id))) WITH CHECK ((public.is_platform_admin() OR public.is_workspace_admin(workspace_id)));


--
-- Name: workspaces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

--
-- Name: workspaces workspaces_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspaces_delete_policy ON public.workspaces FOR DELETE TO authenticated USING ((public.is_platform_admin() OR (owner_id = auth.uid())));


--
-- Name: workspaces workspaces_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspaces_insert_policy ON public.workspaces FOR INSERT TO authenticated WITH CHECK ((public.is_platform_admin() OR (owner_id = auth.uid())));


--
-- Name: workspaces workspaces_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspaces_select_policy ON public.workspaces FOR SELECT TO authenticated USING ((public.is_platform_admin() OR (owner_id = auth.uid()) OR public.is_workspace_member(id)));


--
-- Name: workspaces workspaces_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspaces_select_public ON public.workspaces FOR SELECT TO anon, authenticated USING (true);


--
-- Name: workspaces workspaces_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspaces_update_policy ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_platform_admin() OR (owner_id = auth.uid()) OR public.is_workspace_admin(id))) WITH CHECK ((public.is_platform_admin() OR (owner_id = auth.uid()) OR public.is_workspace_admin(id)));


--
-- PostgreSQL database dump complete
--

