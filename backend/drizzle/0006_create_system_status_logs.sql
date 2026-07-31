-- Criação da tabela para histórico de status e uptime dos serviços
CREATE TABLE IF NOT EXISTS public.system_status_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    service_name text NOT NULL,
    status text NOT NULL,
    response_time_ms integer,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Índices para otimização de consultas de histórico e estatísticas por período
CREATE INDEX IF NOT EXISTS idx_status_logs_created_at ON public.system_status_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_status_logs_service_name ON public.system_status_logs(service_name);
