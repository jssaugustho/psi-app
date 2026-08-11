import { pgTable, uuid, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  email: text('email').notNull().unique(),
  avatarUrl: text('avatar_url'),
  role: text('role').$type<'admin' | 'user'>().default('user').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  domain: text('domain'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  ownerId: uuid('owner_id').references(() => profiles.id),

  // Identidade Visual White-Label
  logoLightUrl: text('logo_light_url'),
  logoDarkUrl: text('logo_dark_url'),
  iconLightUrl: text('icon_light_url'),
  iconDarkUrl: text('icon_dark_url'),

  // Cores do Gradiente e Contraste
  gradientColorStart: text('gradient_color_start').default('#4F46E5').notNull(),
  gradientColorEnd: text('gradient_color_end').default('#06B6D4').notNull(),
  contrastColor: text('contrast_color').default('#FFFFFF').notNull(),

  // Cores de Fundo, Cartões e Texto (Temas Claro / Escuro)
  bgLightColor: text('bg_light_color').default('#F8FAFC').notNull(),
  bgDarkColor: text('bg_dark_color').default('#020617').notNull(),
  cardLightColor: text('card_light_color').default('#FFFFFF').notNull(),
  cardDarkColor: text('card_dark_color').default('#0F172A').notNull(),
  textLightColor: text('text_light_color').default('#0F172A').notNull(),
  textDarkColor: text('text_dark_color').default('#F8FAFC').notNull(),

  // Configurações Customizadas de E-mail
  emailDomain: text('email_domain'),
  resendApiKey: text('resend_api_key'),

  // Configurações do CRM (Fontes de Tráfego)
  trafficSources: jsonb('traffic_sources').$type<string[]>().default(['Manual', 'Instagram', 'Google Ads', 'Facebook Ads', 'Webhook']).notNull(),
  defaultTrafficSource: text('default_traffic_source').default('Manual').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const platformSettings = pgTable('platform_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  cloudflareApiToken: text('cloudflare_api_token'),
  cloudflareZoneId: text('cloudflare_zone_id'),
  cloudflareAccountId: text('cloudflare_account_id'),
  r2BucketName: text('r2_bucket_name'),
  r2PublicDomain: text('r2_public_domain'),
  r2AccessKeyId: text('r2_access_key_id'),
  r2SecretAccessKey: text('r2_secret_access_key'),
  // Resend — envio de e-mails transacionais
  resendApiKey: text('resend_api_key'),
  resendFromDomain: text('resend_from_domain'),
  hasResend: boolean('has_resend').default(false).notNull(),
  primaryTenantId: uuid('primary_tenant_id').references(() => tenants.id),
  isConfigured: boolean('is_configured').default(false).notNull(),
  baseTenantPrice: integer('base_tenant_price').default(0).notNull(),
  additionalMemberPrice: integer('additional_member_price').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export type PlatformSetting = typeof platformSettings.$inferSelect;
export type NewPlatformSetting = typeof platformSettings.$inferInsert;

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

// ── E-mail Logs ────────────────────────────────────────────────────────────
export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  template: text('template').notNull(),
  htmlBody: text('html_body').notNull(),
  status: text('status').$type<'sent' | 'failed'>().default('sent').notNull(),
  error: text('error'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;

export const tenantMembers = pgTable('tenant_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').$type<'admin' | 'secretaria' | 'psicologo' | 'agent'>().default('secretaria').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TenantMember = typeof tenantMembers.$inferSelect;
export type NewTenantMember = typeof tenantMembers.$inferInsert;

// ── CRM: Pipeline Columns (Estágios do Funil) ────────────────────────────────
export const pipelineColumns = pgTable('pipeline_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
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

// ── CRM: Contacts (Leads / Pacientes em triagem) ─────────────────────────────
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  status: text('status').notNull(), // mapeia para name de pipeline_columns
  source: text('source'), // ex: Instagram, Google Ads, Indicação, Webhook
  screeningNotes: text('screening_notes'),
  nextContactAt: timestamp('next_contact_at', { withTimezone: true }),
  lastContactAt: timestamp('last_contact_at', { withTimezone: true }),
  
  // Novos Campos Clínicos
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactRelation: text('emergency_contact_relation'),
  emergencyContactPhone: text('emergency_contact_phone'),
  isMinor: boolean('is_minor').default(false).notNull(),
  acceptedContractAt: timestamp('accepted_contract_at', { withTimezone: true }),

  // Parâmetros de Rastreamento UTM
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmTerm: text('utm_term'),
  utmContent: text('utm_content'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

// ── CRM: Interaction History (Timeline de contatos e logs) ───────────────────
export const interactionHistory = pgTable('interaction_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').$type<'comment' | 'status_change' | 'appointment' | 'email_sent'>().notNull(),
  durationSeconds: integer('duration_seconds'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type InteractionHistory = typeof interactionHistory.$inferSelect;
export type NewInteractionHistory = typeof interactionHistory.$inferInsert;

// ── CRM: Email Campaigns (Campanhas de E-mail White-label) ──────────────────
export const emailCampaigns = pgTable('email_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: text('status').$type<'draft' | 'sending' | 'sent'>().default('draft').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type NewEmailCampaign = typeof emailCampaigns.$inferInsert;

// Tabela de Modelos de Contrato Clínico
export const contractTemplates = pgTable('contract_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(), // Nome identificador (Ex: "Contrato Adulto TCC")
  content: text('content').notNull(), // Corpo do contrato com markdown/html
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tabela de Páginas de Captação
export const capturePages = pgTable('capture_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(), // Caminho relativo padrão (Ex: "terapia")
  isActive: boolean('is_active').default(true).notNull(),

  // Configurações de Domínio & SEO (Aba 3)
  customDomain: text('custom_domain'), // Ex: "terapia.geovannabastos.com.br"
  seoConfig: jsonb('seo_config').$type<{
    metaTitle: string;
    metaDescription: string;
    ogImageUrl?: string;
  }>().notNull(),

  // Configuração Visual & Textos da Landing Page (Aba 1)
  siteConfig: jsonb('site_config').$type<Record<string, any>>().notNull(),

  dictionary: jsonb('dictionary').$type<Record<string, any>>().notNull(),

  // Árvore do Fluxo de Etapas (Aba 2 - React Flow Model)
  formFlow: jsonb('form_flow').$type<Record<string, any>>().notNull(),

  // --- Rascunho / Staging (Salvamento Automático) ---
  titleDraft: text('title_draft'),
  slugDraft: text('slug_draft'),
  customDomainDraft: text('custom_domain_draft'),
  seoConfigDraft: jsonb('seo_config_draft').$type<{
    metaTitle: string;
    metaDescription: string;
    ogImageUrl?: string;
  }>(),
  siteConfigDraft: jsonb('site_config_draft').$type<Record<string, any>>(),
  dictionaryDraft: jsonb('dictionary_draft').$type<Record<string, any>>(),
  formFlowDraft: jsonb('form_flow_draft').$type<Record<string, any>>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tabela de Galeria de Mídia (Compartilhada por Tenant para uso público)
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
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

export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type NewContractTemplate = typeof contractTemplates.$inferInsert;

export type CapturePage = typeof capturePages.$inferSelect;
export type NewCapturePage = typeof capturePages.$inferInsert;

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;



