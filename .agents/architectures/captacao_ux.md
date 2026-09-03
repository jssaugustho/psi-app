# 🎯 Architecture Spec: Captacao Funnel & Psychologist CRM

> **Scope**: Patient lead capture forms, CRM Kanban board, lead status pipeline & psychologist workflow.

---

## 🏗️ Captacao & CRM Flow

```text
[ Public Patient Form ]
          │
          ▼ (POST /v1/crm/webhook or PostgREST insert)
[ crm_leads Table ]
          │
          ▼ (Realtime WebSocket Event)
[ Psychologist Dashboard Kanban Board ]
  ├── 📥 Novos Leads
  ├── 💬 Em Contato
  ├── 📅 Agendado
  └── ✅ Paciente Convertido
```

---

## ⚡ Directives & Rules

1. **Lead Webhook Security**:
   - Webhook submissions from external landing pages must pass rate-limiting validation and captcha verification.
2. **Kanban State Updates**:
   - Drag-and-drop column changes update `crm_leads.status_id` via PostgREST PATCH with optimistic UI updates on frontend.
