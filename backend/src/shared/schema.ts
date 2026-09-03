import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, unique, index } from 'drizzle-orm/pg-core';

// ── 1. Contas de Usuário (Pessoa Física) ───────────────────────────────────
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  email: text('email').notNull().unique(),
  avatarUrl: text('avatar_url'),
  cpf: text('cpf'),
  crp: text('crp'),
  hasNoCrp: boolean('has_no_crp').default(false).notNull(),
  role: text('role').$type<'admin' | 'user'>().default('user').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

// ── 2. Workspaces (Consultórios / Clínicas / Espaços de Trabalho) ───────────
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').references(() => profiles.id),

  // Informações Práticas & Clínicas do Workspace
  crp: text('crp'),
  bio: text('bio'),
  specialties: jsonb('specialties').$type<string[]>(),
  cityState: text('city_state'),
  instagram: text('instagram'),
  isOnlineService: boolean('is_online_service').default(true).notNull(),
  defaultSiteAvatarUrl: text('default_site_avatar_url'),

  // Configurações do CRM (Fontes de Tráfego & Webhook)
  trafficSources: jsonb('traffic_sources').$type<string[]>().default(['Manual', 'Instagram', 'Google Ads', 'Facebook Ads', 'Indicação', 'TikTok', 'Site / Orgânico', 'Webhook']).notNull(),
  defaultTrafficSource: text('default_traffic_source').default('Manual').notNull(),
  webhookSecret: text('webhook_secret'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

// ── 3. Identidades Visuais (Padrão do Workspace & Overrides de Páginas) ────
export const visualIdentities = pgTable('visual_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // Ex: "Identidade Padrão do Workspace" ou "Override Landing Page Terapia"
  isWorkspaceDefault: boolean('is_workspace_default').default(false).notNull(),

  // Imagens & Logotipo Padrão (Único - Sem diferenciação Claro/Escuro)
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  logoConfig: jsonb('logo_config').$type<{ mode: 'html' | 'image'; text?: string; iconType?: 'psi' | 'custom'; customIconUrl?: string }>(),

  // Paleta de Cores Única do Workspace
  primaryColor: text('primary_color').default('#4F46E5').notNull(),
  secondaryColor: text('secondary_color').default('#06B6D4').notNull(),
  contrastColor: text('contrast_color').default('#FFFFFF').notNull(),
  bgColor: text('bg_color').default('#F8FAFC').notNull(),
  cardColor: text('card_color').default('#FFFFFF').notNull(),
  textColor: text('text_color').default('#0F172A').notNull(),

  fontHeading: text('font_heading').default('Playfair Display').notNull(),
  fontBody: text('font_body').default('Inter').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type VisualIdentity = typeof visualIdentities.$inferSelect;
export type NewVisualIdentity = typeof visualIdentities.$inferInsert;

// ── 4. Domínios do Workspace (Subdomínio TheraOS & Domínio Customizado) ─────
export const workspaceDomains = pgTable('workspace_domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull().unique(),
  subdomain: text('subdomain').notNull().unique(),
  customDomain: text('custom_domain'),
  cfHostnameId: text('cf_hostname_id'),
  dnsStatus: text('dns_status').default('pending').notNull(),
  dnsRecords: jsonb('dns_records').$type<Array<{ type: string; name: string; value: string; description?: string }>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type WorkspaceDomain = typeof workspaceDomains.$inferSelect;
export type NewWorkspaceDomain = typeof workspaceDomains.$inferInsert;

// ── 5. Membros & Acessos do Workspace (RBAC Futuro) ────────────────────────
export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').$type<'owner' | 'admin' | 'secretaria' | 'psicologo' | 'agent' | 'membro'>().default('membro').notNull(),
  permissions: jsonb('permissions').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('workspace_members_workspace_user_unique').on(t.workspaceId, t.userId),
]);

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;

// ── 6. Configurações Globais SaaS (Platform Settings - White-Label Central) 
export const platformSettings = pgTable('platform_settings', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Marca e Identidade Visual Central da Plataforma (Backoffice / SaaS)
  platformName: text('platform_name').default('TheraOS').notNull(),
  logoLightUrl: text('logo_light_url'),
  logoDarkUrl: text('logo_dark_url'),
  iconLightUrl: text('icon_light_url'),
  iconDarkUrl: text('icon_dark_url'),

  // Tema Visual e Cores da Plataforma (Dashboard / Admin)
  gradientColorStart: text('gradient_color_start').default('#7C3AED').notNull(),
  gradientColorEnd: text('gradient_color_end').default('#A855F7').notNull(),
  contrastColor: text('contrast_color').default('#FFFFFF').notNull(),
  bgLightColor: text('bg_light_color').default('#F8FAFC').notNull(),
  bgDarkColor: text('bg_dark_color').default('#09090B').notNull(),

  // Credenciais de Infraestrutura (Cloudflare, R2, Resend)
  cloudflareApiToken: text('cloudflare_api_token'),
  cloudflareZoneId: text('cloudflare_zone_id'),
  cloudflareAccountId: text('cloudflare_account_id'),
  baseDomain: text('base_domain'),
  r2BucketName: text('r2_bucket_name'),
  r2PublicDomain: text('r2_public_domain'),
  r2AccessKeyId: text('r2_access_key_id'),
  r2SecretAccessKey: text('r2_secret_access_key'),
  backupR2Buckets: jsonb('backup_r2_buckets').default([]).notNull(),
  resendApiKey: text('resend_api_key'),
  resendFromDomain: text('resend_from_domain'),
  hasResend: boolean('has_resend').default(false).notNull(),
  baseTenantPrice: integer('base_tenant_price').default(0).notNull(),
  additionalMemberPrice: integer('additional_member_price').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;
export type NewPlatformSetting = typeof platformSettings.$inferInsert;

// ── 7. Logs de Status do Sistema & E-mails ─────────────────────────────────
export const systemStatusLogs = pgTable('system_status_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceName: text('service_name').notNull(),
  status: text('status').$type<'operational' | 'degraded' | 'down'>().notNull(),
  responseTimeMs: integer('response_time_ms'),
  message: text('message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SystemStatusLog = typeof systemStatusLogs.$inferSelect;
export type NewSystemStatusLog = typeof systemStatusLogs.$inferInsert;

export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  template: text('template').notNull(),
  htmlBody: text('html_body').notNull(),
  status: text('status').$type<'sent' | 'failed' | 'pending'>().default('pending').notNull(),
  error: text('error'),
  retryCount: integer('retry_count').default(0).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;

// ── 8. CRM: Estágios do Funil (Pipeline Columns) ───────────────────────────
export const pipelineColumns = pgTable('pipeline_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  slug: text('slug').default('').notNull(),
  color: text('color').default('#6366F1').notNull(),
  category: text('category').$type<'pendente' | 'acolhimento' | 'paciente' | 'alta' | 'negativa'>().default('acolhimento').notNull(),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PipelineColumn = typeof pipelineColumns.$inferSelect;
export type NewPipelineColumn = typeof pipelineColumns.$inferInsert;

// ── 9. Formulários de Triagem ──────────────────────────────────────────────
export const screeningForms = pgTable('screening_forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  visualIdentityId: uuid('visual_identity_id').references(() => visualIdentities.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  isActive: boolean('is_active').default(true).notNull(),

  // Configuração Visual & Fluxograma Publicado
  themeConfig: jsonb('theme_config').$type<Record<string, any>>().notNull(),
  formFlow: jsonb('form_flow').$type<Record<string, any>>().notNull(),

  // Objeto Único de Rascunho / Staging (Auto-Save)
  draftData: jsonb('draft_data').$type<Record<string, any>>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ScreeningForm = typeof screeningForms.$inferSelect;
export type NewScreeningForm = typeof screeningForms.$inferInsert;

// ── 10. Páginas de Captação / Landing Pages ─────────────────────────────────
export const capturePages = pgTable('capture_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  visualIdentityId: uuid('visual_identity_id').references(() => visualIdentities.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  isActive: boolean('is_active').default(true).notNull(),

  // Destino das Ações (CTAs) & Formulário Vinculado
  ctaType: text('cta_type').$type<'whatsapp' | 'external_url' | 'form'>().default('form').notNull(),
  ctaWhatsappMessage: text('cta_whatsapp_message'),
  ctaExternalUrl: text('cta_external_url'),
  formId: uuid('form_id').references(() => screeningForms.id, { onDelete: 'set null' }),

  // SEO, Configuração Visual & Dicionário
  customDomain: text('custom_domain'),
  seoConfig: jsonb('seo_config').$type<{ metaTitle: string; metaDescription: string; ogImageUrl?: string }>().notNull(),
  siteConfig: jsonb('site_config').$type<Record<string, any>>().notNull(),
  dictionary: jsonb('dictionary').$type<Record<string, any>>().notNull(),
  formFlow: jsonb('form_flow').$type<Record<string, any>>().notNull(),

  // Objeto Único de Rascunho / Staging (Auto-Save)
  draftData: jsonb('draft_data').$type<Record<string, any>>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type CapturePage = typeof capturePages.$inferSelect;
export type NewCapturePage = typeof capturePages.$inferInsert;

// ── 10.5 Definições de Campos Personalizados ────────────────────────────────
export const customFieldDefinitions = pgTable('custom_field_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  key: text('key').notNull(), // Nome da variável (ex: "queixa_principal")
  name: text('name').notNull(), // Label do CRM (ex: "Queixa Principal")
  type: text('type').$type<'text' | 'number' | 'select' | 'boolean' | 'date'>().default('text').notNull(),
  options: jsonb('options').$type<string[]>(), // Opções se tipo 'select'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('custom_field_def_workspace_key_unique').on(t.workspaceId, t.key)
]);

export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;
export type NewCustomFieldDefinition = typeof customFieldDefinitions.$inferInsert;

// ── 11. CRM: Contatos (Leads / Pacientes) ──────────────────────────────────
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  pipelineColumnId: uuid('pipeline_column_id').references(() => pipelineColumns.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  status: text('status').notNull(),
  source: text('source'),
  screeningNotes: text('screening_notes'),
  nextContactAt: timestamp('next_contact_at', { withTimezone: true }),
  lastContactAt: timestamp('last_contact_at', { withTimezone: true }),

  // Informações Clínicas & Emergência
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactRelation: text('emergency_contact_relation'),
  emergencyContactPhone: text('emergency_contact_phone'),
  isMinor: boolean('is_minor').default(false).notNull(),
  acceptedContractAt: timestamp('accepted_contract_at', { withTimezone: true }),

  // Metadados de Auditoria de Consentimento (LGPD / TCLE)
  ageConfirmedAt: timestamp('age_confirmed_at', { withTimezone: true }),
  signedContractContent: text('signed_contract_content'),
  consentIp: text('consent_ip'),
  consentUserAgent: text('consent_user_agent'),

  // Responsável Legal (caso menor de idade)
  parentName: text('parent_name'),
  parentCpf: text('parent_cpf'),
  parentPhone: text('parent_phone'),

  // Campos Personalizados e Variáveis
  customFieldValues: jsonb('custom_field_values').$type<Record<string, any>>().default({}).notNull(),

  // Parâmetros de Rastreamento UTM
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmTerm: text('utm_term'),
  utmContent: text('utm_content'),

  // Origem do Lead
  formId: uuid('form_id').references(() => screeningForms.id, { onDelete: 'set null' }),
  capturePageId: uuid('capture_page_id').references(() => capturePages.id, { onDelete: 'set null' }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_contacts_custom_fields').using('gin', t.customFieldValues),
]);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

// ── 12. Histórico de Interações CRM ────────────────────────────────────────
export const interactionHistory = pgTable('interaction_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').$type<'comment' | 'status_change' | 'appointment' | 'email_sent'>().notNull(),
  durationSeconds: integer('duration_seconds'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type InteractionHistory = typeof interactionHistory.$inferSelect;
export type NewInteractionHistory = typeof interactionHistory.$inferInsert;

// ── 13. Galeria de Mídia do Workspace ───────────────────────────────────────
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  key: text('key').unique().notNull(),
  url: text('url').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  width: integer('width'),
  height: integer('height'),
  isCropped: boolean('is_cropped').default(false).notNull(),
  parentId: uuid('parent_id').references((): any => mediaAssets.id, { onDelete: 'set null' }),
  usageContext: text('usage_context'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;

// ── 14. Logs do Sistema Unificados ──────────────────────────────────────────
export const logs = pgTable('logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').default('error').notNull(),
  name: text('name'),
  message: text('message').notNull(),
  stack: text('stack'),
  url: text('url'),
  clientApp: text('client_app'),
  userRole: text('user_role'),
  userAgent: text('user_agent'),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  sessionId: uuid('session_id'),
  serviceName: text('service_name').notNull(),
  severity: text('severity').$type<'error' | 'warning' | 'fatal' | 'info'>().default('error').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const errorLogs = logs;
export type SystemLog = typeof logs.$inferSelect;
export type NewSystemLog = typeof logs.$inferInsert;
export type ErrorLog = SystemLog;

// ── 15. Logs de Auditoria de Ações Sensíveis (Audit Trail) ──────────────────
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(),
  category: text('category').$type<'auth' | 'security' | 'config' | 'email' | 'webhook' | 'data'>().notNull(),
  serviceName: text('service_name').notNull(),
  status: text('status').$type<'success' | 'failure'>().notNull(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  ip: text('ip'),
  userAgent: text('user_agent'),
  details: jsonb('details').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;



