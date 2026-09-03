# 🌐 Architecture Spec: Drafts, Staging & Subdomain Publishing

> **Scope**: Site draft states, staging subdomains, publishing pipeline & Cloudflare integration.

---

## 🏗️ Publishing Lifecycle

```text
[ Draft Editor ] ──(Save)──► [ site_drafts Table (draft_content JSONB) ]
                                            │
                                    (User Clicks Publish)
                                            │
                                            ▼
                             [ RPC / Endpoint: publish_site ]
                                            │
                                            ├──► Copies draft_content to sites table (published_content)
                                            └──► Updates Cloudflare DNS / Subdomain mapping
```

---

## ⚡ Directives & Rules

1. **State Isolation (Draft vs Published)**:
   - Modifications in the editor ONLY touch `site_drafts.draft_content`.
   - The live public site strictly serves content from `sites.published_content`.
   - End-users visiting tenant sites never see work-in-progress edits until explicit publication occurs.
2. **Subdomain Resolution**:
   - Subdomains (`<slug>.psi.app`) map via Nginx / Cloudflare to query `sites` table by `subdomain` column.
