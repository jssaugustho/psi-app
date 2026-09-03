# ⚙️ Architecture Spec: Platform Settings & Feature Flags

> **Scope**: System settings, feature toggles per workspace, and superadmin configurations.

---

## 🏗️ Configuration Layers

1. **System Global Configs**: Stored in `platform_settings` table (Superadmin only).
2. **Workspace Feature Flags**: Stored in `workspace_settings` table (`feature_flags` JSONB).

---

## ⚡ Directives & Rules

1. **Feature Check Helper**:
   - ALWAYS verify workspace feature flags using `isFeatureEnabled(workspace, 'feature_key')` helper.
2. **Superadmin Security**:
   - Access to `platform_settings` routes requires `role === 'superadmin'` claim in JWT.
