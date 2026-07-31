CREATE TABLE IF NOT EXISTS public.email_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  template   TEXT NOT NULL,
  html_body  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'sent',
  error      TEXT,
  metadata   JSONB,
  sent_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS: apenas usuários com role = 'admin' no JWT podem ler
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_can_read_email_logs" ON public.email_logs;

CREATE POLICY "admins_can_read_email_logs"
  ON public.email_logs FOR SELECT
  USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
  );

-- Índices para performance nas consultas mais comuns
CREATE INDEX IF NOT EXISTS idx_email_logs_status    ON public.email_logs (status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template  ON public.email_logs (template);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs (created_at DESC);
