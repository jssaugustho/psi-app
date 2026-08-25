-- Script de inicialização do PostgreSQL para novos ambientes
-- Executado automaticamente pelo docker-entrypoint-initdb.d na criação de um banco novo.

CREATE SCHEMA IF NOT EXISTS auth;

