# 🐘 Guia do PostgreSQL MCP para Agentes de IA: Auditoria de Logs & Consumo de Schema

> **Scope**: Directives for AI Agents utilizing PostgreSQL MCP (`postgres:query`) for read-only database inspections, schema discovery, and log tracing.

---

## 🎯 1. Directives for Safe PostgreSQL MCP Usage

1. **READ-ONLY Operations (`SELECT`) ONLY**:
   - When calling `postgres:query`, perform **`SELECT` queries ONLY**.
   - Mutations (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`) MUST be made via SQL migration files in `backend/drizzle/` or API endpoints.
2. **ALWAYS Limit Result Sets (`LIMIT 50`)**:
   - Cap log and audit queries to a maximum of 50 rows per query to prevent token overflow.
3. **Chronological Ordering (`ORDER BY created_at DESC`)**:
   - Inspect the most recent events first.

---

## 📜 2. Useful Queries for AI Diagnostics

### Querying Error Logs (`logs` table)
```sql
SELECT id, service_name, name, message, severity, user_id, url, created_at
FROM public.logs
WHERE severity IN ('error', 'fatal')
ORDER BY created_at DESC
LIMIT 20;
```

### Querying Audit Logs (`audit_logs` table)
```sql
SELECT id, action, status, user_id, ip, details, created_at
FROM public.audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

### Querying Failed Transactional Emails (`email_logs` table)
```sql
SELECT id, to_email, subject, template, status, error, sent_at
FROM public.email_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 15;
```

---

## 🗄️ 3. Core Database Tables & Business Purpose

| Table | Business Purpose | Key Columns |
|---|---|---|
| `profiles` | User accounts (Psychologists, Admins) | `id`, `email`, `first_name`, `last_name`, `crp`, `role` |
| `workspaces` | Workspaces (Clinics) | `id`, `name`, `owner_id`, `crp`, `traffic_sources` |
| `workspace_domains` | DNS routing, subdomains | `id`, `workspace_id`, `subdomain`, `custom_domain` |
| `visual_identities` | White-Label themes & logos | `id`, `workspace_id`, `logo_url`, `primary_color` |
| `workspace_members` | RBAC membership | `id`, `workspace_id`, `user_id`, `role`, `permissions` |
| `crm_leads` / `contacts` | CRM Leads & Patients | `id`, `workspace_id`, `pipeline_column_id`, `name`, `phone`, `status` |
| `logs` | Error & exception logs | `id`, `name`, `message`, `stack`, `service_name`, `severity` |
| `audit_logs` | Security & audit events | `id`, `action`, `category`, `service_name`, `status`, `user_id` |
