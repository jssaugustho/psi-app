-- Corrigir a função auth.uid() para suportar a forma que o PostgREST v12+ passa os claims de JWT.
-- O PostgREST v12+ não popula mais a configuração plana request.jwt.claim.sub, apenas request.jwt.claims como uma string JSON.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;
