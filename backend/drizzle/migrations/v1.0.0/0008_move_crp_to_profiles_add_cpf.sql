-- Migration 0008: Move CRP to profiles table and add CPF column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crp text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_no_crp boolean DEFAULT false NOT NULL;

-- Copiar CRP legados de workspaces para o perfil do proprietário (owner_id)
UPDATE public.profiles p
SET crp = w.crp
FROM public.workspaces w
WHERE w.owner_id = p.id AND w.crp IS NOT NULL AND (p.crp IS NULL OR p.crp = '');
