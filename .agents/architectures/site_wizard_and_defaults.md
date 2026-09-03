# 🧙‍♂️ Architecture Spec: Site Creation Wizard & Workspace Defaults

> **Scope**: Multi-step site creation wizard, RPC workspace bootstrapping, default CRM columns & visual identity initialization.

---

## 🏗️ Bootstrapping Architecture

When a new user completes signup or creates a new workspace, the Site Creation Wizard executes the stored function `bootstrap_workspace_defaults()`.

```text
[ Frontend Wizard ]
       │
       ▼ (POST /rest/v1/rpc/bootstrap_workspace_defaults)
[ PostgreSQL RPC Function ]
       │
       ├── 1. Insert Workspace row
       ├── 2. Insert Owner into workspace_members
       ├── 3. Create default CRM Kanban columns (Novos Leads, Contatados, Agendados, Finalizados)
       ├── 4. Initialize visual_identities record with brand defaults
       └── 5. Create initial site_draft record
```

---

## ⚡ Directives & Rules

1. **Atomic Creation**:
   - NEVER create workspace defaults step-by-step from client JS over separate HTTP requests.
   - ALWAYS execute the single atomic RPC call to prevent partial/orphaned workspace states.
2. **Backfill Scripts**:
   - Scripts in `backend/src/scripts/backfill-workspace-defaults.ts` handle backfilling missing default data for legacy workspaces.
