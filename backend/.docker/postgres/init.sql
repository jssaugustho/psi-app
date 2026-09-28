-- Script de inicialização do PostgreSQL para novos ambientes
-- Executado automaticamente pelo docker-entrypoint-initdb.d na criação de um banco novo.

CREATE SCHEMA IF NOT EXISTS auth;

-- Garante a existência das roles 'postgres', 'anon', 'authenticated' e 'service_role'
-- exigidas pelo GoTrue (Supabase Auth) e PostgREST na criação de um banco limpo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE ROLE postgres WITH SUPERUSER LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

