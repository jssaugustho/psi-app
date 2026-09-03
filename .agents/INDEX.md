# 📚 `.agents` System Documentation Index

This directory contains the modular AI-First rules, architectural specifications, and domain studies for `psi-app`.

---

## 📁 Directory Structure

```text
.agents/
├── INDEX.md                            # This file
├── core/                               # 📌 Strict Technical Rules (Inviolable constraints)
│   ├── 01_stack_and_decision_tree.md   # Architectural matrix & technology selection
│   ├── 02_db_rls_and_security.md       # PostgreSQL, RLS, Auth JWT & Multi-tenancy
│   ├── 03_async_logging_and_events.md  # RabbitMQ workers, FIFO buffer & WebSockets
│   ├── 04_ui_and_design_system.md      # White-Label system, Tailwind, Modals & Component Rules
│   └── 05_email_and_communications.md  # Email queue, Resend API & templates
├── architectures/                      # 🏗️ Business Domain Specifications
│   ├── site_editor.md                  # Visual Editor canvas & block architecture
│   ├── site_wizard_and_defaults.md     # Site Creation Wizard & Workspace defaults
│   ├── site_staging_and_publishing.md  # Draft, Staging & Subdomain publishing
│   ├── captacao_ux.md                  # Lead capture & Psychologist CRM workflow
│   └── platform_settings.md            # System settings & tenant feature flags
└── studies/                            # 📚 Research & Reference Guides
    ├── crm_psychologist_study.md       # UX and psychologist workflow research
    └── postgres_mcp_guide.md           # PostgreSQL MCP server tool instructions
```

---

## 🎯 How AI Agents Must Use This Directory

1. Read **[AGENTS.md](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/AGENTS.md)** at root when starting any task.
2. Identify the target domain of your change.
3. Load **ONLY** the relevant file from `.agents/core/` or `.agents/architectures/`.
4. Obey all `ALWAYS`, `NEVER`, and `CRITICAL_CONTRACT` markers inside the loaded file.
