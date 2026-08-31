import { FastifyInstance } from 'fastify';
import { resolveTxt } from 'dns/promises';
import fs from 'fs';
import path from 'path';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { platformSettings, workspaces, workspaceMembers, workspaceDomains, visualIdentities, emailLogs, mediaAssets, capturePages, contacts, interactionHistory, profiles, errorLogs } from '../../../shared/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { verifyUserJwt, extractJwtFromRequest } from '../../../shared/auth';
import { publishErrorLog } from '../../../shared/queue';
import { S3Client, PutObjectCommand, HeadBucketCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


// Schemas Zod de Validação
const SaveCloudflareBodySchema = z.object({
  api_token: z.string().optional().nullable(),
  zone_id: z.string().min(1, 'Zone ID é obrigatório'),
  account_id: z.string().min(1, 'Account ID é obrigatório'),
  base_domain: z.string().optional().nullable(),
  r2_bucket_name: z.string().min(1, 'Nome do Bucket R2 é obrigatório'),
  r2_public_domain: z.string().min(1, 'Domínio Público do R2 é obrigatório'),
  r2_access_key_id: z.string().optional().nullable(),
  r2_secret_access_key: z.string().optional().nullable(),
});

const SaveDomainsBodySchema = z.object({
  api_token: z.string().optional().nullable(),
  zone_id: z.string().min(1, 'Zone ID é obrigatório'),
  account_id: z.string().min(1, 'Account ID é obrigatório'),
  base_domain: z.string().optional().nullable(),
});

const BackupBucketSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nome do bucket é obrigatório'),
  publicDomain: z.string().min(1, 'Domínio público é obrigatório'),
  accessKeyId: z.string().min(1, 'Access Key ID é obrigatório'),
  secretAccessKey: z.string().min(1, 'Secret Access Key é obrigatória'),
  isBackup: z.boolean().optional(),
});

const SaveStorageBodySchema = z.object({
  r2_bucket_name: z.string().min(1, 'Nome do Bucket R2 é obrigatório'),
  r2_public_domain: z.string().min(1, 'Domínio Público do R2 é obrigatório'),
  r2_access_key_id: z.string().optional().nullable(),
  r2_secret_access_key: z.string().optional().nullable(),
  backup_r2_buckets: z.array(BackupBucketSchema).optional().default([]),
});

const SetupTenantBodySchema = z.object({
  name: z.string().min(1, 'Nome da plataforma é obrigatório'),
  logo_light_url: z.string().optional().nullable(),
  logo_dark_url: z.string().optional().nullable(),
  icon_light_url: z.string().optional().nullable(),
  icon_dark_url: z.string().optional().nullable(),
  gradient_color_start: z.string().default('#4F46E5'),
  gradient_color_end: z.string().default('#06B6D4'),
  contrast_color: z.string().default('#FFFFFF'),
  bg_light_color: z.string().default('#F8FAFC'),
  bg_dark_color: z.string().default('#020617'),
});

export async function platformRoutes(fastifyApp: FastifyInstance) {
  const fastify = fastifyApp.withTypeProvider<ZodTypeProvider>();

  function maskSecret(val?: string | null, prefix = ''): string | null {
    if (!val) return null;
    return `${prefix}••••••••••••••••••••••••`;
  }

  // GET /v1/platform/setup/status
  fastify.get('/setup/status', async (request, reply) => {
    try {
      const settings = await db.query.platformSettings.findFirst();

      const hasCloudflare = !!(
        settings?.cloudflareApiToken &&
        settings?.cloudflareZoneId &&
        settings?.cloudflareAccountId &&
        settings?.baseDomain
      );
      const hasR2 = !!(
        settings?.cloudflareAccountId &&
        settings?.r2BucketName &&
        settings?.r2AccessKeyId &&
        settings?.r2SecretAccessKey
      );
      const hasResendKey = !!(settings?.resendApiKey);
      const hasResendDomain = !!(settings?.resendFromDomain);
      const hasResend = hasResendKey && hasResendDomain;

      const hasVisualIdentity = !!(
        settings?.platformName &&
        settings?.logoLightUrl &&
        settings?.logoDarkUrl
      );

      const isConfigured = hasCloudflare && hasR2 && hasResend && hasVisualIdentity;

      const platformBrand = {
        name: settings?.platformName || 'TheraOS',
        logoLightUrl: settings?.logoLightUrl || null,
        logoDarkUrl: settings?.logoDarkUrl || null,
        iconLightUrl: settings?.iconLightUrl || null,
        iconDarkUrl: settings?.iconDarkUrl || null,
        gradientColorStart: settings?.gradientColorStart || '#7C3AED',
        gradientColorEnd: settings?.gradientColorEnd || '#A855F7',
        contrastColor: settings?.contrastColor || '#FFFFFF',
        bgLightColor: settings?.bgLightColor || '#F8FAFC',
        bgDarkColor: settings?.bgDarkColor || '#09090B',
      };

      let isAdmin = false;
      const jwtToken = extractJwtFromRequest(request);
      if (jwtToken) {
        try {
          const decoded = verifyUserJwt(jwtToken);
          if (decoded && decoded.sub) {
            const profile = await db.query.profiles.findFirst({
              where: eq(profiles.id, decoded.sub),
            });
            if (profile && profile.role === 'admin') {
              isAdmin = true;
            }
          }
        } catch {
          // Token inválido/expirado, tratar como não-admin
        }
      }

      if (isAdmin) {
        return reply.send({
          is_configured: isConfigured,
          has_cloudflare: hasCloudflare,
          has_r2: hasR2,
          has_resend_key: hasResendKey,
          has_resend_domain: hasResendDomain,
          has_resend: hasResend,
          has_visual_identity: hasVisualIdentity,
          cloudflare_api_token: maskSecret(settings?.cloudflareApiToken, 'cfat_'),
          cloudflare_zone_id: settings?.cloudflareZoneId || null,
          cloudflare_account_id: settings?.cloudflareAccountId || null,
          base_domain: settings?.baseDomain || null,
          r2_bucket_name: settings?.r2BucketName || null,
          r2_public_domain: settings?.r2PublicDomain || null,
          r2_access_key_id: maskSecret(settings?.r2AccessKeyId, 'r2ak_'),
          r2_secret_access_key: maskSecret(settings?.r2SecretAccessKey, 'r2sk_'),
          backup_r2_buckets: (Array.isArray(settings?.backupR2Buckets) ? (settings.backupR2Buckets as any[]) : []).map((b: any) => ({
            ...b,
            accessKeyId: maskSecret(b.accessKeyId, 'r2ak_'),
            secretAccessKey: maskSecret(b.secretAccessKey, 'r2sk_'),
          })),
          resend_api_key: maskSecret(settings?.resendApiKey, 're_'),
          resend_from_domain: settings?.resendFromDomain || null,
          primary_tenant: platformBrand,
        });
      }

      return reply.send({
        is_configured: isConfigured,
        primary_tenant: platformBrand,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: 'Erro no servidor',
        message: 'Não foi possível checar o status de configuração da plataforma.',
      });
    }
  });

  // POST /v1/platform/setup/cloudflare (Valida Cloudflare Zone + R2 Bucket via S3)
  fastify.post(
    '/setup/cloudflare',
    {
      schema: {
        body: SaveCloudflareBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, decoded.sub),
        });
        if (!profile || profile.role !== 'admin') {
          return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito a administradores.' });
        }

        const {
          api_token,
          zone_id,
          account_id,
          base_domain,
          r2_bucket_name,
          r2_public_domain,
          r2_access_key_id,
          r2_secret_access_key,
        } = request.body;

        const existingSettings = await db.query.platformSettings.findFirst();

        const isPlaceholder = (val?: string | null) => !val || val.includes('•');

        const effectiveApiToken = isPlaceholder(api_token) ? existingSettings?.cloudflareApiToken : api_token?.trim();
        const effectiveAccessKeyId = isPlaceholder(r2_access_key_id) ? existingSettings?.r2AccessKeyId : r2_access_key_id?.trim();
        const effectiveSecretAccessKey = isPlaceholder(r2_secret_access_key) ? existingSettings?.r2SecretAccessKey : r2_secret_access_key?.trim();

        if (!effectiveApiToken) {
          return reply.status(400).send({
            error: 'Validação do Cloudflare Falhou',
            message: 'Cloudflare API Token é obrigatório.',
          });
        }

        // 1. Testar permissão da Zone no Cloudflare API
        const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone_id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${effectiveApiToken}`,
            'Content-Type': 'application/json',
          },
        }).catch((fetchErr) => {
          throw new Error(`Falha ao conectar com o Cloudflare: ${fetchErr.message}`);
        });

        let zoneName = '';
        if (cfResponse.ok) {
          const zoneData: any = await cfResponse.json().catch(() => ({}));
          zoneName = zoneData?.result?.name || '';
        } else {
          const errorData = await cfResponse.json().catch(() => ({}));
          const message = (errorData as any)?.errors?.[0]?.message || 'API Token ou Zone ID do Cloudflare inválidos.';
          return reply.status(400).send({
            error: 'Validação do Cloudflare Falhou',
            message: `Cloudflare recusou as credenciais da Zone: ${message}`,
          });
        }

        let resolvedBaseDomain = base_domain?.trim() || zoneName || existingSettings?.baseDomain || null;

        // 2. Testar acesso direto ao R2 Bucket via S3 Client (obrigatório)
        if (!effectiveAccessKeyId || !effectiveSecretAccessKey) {
          return reply.status(400).send({
            error: 'Validação do Cloudflare R2 Falhou',
            message: 'R2 Access Key ID e R2 Secret Access Key são obrigatórios.',
          });
        }

        try {
          const s3TestClient = new S3Client({
            region: 'auto',
            endpoint: `https://${account_id.trim()}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: effectiveAccessKeyId,
              secretAccessKey: effectiveSecretAccessKey,
            },
          });

          await s3TestClient.send(new HeadBucketCommand({ Bucket: r2_bucket_name.trim() }));
        } catch (s3Err: any) {
          fastify.log.error(`S3 HeadBucket erro: ${s3Err.message}`);
          return reply.status(400).send({
            error: 'Validação do Bucket R2 Falhou',
            message: `Não foi possível acessar o Bucket R2 "${r2_bucket_name.trim()}": ${s3Err.message || 'Credenciais de S3 inválidas ou Bucket não encontrado.'}`,
          });
        }

        // Normalizar o r2PublicDomain garantindo protocolo https:// e sem barra final
        let formattedDomain = r2_public_domain.trim();
        if (!formattedDomain.startsWith('http://') && !formattedDomain.startsWith('https://')) {
          formattedDomain = `https://${formattedDomain}`;
        }
        if (formattedDomain.endsWith('/')) {
          formattedDomain = formattedDomain.slice(0, -1);
        }

        // 3. Salvar configurações na tabela platform_settings
        if (existingSettings) {
          await db
            .update(platformSettings)
            .set({
              cloudflareApiToken: effectiveApiToken,
              cloudflareZoneId: zone_id.trim(),
              cloudflareAccountId: account_id.trim(),
              baseDomain: resolvedBaseDomain,
              r2BucketName: r2_bucket_name.trim(),
              r2PublicDomain: formattedDomain,
              r2AccessKeyId: effectiveAccessKeyId || '',
              r2SecretAccessKey: effectiveSecretAccessKey || '',
              updatedAt: new Date(),
            })
            .where(eq(platformSettings.id, existingSettings.id));
        } else {
          await db.insert(platformSettings).values({
            cloudflareApiToken: effectiveApiToken,
            cloudflareZoneId: zone_id.trim(),
            cloudflareAccountId: account_id.trim(),
            baseDomain: resolvedBaseDomain,
            r2BucketName: r2_bucket_name.trim(),
            r2PublicDomain: formattedDomain,
            r2AccessKeyId: effectiveAccessKeyId || '',
            r2SecretAccessKey: effectiveSecretAccessKey || '',
          });
        }

        return reply.send({
          message: 'Credenciais do Cloudflare e Bucket R2 validadas e salvas com sucesso!',
          zone_id,
          base_domain: resolvedBaseDomain,
          r2_bucket_name,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Erro na configuração do Cloudflare R2',
          message: err.message || 'Não foi possível validar as credenciais do Cloudflare R2.',
        });
      }
    }
  );

  // POST /v1/platform/cloudflare/domains (Salva exclusivamente credenciais de DNS/Zone/Account ID)
  fastify.post(
    '/cloudflare/domains',
    {
      schema: {
        body: SaveDomainsBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, decoded.sub),
        });
        if (!profile || profile.role !== 'admin') {
          return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito a administradores.' });
        }

        const { api_token, zone_id, account_id, base_domain } = request.body;
        const existingSettings = await db.query.platformSettings.findFirst();
        const isPlaceholder = (val?: string | null) => !val || val.includes('•');
        const effectiveApiToken = isPlaceholder(api_token) ? (existingSettings?.cloudflareApiToken || '') : api_token?.trim();

        if (!effectiveApiToken) {
          return reply.status(400).send({
            error: 'Token do Cloudflare ausente',
            message: 'Informe o Cloudflare API Token para validar o domínio.',
          });
        }

        // Validação da Zone na API do Cloudflare
        const zoneRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone_id.trim()}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${effectiveApiToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!zoneRes.ok) {
          const errData: any = await zoneRes.json().catch(() => ({}));
          const cloudflareMsg = errData?.errors?.[0]?.message || zoneRes.statusText;
          return reply.status(400).send({
            error: 'Zone ID Inválido',
            message: `Não foi possível acessar a Zone no Cloudflare: ${cloudflareMsg}`,
          });
        }

        const zoneData: any = await zoneRes.json();
        const resolvedBaseDomain = zoneData.result?.name || base_domain?.trim() || '';

        if (existingSettings) {
          await db
            .update(platformSettings)
            .set({
              cloudflareApiToken: effectiveApiToken,
              cloudflareZoneId: zone_id.trim(),
              cloudflareAccountId: account_id.trim(),
              baseDomain: resolvedBaseDomain,
              updatedAt: new Date(),
            })
            .where(eq(platformSettings.id, existingSettings.id));
        } else {
          await db.insert(platformSettings).values({
            cloudflareApiToken: effectiveApiToken,
            cloudflareZoneId: zone_id.trim(),
            cloudflareAccountId: account_id.trim(),
            baseDomain: resolvedBaseDomain,
          });
        }

        return reply.send({
          message: 'Configurações de Domínio do Cloudflare salvas com sucesso!',
          zone_id,
          base_domain: resolvedBaseDomain,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Erro na configuração de domínios',
          message: err.message || 'Não foi possível salvar os domínios do Cloudflare.',
        });
      }
    }
  );

  // POST /v1/platform/cloudflare/storage (Salva Bucket Principal R2 + Array de Buckets de Reserva)
  fastify.post(
    '/cloudflare/storage',
    {
      schema: {
        body: SaveStorageBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, decoded.sub),
        });
        if (!profile || profile.role !== 'admin') {
          return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito a administradores.' });
        }

        const { r2_bucket_name, r2_public_domain, r2_access_key_id, r2_secret_access_key, backup_r2_buckets } = request.body;
        const existingSettings = await db.query.platformSettings.findFirst();

        const isPlaceholder = (val?: string | null) => !val || val.includes('•');

        const effectiveAccessKeyId = isPlaceholder(r2_access_key_id) ? (existingSettings?.r2AccessKeyId || '') : r2_access_key_id?.trim();
        const effectiveSecretAccessKey = isPlaceholder(r2_secret_access_key) ? (existingSettings?.r2SecretAccessKey || '') : r2_secret_access_key?.trim();

        const processedBackupBuckets = (backup_r2_buckets || []).map((b: any) => {
          const isKeyPlaceholder = isPlaceholder(b.accessKeyId);
          const isSecretPlaceholder = isPlaceholder(b.secretAccessKey);
          
          let originalBucket = null;
          if (isKeyPlaceholder || isSecretPlaceholder) {
            originalBucket = (Array.isArray(existingSettings?.backupR2Buckets) ? (existingSettings.backupR2Buckets as any[]) : []).find((old: any) => old.id === b.id);
          }

          return {
            ...b,
            accessKeyId: isKeyPlaceholder ? (originalBucket?.accessKeyId || '') : b.accessKeyId.trim(),
            secretAccessKey: isSecretPlaceholder ? (originalBucket?.secretAccessKey || '') : b.secretAccessKey.trim(),
          };
        });

        let formattedDomain = r2_public_domain.trim();
        if (!formattedDomain.startsWith('http://') && !formattedDomain.startsWith('https://')) {
          formattedDomain = `https://${formattedDomain}`;
        }
        if (formattedDomain.endsWith('/')) {
          formattedDomain = formattedDomain.slice(0, -1);
        }

        if (existingSettings) {
          await db
            .update(platformSettings)
            .set({
              r2BucketName: r2_bucket_name.trim(),
              r2PublicDomain: formattedDomain,
              r2AccessKeyId: effectiveAccessKeyId,
              r2SecretAccessKey: effectiveSecretAccessKey,
              backupR2Buckets: processedBackupBuckets,
              updatedAt: new Date(),
            })
            .where(eq(platformSettings.id, existingSettings.id));
        } else {
          await db.insert(platformSettings).values({
            r2BucketName: r2_bucket_name.trim(),
            r2PublicDomain: formattedDomain,
            r2AccessKeyId: effectiveAccessKeyId,
            r2SecretAccessKey: effectiveSecretAccessKey,
            backupR2Buckets: processedBackupBuckets,
          });
        }

        return reply.send({
          message: 'Configurações de Armazenamento R2 salvas com sucesso!',
          r2_bucket_name,
          backup_buckets_count: (backup_r2_buckets || []).length,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Erro na configuração de armazenamento R2',
          message: err.message || 'Não foi possível salvar o armazenamento R2.',
        });
      }
    }
  );

  // GET /v1/platform/cloudflare/zones
  // Lista todas as Zones (Domínios) disponíveis na conta Cloudflare
  fastify.get('/cloudflare/zones', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
      }
      verifyUserJwt(authHeader.split(' ')[1]);

      const queryApiToken = (request.query as any)?.api_token;
      let token = queryApiToken?.trim();

      if (!token) {
        const settings = await db.query.platformSettings.findFirst();
        token = settings?.cloudflareApiToken;
      }

      if (!token) {
        return reply.send({ success: true, zones: [] });
      }

      const response = await fetch('https://api.cloudflare.com/client/v4/zones?per_page=50', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errData: any = await response.json().catch(() => ({}));
        const msg = errData?.errors?.[0]?.message || 'Falha ao consultar zones do Cloudflare.';
        return reply.status(400).send({ error: 'Erro Cloudflare API', message: msg });
      }

      const data: any = await response.json();
      const zones = (data.result || []).map((z: any) => ({
        id: z.id,
        name: z.name,
        status: z.status,
      }));

      return reply.send({ success: true, zones });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro interno', message: err.message });
    }
  });

  // POST /v1/platform/cloudflare/test-permissions
  // Testa a conexão do Token da API do Cloudflare, valida a Zone e verifica as permissões.
  fastify.post('/cloudflare/test-permissions', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
      }
      verifyUserJwt(authHeader.split(' ')[1]);

      const body: any = request.body || {};
      const existingSettings = await db.query.platformSettings.findFirst();
      const token = body.api_token?.trim() || existingSettings?.cloudflareApiToken || '';
      const zoneId = body.zone_id?.trim() || existingSettings?.cloudflareZoneId || '';

      if (!token) {
        return reply.status(400).send({ error: 'Token Ausente', message: 'Informe o Cloudflare API Token.' });
      }

      // 1. Verificar Token e Zone na API do Cloudflare
      let zoneName = existingSettings?.baseDomain || '';
      let zoneActive = false;
      let sslStatus = 'active';
      let tokenValid = false;

      if (zoneId) {
        const zoneRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (zoneRes.ok) {
          const zoneData: any = await zoneRes.json();
          if (zoneData.success && zoneData.result) {
            tokenValid = true;
            zoneName = zoneData.result.name;
            zoneActive = zoneData.result.status === 'active';
            sslStatus = zoneData.result.ssl?.status || 'active';
          }
        }
      }

      if (!tokenValid) {
        const verifyRes = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (verifyRes.ok) {
          const verifyData: any = await verifyRes.json().catch(() => ({}));
          tokenValid = verifyData.success === true;
        }
      }

      return reply.send({
        success: true,
        tokenValid,
        zoneActive,
        zoneName,
        sslStatus,
        permissions: [
          {
            name: 'Autenticação API Token',
            status: tokenValid ? 'ok' : 'error',
            detail: tokenValid ? 'Token ativo e autenticado com sucesso.' : 'Token inválido ou expirado.',
          },
          {
            name: 'Status do Domínio (Zone)',
            status: zoneActive ? 'ok' : 'warning',
            detail: zoneActive ? `Domínio ${zoneName} ativo no Cloudflare.` : `Zone ID ${zoneId || 'não configurado'} pendente.`,
          },
          {
            name: 'Certificados SSL / TLS',
            status: sslStatus === 'active' || sslStatus === 'ok' ? 'ok' : 'warning',
            detail: `Status SSL: ${sslStatus}.`,
          },
        ],
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro de teste', message: err.message || 'Falha ao testar permissões.' });
    }
  });

  // POST /v1/platform/upload/presign
  // Gera uma Presigned URL para o cliente fazer upload diretamente no Cloudflare R2.
  // O arquivo NUNCA passa pela VPS — apenas a URL assinada é gerada aqui.
  fastify.post(
    '/upload/presign',
    {
      schema: {
        body: z.object({
          filename: z.string().min(1, 'filename é obrigatório'),
          content_type: z.string().min(1, 'content_type é obrigatório'),
          upload_type: z.enum(['avatar', 'logo', 'icon', 'asset', 'font']).default('asset'),
        }),
      },
    },
    async (request, reply) => {
      try {
        // 1. Validar JWT
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        verifyUserJwt(authHeader.split(' ')[1]);

        // 2. Buscar credenciais do R2
        const settings = await db.query.platformSettings.findFirst();
        if (
          !settings ||
          !settings.cloudflareAccountId ||
          !settings.r2BucketName ||
          !settings.r2AccessKeyId ||
          !settings.r2SecretAccessKey
        ) {
          return reply.status(400).send({
            error: 'R2 Não Configurado',
            message: 'As credenciais do Cloudflare R2 ainda não foram salvas na plataforma.',
          });
        }

        const { filename, content_type, upload_type } = request.body;

        // 3. Enforce MIME type rules per upload_type — server-side, cannot be bypassed
        const ALL_IMAGE_MIMES  = ['image/webp', 'image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
        const FONT_SAFE_MIMES   = [
          'font/woff2', 'font/woff', 'font/ttf', 'font/otf',
          'application/font-woff', 'application/font-woff2',
          'font/opentype', 'application/x-font-ttf', 'application/x-font-opentype'
        ];

        if ((upload_type === 'logo' || upload_type === 'icon' || upload_type === 'avatar' || upload_type === 'asset') && !ALL_IMAGE_MIMES.includes(content_type)) {
          return reply.status(422).send({
            error: 'Tipo de arquivo inválido',
            message: `Imagens devem ser enviadas nos formatos WebP, PNG, JPEG ou SVG. Tipo recebido: ${content_type}`,
          });
        }

        if (upload_type === 'font' && (!FONT_SAFE_MIMES.includes(content_type) && !filename.match(/\.(woff2|woff|ttf|otf)$/i))) {
          return reply.status(422).send({
            error: 'Tipo de arquivo inválido',
            message: 'Fontes personalizadas devem ser enviadas em formato .woff2, .woff, .ttf ou .otf. Formatos SVG/XML não são permitidos.',
          });
        }

        // 4. Derive extension from the actual content_type (not hardcoded to .webp)
        const EXT_MAP: Record<string, string> = {
          'image/webp':     'webp',
          'image/png':      'png',
          'image/jpeg':     'jpg',
          'image/jpg':      'jpg',
          'image/svg+xml':  'svg',
          'font/woff2':     'woff2',
          'font/woff':      'woff',
          'font/ttf':       'ttf',
          'font/otf':       'otf',
        };
        const ext = EXT_MAP[content_type] || (filename.split('.').pop()?.toLowerCase() ?? 'bin');

        // 5. Sanitizar filename e montar chave única no R2
        const baseName = filename.split('.').slice(0, -1).join('.') || 'file';
        const cleanName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 60);
        const fileKey = `media/${upload_type}/${cleanName}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        // 6. Criar cliente S3 apontado para o R2
        const s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${settings.cloudflareAccountId.trim()}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: settings.r2AccessKeyId.trim(),
            secretAccessKey: settings.r2SecretAccessKey.trim(),
          },
        });

        // 7. Gerar a Presigned URL (PUT) — expira em 5 minutos
        const command = new PutObjectCommand({
          Bucket: settings.r2BucketName.trim(),
          Key: fileKey,
          ContentType: content_type,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        const publicDomain = settings.r2PublicDomain
          ? settings.r2PublicDomain.replace(/\/$/, '')
          : `https://${settings.r2BucketName}.${settings.cloudflareAccountId}.r2.cloudflarestorage.com`;

        const publicUrl = `${publicDomain}/${fileKey}`;

        return reply.send({
          upload_url: uploadUrl,
          public_url: publicUrl,
          key: fileKey,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Erro ao gerar URL de upload',
          message: err.message || 'Não foi possível gerar a Presigned URL.',
        });
      }
    }
  );

  // POST /v1/platform/upload/direct (Fallback de upload multipart via API backend)
  fastify.post('/upload/direct', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
      }
      verifyUserJwt(authHeader.split(' ')[1]);

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'Upload Falhou', message: 'Nenhum arquivo foi enviado.' });
      }

      const buffer = await data.toBuffer();
      const filename = data.filename || 'upload.png';
      const mimetype = data.mimetype || 'image/png';

      const fields: any = data.fields;
      const uploadType = fields?.upload_type?.value || 'asset';

      const settings = await db.query.platformSettings.findFirst();
      if (
        !settings ||
        !settings.cloudflareAccountId ||
        !settings.r2BucketName ||
        !settings.r2AccessKeyId ||
        !settings.r2SecretAccessKey
      ) {
        return reply.status(400).send({
          error: 'R2 Não Configurado',
          message: 'As credenciais do Cloudflare R2 não estão configuradas.',
        });
      }

      const ext = mimetype.split('/')[1] || 'png';
      const cleanName = filename.split('.')[0].replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 60);
      const uniqueFileName = `${cleanName}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const fileKey = `media/${uploadType}/${uniqueFileName}`;

      try {
        const s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${settings.cloudflareAccountId.trim()}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: settings.r2AccessKeyId.trim(),
            secretAccessKey: settings.r2SecretAccessKey.trim(),
          },
        });

        await s3Client.send(
          new PutObjectCommand({
            Bucket: settings.r2BucketName.trim(),
            Key: fileKey,
            Body: buffer,
            ContentType: mimetype,
          })
        );

        const publicDomain = settings.r2PublicDomain
          ? settings.r2PublicDomain.replace(/\/$/, '')
          : `https://${settings.r2BucketName}.${settings.cloudflareAccountId}.r2.cloudflarestorage.com`;

        const publicUrl = `${publicDomain}/${fileKey}`;

        return reply.send({
          url: publicUrl,
          public_url: publicUrl,
          key: fileKey,
        });
      } catch (s3Err: any) {
        fastify.log.warn(`S3 PutObject no Cloudflare R2 falhou (${s3Err.message}). Utilizando fallback de storage local.`);
        const localDir = path.join(process.cwd(), 'uploads', uploadType);
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        const localFilePath = path.join(localDir, uniqueFileName);
        fs.writeFileSync(localFilePath, buffer);

        const protocol = request.protocol || 'http';
        const host = request.headers.host || `localhost:${process.env.PORT || 5000}`;
        const localUrl = `${protocol}://${host}/v1/platform/files/${uploadType}/${uniqueFileName}`;

        return reply.send({
          url: localUrl,
          public_url: localUrl,
          key: fileKey,
        });
      }
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: 'Erro no Upload Direto',
        message: err.message || 'Falha ao processar upload direto.',
      });
    }
  });

  // GET /v1/platform/files/:type/:filename (Servidor de arquivos locais de fallback)
  fastify.get('/files/:type/:filename', async (request, reply) => {
    const { type, filename } = request.params as { type: string; filename: string };
    const filePath = path.join(process.cwd(), 'uploads', type, filename);
    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' });
    }
    const buffer = fs.readFileSync(filePath);
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };
    reply.type(mimeMap[ext || ''] || 'application/octet-stream');
    return reply.send(buffer);
  });

  // GET /v1/platform/media
  // Lista todos os assets não-cropped de um determinado tenant
  fastify.get(
    '/media',
    {
      schema: {
        querystring: z.object({
          tenantId: z.string().uuid('ID do Tenant inválido'),
        }),
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);

        const query = request.query as any;
        const targetWorkspaceId = query.workspaceId || query.tenantId;

        // Validar se o usuário pertence ao workspace
        const targetWorkspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, targetWorkspaceId),
        });

        if (!targetWorkspace) {
          return reply.status(404).send({ error: 'Não Encontrado', message: 'Workspace não cadastrado.' });
        }

        const isOwner = targetWorkspace.ownerId === decoded.sub;
        
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, decoded.sub),
        });
        const isAdmin = profile?.role === 'admin';

        const member = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, decoded.sub),
            eq(workspaceMembers.workspaceId, targetWorkspaceId)
          ),
        });

        if (!isOwner && !member && !isAdmin) {
          return reply.status(403).send({ error: 'Proibido', message: 'Você não tem acesso a este workspace.' });
        }

        // Buscar assets (todos os assets do workspace, ordenados pelos mais recentes)
        const assets = await db.query.mediaAssets.findMany({
          where: eq(mediaAssets.workspaceId, targetWorkspaceId),
          orderBy: desc(mediaAssets.createdAt),
        });

        return reply.send(assets);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );

  // POST /v1/platform/media
  // Cadastra um novo media asset
  fastify.post(
    '/media',
    {
      schema: {
        body: z.object({
          workspaceId: z.string().uuid('ID do Workspace inválido').optional(),
          tenantId: z.string().uuid('ID do Workspace inválido').optional(),
          name: z.string().min(1, 'Nome é obrigatório'),
          key: z.string().min(1, 'Chave é obrigatória'),
          url: z.string().url('URL inválida'),
          mimeType: z.string().min(1, 'Tipo MIME é obrigatório'),
          fileSize: z.number().int().positive(),
          width: z.number().int().optional().nullable(),
          height: z.number().int().optional().nullable(),
          isCropped: z.boolean().default(false),
          parentId: z.string().uuid().optional().nullable(),
          usageContext: z.string().optional().nullable(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);

        const body = request.body as any;
        const targetWorkspaceId = body.workspaceId || body.tenantId;

        // Validar se o usuário pertence ao workspace
        const targetWorkspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, targetWorkspaceId),
        });

        if (!targetWorkspace) {
          return reply.status(404).send({ error: 'Não Encontrado', message: 'Workspace não cadastrado.' });
        }

        const isOwner = targetWorkspace.ownerId === decoded.sub;
        
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, decoded.sub),
        });
        const isAdmin = profile?.role === 'admin';

        const member = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, decoded.sub),
            eq(workspaceMembers.workspaceId, targetWorkspaceId)
          ),
        });

        if (!isOwner && !member && !isAdmin) {
          return reply.status(403).send({ error: 'Proibido', message: 'Você não tem acesso a este tenant.' });
        }

        // Lógica de Segurança: Apenas logotipos e favicons podem ter transparência (PNG, SVG, etc.).
        // Imagens normais devem ser JPG/WebP opacas. Se o usuário tentar burlar, bloqueamos a inserção.
        const isLogoOrFavicon = 
          body.usageContext === 'siteConfig.logoUrl' || 
          body.usageContext === 'siteConfig.faviconUrl' ||
          body.key.includes('media/logo/') ||
          body.key.includes('media/icon/');

        if (!isLogoOrFavicon) {
          const forbiddenTypes = ['image/png', 'image/svg+xml', 'image/gif'];
          const isForbiddenMime = forbiddenTypes.includes(body.mimeType.toLowerCase());
          const isForbiddenExt = 
            body.key.endsWith('.png') || 
            body.key.endsWith('.svg') || 
            body.key.endsWith('.gif') ||
            body.name.endsWith('.png') || 
            body.name.endsWith('.svg') || 
            body.name.endsWith('.gif');

          if (isForbiddenMime || isForbiddenExt) {
            return reply.status(400).send({
              error: 'Formato inválido',
              message: 'Imagens gerais não podem ter fundo transparente. Apenas logotipos e favicons permitem este formato.',
            });
          }
        }

        // Lógica Anti-Lixo: se for cropped e tiver context, remove o crop antigo
        if (body.isCropped && body.usageContext) {
          const oldCrop = await db.query.mediaAssets.findFirst({
            where: and(
              eq(mediaAssets.workspaceId, targetWorkspaceId),
              eq(mediaAssets.usageContext, body.usageContext)
            ),
          });

          if (oldCrop) {
            // 1. Excluir do Cloudflare R2
            try {
              const settings = await db.query.platformSettings.findFirst();
              if (settings && settings.cloudflareAccountId && settings.r2BucketName && settings.r2AccessKeyId && settings.r2SecretAccessKey) {
                const s3Client = new S3Client({
                  region: 'auto',
                  endpoint: `https://${settings.cloudflareAccountId.trim()}.r2.cloudflarestorage.com`,
                  credentials: {
                    accessKeyId: settings.r2AccessKeyId.trim(),
                    secretAccessKey: settings.r2SecretAccessKey.trim(),
                  },
                });

                await s3Client.send(
                  new DeleteObjectCommand({
                    Bucket: settings.r2BucketName.trim(),
                    Key: oldCrop.key,
                  })
                );
              }
            } catch (s3Err) {
              fastify.log.warn({ err: s3Err }, `Falha ao excluir R2 object ${oldCrop.key}`);
            }

            // 2. Remover do banco de dados
            await db.delete(mediaAssets).where(eq(mediaAssets.id, oldCrop.id));
          }
        }

        // Inserir novo asset
        const [newAsset] = await db
          .insert(mediaAssets)
          .values({
            workspaceId: body.workspaceId || body.tenantId,
            name: body.name,
            key: body.key,
            url: body.url,
            mimeType: body.mimeType,
            fileSize: body.fileSize,
            width: body.width || null,
            height: body.height || null,
            isCropped: body.isCropped,
            parentId: body.parentId || null,
            usageContext: body.usageContext || null,
          })
          .returning();

        return reply.send(newAsset);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );

  // DELETE /v1/platform/media/:id
  // Exclui um asset da biblioteca e do R2
  fastify.delete(
    '/media/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid('ID inválido'),
        }),
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);

        const { id } = request.params;

        // Buscar asset
        const asset = await db.query.mediaAssets.findFirst({
          where: eq(mediaAssets.id, id),
        });

        if (!asset) {
          return reply.status(404).send({ error: 'Não Encontrado', message: 'Asset não encontrado.' });
        }

        // Validar se o usuário pertence ao workspace do asset
        const targetWorkspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, asset.workspaceId),
        });

        if (!targetWorkspace) {
          return reply.status(404).send({ error: 'Não Encontrado', message: 'Workspace não cadastrado.' });
        }

        const isOwner = targetWorkspace.ownerId === decoded.sub;
        const member = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, decoded.sub),
            eq(workspaceMembers.workspaceId, asset.workspaceId)
          ),
        });

        if (!isOwner && !member) {
          return reply.status(403).send({ error: 'Proibido', message: 'Você não tem permissão para remover assets deste workspace.' });
        }

        // 1. Excluir do Cloudflare R2
        try {
          const settings = await db.query.platformSettings.findFirst();
          if (settings && settings.cloudflareAccountId && settings.r2BucketName && settings.r2AccessKeyId && settings.r2SecretAccessKey) {
            const s3Client = new S3Client({
              region: 'auto',
              endpoint: `https://${settings.cloudflareAccountId.trim()}.r2.cloudflarestorage.com`,
              credentials: {
                accessKeyId: settings.r2AccessKeyId.trim(),
                secretAccessKey: settings.r2SecretAccessKey.trim(),
              },
            });

            await s3Client.send(
              new DeleteObjectCommand({
                Bucket: settings.r2BucketName.trim(),
                Key: asset.key,
              })
            );
          }
        } catch (s3Err) {
          fastify.log.warn({ err: s3Err }, `Falha ao excluir R2 object ${asset.key}`);
        }

        // 2. Remover do banco de dados
        await db.delete(mediaAssets).where(eq(mediaAssets.id, id));

        return reply.send({ message: 'Asset removido com sucesso.' });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );

  // POST /v1/platform/setup/tenant (Cadastra/Atualiza a Marca da Plataforma em platform_settings)
  fastify.post(
    '/setup/tenant',
    {
      schema: {
        body: SetupTenantBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        verifyUserJwt(authHeader.split(' ')[1]);

        const body = request.body;

        const existingSettings = await db.query.platformSettings.findFirst();
        const settingsData = {
          platformName: body.name || 'TheraOS',
          logoLightUrl: body.logo_light_url || null,
          logoDarkUrl: body.logo_dark_url || null,
          iconLightUrl: body.icon_light_url || null,
          iconDarkUrl: body.icon_dark_url || null,
          gradientColorStart: body.gradient_color_start || '#7C3AED',
          gradientColorEnd: body.gradient_color_end || '#A855F7',
          contrastColor: body.contrast_color || '#FFFFFF',
          bgLightColor: body.bg_light_color || '#F8FAFC',
          bgDarkColor: body.bg_dark_color || '#09090B',
          updatedAt: new Date(),
        };

        let updatedSettings;
        if (existingSettings) {
          [updatedSettings] = await db
            .update(platformSettings)
            .set(settingsData)
            .where(eq(platformSettings.id, existingSettings.id))
            .returning();
        } else {
          [updatedSettings] = await db
            .insert(platformSettings)
            .values(settingsData)
            .returning();
        }

        return reply.status(201).send({
          message: 'Identidade visual da plataforma salva em platform_settings!',
          settings: updatedSettings,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Erro ao configurar Plataforma',
          message: err.message || 'Não foi possível salvar a marca da plataforma.',
        });
      }
    }
  );

  // GET /v1/platform/tenant/primary (Público - Retorna a Marca do SaaS em platform_settings)
  fastify.get('/tenant/primary', async (request, reply) => {
    try {
      const settings = await db.query.platformSettings.findFirst();

      const platformBrand = {
        name: settings?.platformName || 'TheraOS',
        logoLightUrl: settings?.logoLightUrl || null,
        logoDarkUrl: settings?.logoDarkUrl || null,
        iconLightUrl: settings?.iconLightUrl || null,
        iconDarkUrl: settings?.iconDarkUrl || null,
        gradientColorStart: settings?.gradientColorStart || '#7C3AED',
        gradientColorEnd: settings?.gradientColorEnd || '#A855F7',
        contrastColor: settings?.contrastColor || '#FFFFFF',
        bgLightColor: settings?.bgLightColor || '#F8FAFC',
        bgDarkColor: settings?.bgDarkColor || '#09090B',
      };

      return reply.send({
        tenant: platformBrand,
      });
    } catch (err: any) {
      return reply.status(500).send({
        error: 'Erro no servidor',
        message: 'Não foi possível buscar a marca da plataforma.',
      });
    }
  });

  // PUT /v1/platform/tenant/primary (Atualizar configurações White-Label da Plataforma em platform_settings)
  fastify.put(
    '/tenant/primary',
    {
      schema: {
        body: z.object({
          name: z.string().min(1).optional(),
          logo_light_url: z.string().optional().nullable(),
          logo_dark_url: z.string().optional().nullable(),
          icon_light_url: z.string().optional().nullable(),
          icon_dark_url: z.string().optional().nullable(),
          gradient_color_start: z.string().optional(),
          gradient_color_end: z.string().optional(),
          contrast_color: z.string().optional(),
          bg_light_color: z.string().optional(),
          bg_dark_color: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        verifyUserJwt(authHeader.split(' ')[1]);

        const body = request.body;
        const existingSettings = await db.query.platformSettings.findFirst();

        const updatePayload: Record<string, any> = { updatedAt: new Date() };
        if (body.name) updatePayload.platformName = body.name;
        if (body.logo_light_url !== undefined) updatePayload.logoLightUrl = body.logo_light_url;
        if (body.logo_dark_url !== undefined) updatePayload.logoDarkUrl = body.logo_dark_url;
        if (body.icon_light_url !== undefined) updatePayload.iconLightUrl = body.icon_light_url;
        if (body.icon_dark_url !== undefined) updatePayload.iconDarkUrl = body.icon_dark_url;
        if (body.gradient_color_start) updatePayload.gradientColorStart = body.gradient_color_start;
        if (body.gradient_color_end) updatePayload.gradientColorEnd = body.gradient_color_end;
        if (body.contrast_color) updatePayload.contrastColor = body.contrast_color;
        if (body.bg_light_color) updatePayload.bgLightColor = body.bg_light_color;
        if (body.bg_dark_color) updatePayload.bgDarkColor = body.bg_dark_color;

        let updatedSettings: any;
        if (existingSettings) {
          [updatedSettings] = await db
            .update(platformSettings)
            .set(updatePayload)
            .where(eq(platformSettings.id, existingSettings.id))
            .returning();
        } else {
          [updatedSettings] = await db
            .insert(platformSettings)
            .values(updatePayload as any)
            .returning();
        }

        const platformBrand = {
          name: updatedSettings?.platformName || 'TheraOS',
          logoLightUrl: updatedSettings?.logoLightUrl || null,
          logoDarkUrl: updatedSettings?.logoDarkUrl || null,
          iconLightUrl: updatedSettings?.iconLightUrl || null,
          iconDarkUrl: updatedSettings?.iconDarkUrl || null,
          gradientColorStart: updatedSettings?.gradientColorStart || '#7C3AED',
          gradientColorEnd: updatedSettings?.gradientColorEnd || '#A855F7',
          contrastColor: updatedSettings?.contrastColor || '#FFFFFF',
          bgLightColor: updatedSettings?.bgLightColor || '#F8FAFC',
          bgDarkColor: updatedSettings?.bgDarkColor || '#09090B',
        };

        return reply.send({
          message: 'Configurações White-Label da Plataforma salvas em platform_settings!',
          tenant: platformBrand,
          settings: updatedSettings,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Erro ao atualizar',
          message: err.message || 'Não foi possível atualizar as configurações.',
        });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  // POST /v1/platform/setup/resend
  // Valida a API key do Resend, cadastra o domínio automaticamente se não existir,
  // e salva as configurações no banco de dados.
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/setup/resend',
    {
      schema: {
        body: z.object({
          resend_api_key: z.string().min(1, 'API Key do Resend é obrigatória'),
          resend_from_domain: z
            .string()
            .min(1, 'Domínio de envio é obrigatório')
            .regex(
              /^[a-zA-Z0-9][a-zA-Z0-9-_.]*\.[a-zA-Z]{2,}$/,
              'Domínio inválido (ex: seudominio.com.br)'
            ),
        }),
      },
    },
    async (request, reply) => {
      try {
        // Autenticação
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, decoded.sub),
        });
        if (!profile || profile.role !== 'admin') {
          return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito a administradores.' });
        }

        const { resend_api_key, resend_from_domain } = request.body;
        const normalizedInput = resend_from_domain.replace(/^@/, '').toLowerCase();
        const existingSettings = await db.query.platformSettings.findFirst();

        const isPlaceholder = (val?: string | null) => !val || val.includes('•');
        const apiKeyToUse = isPlaceholder(resend_api_key) ? existingSettings?.resendApiKey : resend_api_key.trim();

        if (!apiKeyToUse) {
          return reply.status(400).send({
            error: 'API Key inválida',
            message: 'API Key do Resend é obrigatória.',
          });
        }

        // 1. Validar a API key do Resend listando os domínios
        const resendRes = await fetch('https://api.resend.com/domains', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKeyToUse}`,
            'Content-Type': 'application/json',
          },
        }).catch((fetchErr) => {
          throw new Error(`Não foi possível conectar à API do Resend: ${fetchErr.message}`);
        });

        if (!resendRes.ok) {
          const errorData = await resendRes.json().catch(() => ({}));
          const message =
            (errorData as any)?.message ||
            (errorData as any)?.name ||
            'API Key do Resend inválida ou sem permissão.';
          return reply.status(400).send({
            error: 'Validação do Resend Falhou',
            message: `Resend rejeitou a API Key: ${message}`,
          });
        }

        // 2. Verificar se o domínio já está cadastrado no Resend
        const resendData = (await resendRes.json()) as { data?: { id: string; name: string; status: string }[] };
        const domains: { id: string; name: string; status: string }[] = resendData?.data ?? [];
        let domainMatch = domains.find((d) => d.name.toLowerCase() === normalizedInput);

        // 3. Se o domínio não existir no Resend, cadastra ele automaticamente!
        if (!domainMatch) {
          fastify.log.info(`Domínio "${normalizedInput}" não encontrado no Resend. Cadastrando automaticamente...`);
          const createRes = await fetch('https://api.resend.com/domains', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKeyToUse}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: normalizedInput }),
          });

          if (!createRes.ok) {
            const createErr = await createRes.json().catch(() => ({}));
            throw new Error(
              (createErr as any)?.message ||
                `Não foi possível cadastrar o domínio "${normalizedInput}" na sua conta do Resend.`
            );
          }

          domainMatch = (await createRes.json()) as { id: string; name: string; status: string };
        }

        // 4. Salvar no banco (upsert no platformSettings)
        if (existingSettings) {
          await db
            .update(platformSettings)
            .set({
              resendApiKey: apiKeyToUse,
              resendFromDomain: normalizedInput,
              hasResend: true,
              updatedAt: new Date(),
            })
            .where(eq(platformSettings.id, existingSettings.id));
        } else {
          await db.insert(platformSettings).values({
            resendApiKey: apiKeyToUse,
            resendFromDomain: normalizedInput,
            hasResend: true,
          });
        }

        return reply.send({
          message: `✅ Resend configurado e domínio "${normalizedInput}" cadastrado com sucesso! Configure os registros DNS exibidos a seguir.`,
          resend_from_domain: normalizedInput,
          domain_status: domainMatch.status,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Erro ao configurar Resend',
          message: err.message || 'Não foi possível salvar as configurações do Resend.',
        });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PUT /v1/platform/resend
  // Atualiza a configuração do Resend (usado na aba de Settings)
  // ──────────────────────────────────────────────────────────────────────────
  fastify.put(
    '/resend',
    {
      schema: {
        body: z.object({
          resend_api_key: z.string().min(1).optional(),
          resend_from_domain: z.string().min(1).optional(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, decoded.sub),
        });
        if (!profile || profile.role !== 'admin') {
          return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito a administradores.' });
        }

        const { resend_api_key, resend_from_domain } = request.body;

        const existingSettings = await db.query.platformSettings.findFirst();

        const isPlaceholder = (val?: string | null) => !val || val.includes('•');
        const hasNewApiKey = resend_api_key && !isPlaceholder(resend_api_key);

        const apiKeyToUse = hasNewApiKey ? resend_api_key.trim() : existingSettings?.resendApiKey;
        const domainToUse = resend_from_domain || existingSettings?.resendFromDomain;

        if (!apiKeyToUse) {
          return reply.status(400).send({
            error: 'Configuração inválida',
            message: 'API Key do Resend ausente. Insira uma API Key para salvar.',
          });
        }

        // Se houver nova API key ou novo domínio, realiza validação e cadastro se necessário
        if (hasNewApiKey || resend_from_domain) {
          const resendRes = await fetch('https://api.resend.com/domains', {
            method: 'GET',
            headers: { Authorization: `Bearer ${apiKeyToUse}` },
          }).catch((e) => {
            throw new Error(`Erro ao conectar ao Resend: ${e.message}`);
          });

          if (!resendRes.ok) {
            const errorData = await resendRes.json().catch(() => ({}));
            throw new Error((errorData as any)?.message || 'API Key do Resend inválida.');
          }

          if (domainToUse) {
            const resendData = (await resendRes.json()) as { data?: { id: string; name: string; status: string }[] };
            const domains = resendData?.data ?? [];
            const normalizedInput = domainToUse.replace(/^@/, '').toLowerCase();
            let domainMatch = domains.find((d) => d.name.toLowerCase() === normalizedInput);

            // Se o domínio informado não existe no Resend do usuário, cadastra automaticamente
            if (!domainMatch) {
              fastify.log.info(`Domínio "${normalizedInput}" não encontrado. Cadastrando automaticamente no Resend...`);
              const createRes = await fetch('https://api.resend.com/domains', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${apiKeyToUse}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: normalizedInput }),
              });

              if (!createRes.ok) {
                const createErr = await createRes.json().catch(() => ({}));
                throw new Error(
                  (createErr as any)?.message ||
                    `Não foi possível cadastrar o domínio "${normalizedInput}" no Resend.`
                );
              }
            }
          }
        }

        // Salvar no banco (upsert)
        if (existingSettings) {
          await db
            .update(platformSettings)
            .set({
              ...(apiKeyToUse ? { resendApiKey: apiKeyToUse, hasResend: true } : {}),
              ...(resend_from_domain ? { resendFromDomain: resend_from_domain.replace(/^@/, '').toLowerCase() } : {}),
              updatedAt: new Date(),
            })
            .where(eq(platformSettings.id, existingSettings.id));
        } else {
          await db.insert(platformSettings).values({
            resendApiKey: apiKeyToUse || null,
            resendFromDomain: resend_from_domain ? resend_from_domain.replace(/^@/, '').toLowerCase() : null,
            hasResend: !!apiKeyToUse,
          });
        }

        return reply.send({
          message: 'Configurações do Resend atualizadas com sucesso!',
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Erro ao atualizar',
          message: err.message || 'Não foi possível atualizar as configurações do Resend.',
        });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GET /v1/platform/resend/dns
  // Busca os registros DNS do domínio configurado diretamente na API do Resend.
  // Usado pelo componente DnsVerifier para exibir quais entradas devem ser
  // adicionadas no DNS e qual o status de verificação de cada uma.
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get('/resend/dns', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
      }
      const decoded = verifyUserJwt(authHeader.split(' ')[1]);
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, decoded.sub),
      });
      if (!profile || profile.role !== 'admin') {
        return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito a administradores.' });
      }

      const settings = await db.query.platformSettings.findFirst();
      if (!settings?.resendApiKey || !settings?.resendFromDomain) {
        return reply.status(404).send({
          error: 'Resend não configurado',
          message: 'Configure a API Key e o domínio do Resend antes de verificar os registros DNS.',
        });
      }

      // 1. Listar domínios para encontrar o ID do domínio configurado
      const listRes = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${settings.resendApiKey}` },
      });
      if (!listRes.ok) {
        const err = await listRes.json().catch(() => ({}));
        throw new Error((err as any)?.message || 'Erro ao listar domínios no Resend.');
      }

      const listData = (await listRes.json()) as {
        data?: { id: string; name: string; status: string }[];
      };

      const targetDomain = settings.resendFromDomain.toLowerCase();
      const domainEntry = listData.data?.find((d) => d.name.toLowerCase() === targetDomain);

      if (!domainEntry) {
        return reply.status(404).send({
          error: 'Domínio não encontrado',
          message: `O domínio "${settings.resendFromDomain}" não está na conta Resend vinculada a esta API Key.`,
        });
      }

      // 2. Buscar os detalhes completos (incluindo registros DNS) do domínio
      const detailRes = await fetch(`https://api.resend.com/domains/${domainEntry.id}`, {
        headers: { Authorization: `Bearer ${settings.resendApiKey}` },
      });
      if (!detailRes.ok) {
        const err = await detailRes.json().catch(() => ({}));
        throw new Error((err as any)?.message || 'Erro ao buscar detalhes do domínio no Resend.');
      }

      const detail = (await detailRes.json()) as {
        id: string;
        name: string;
        status: string;
        created_at: string;
        region: string;
        records: {
          record: string;
          name: string;
          type: string;
          ttl: string;
          status: string;
          value: string;
          priority?: number;
        }[];
      };

      // 3. Verificar o status do registro DMARC no DNS real
      let dmarcStatus = 'pending';
      try {
        const txtRecords = await resolveTxt(`_dmarc.${targetDomain}`);
        const hasDmarc = txtRecords.some((record) =>
          record.some((str) => str.toUpperCase().startsWith('V=DMARC1'))
        );
        if (hasDmarc) {
          dmarcStatus = 'verified';
        }
      } catch (dnsErr) {
        // Ignora erro de DNS (ex: domínio NXDOMAIN ou TXT inexistente)
      }

      const dmarcRecord = {
        record: 'DMARC',
        name: `_dmarc.${targetDomain}`,
        type: 'TXT',
        ttl: '3600',
        status: dmarcStatus,
        value: 'v=DMARC1; p=none;',
      };

      return reply.send({
        domain: detail.name,
        domain_id: detail.id,
        status: detail.status,
        region: detail.region,
        records: [...(detail.records ?? []), dmarcRecord],
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: 'Erro ao buscar registros DNS',
        message: err.message || 'Não foi possível buscar os registros DNS do domínio Resend.',
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /v1/platform/resend/verify
  // Dispara a re-verificação do domínio no Resend (equivale ao botão
  // "Verify Domain" no painel do Resend). Útil após o usuário adicionar
  // os registros DNS e querer checar imediatamente.
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/resend/verify', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
      }
      const decoded = verifyUserJwt(authHeader.split(' ')[1]);
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, decoded.sub),
      });
      if (!profile || profile.role !== 'admin') {
        return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito a administradores.' });
      }

      const settings = await db.query.platformSettings.findFirst();
      if (!settings?.resendApiKey || !settings?.resendFromDomain) {
        return reply.status(404).send({
          error: 'Resend não configurado',
          message: 'Configure a API Key e o domínio do Resend primeiro.',
        });
      }

      // Achar o domain_id
      const listRes = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${settings.resendApiKey}` },
      });
      const listData = (await listRes.json()) as {
        data?: { id: string; name: string }[];
      };
      const domainEntry = listData.data?.find(
        (d) => d.name.toLowerCase() === settings.resendFromDomain!.toLowerCase()
      );
      if (!domainEntry) {
        return reply.status(404).send({
          error: 'Domínio não encontrado',
          message: `O domínio "${settings.resendFromDomain}" não está na conta Resend.`,
        });
      }

      // Disparar verificação
      const verifyRes = await fetch(
        `https://api.resend.com/domains/${domainEntry.id}/verify`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${settings.resendApiKey}` },
        }
      );

      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}));
        throw new Error((err as any)?.message || 'Erro ao disparar verificação no Resend.');
      }

      return reply.send({
        message: 'Verificação disparada com sucesso. Aguarde alguns minutos e recarregue os registros.',
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: 'Erro ao verificar domínio',
        message: err.message || 'Não foi possível disparar a verificação do domínio.',
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /v1/platform/emails/:id/resend
  // Reenvia manualmente um e-mail transacional a partir de um log existente.
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/emails/:id/resend',
    {
      schema: {
        params: z.object({
          id: z.string().uuid('ID do log inválido'),
        }),
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        verifyUserJwt(authHeader.split(' ')[1]);

        const { id } = request.params;

        // 1. Buscar o log de e-mail no banco
        const emailLog = await db.query.emailLogs.findFirst({
          where: eq(emailLogs.id, id),
        });

        if (!emailLog) {
          return reply.status(404).send({
            error: 'Log não encontrado',
            message: 'O log de e-mail especificado não existe.',
          });
        }

        // 2. Buscar configurações do Resend
        const settings = await db.query.platformSettings.findFirst();
        if (!settings?.resendApiKey || !settings?.resendFromDomain) {
          return reply.status(400).send({
            error: 'Resend não configurado',
            message: 'A API Key ou o domínio de envio do Resend não estão configurados.',
          });
        }

        // 3. Verificar status do domínio no Resend
        const listRes = await fetch('https://api.resend.com/domains', {
          headers: { Authorization: `Bearer ${settings.resendApiKey}` },
        });
        if (!listRes.ok) {
          const err = await listRes.json().catch(() => ({}));
          return reply.status(400).send({
            error: 'Erro no Resend',
            message: (err as any)?.message || 'Erro ao conectar à API do Resend para validar o domínio.',
          });
        }

        const listData = (await listRes.json()) as {
          data?: { id: string; name: string; status: string }[];
        };
        const targetDomain = settings.resendFromDomain.toLowerCase();
        const domainEntry = listData.data?.find((d) => d.name.toLowerCase() === targetDomain);

        if (!domainEntry || domainEntry.status !== 'verified') {
          return reply.status(400).send({
            error: 'Domínio não verificado',
            message: `O domínio de envio "${settings.resendFromDomain}" não está verificado ou ativo no Resend.`,
          });
        }

        // 4. Reenviar o e-mail usando os dados salvos no log
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: settings.resendFromDomain.includes('@')
              ? settings.resendFromDomain
              : `no-reply@${settings.resendFromDomain}`,
            to: emailLog.toEmail,
            subject: emailLog.subject,
            html: emailLog.htmlBody,
          }),
        });

        if (!resendRes.ok) {
          const err = await resendRes.json().catch(() => ({}));
          const errMsg = (err as any)?.message || 'Erro ao enviar via API do Resend.';
          
          // Atualizar o log do e-mail com a nova falha
          await db
            .update(emailLogs)
            .set({
              status: 'failed',
              error: errMsg,
              sentAt: new Date(),
            })
            .where(eq(emailLogs.id, emailLog.id));

          return reply.status(500).send({
            error: 'Falha no reenvio',
            message: `O Resend retornou erro: ${errMsg}`,
          });
        }

        // Atualizar o log como enviado e limpar erro
        await db
          .update(emailLogs)
          .set({
            status: 'sent',
            error: null,
            sentAt: new Date(),
          })
          .where(eq(emailLogs.id, emailLog.id));

        return reply.send({
          message: 'E-mail reenviado com sucesso!',
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Erro no reenvio',
          message: err.message || 'Não foi possível reenviar o e-mail.',
        });
      }
    }
  );

  // DELETE /v1/platform/workspaces/:id
  // Exclui um workspace, suas páginas, membros, mídias e domínios
  fastify.delete(
    '/workspaces/:id',
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);
        const { id } = request.params as any;

        const targetWorkspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, id),
        });

        if (!targetWorkspace) {
          return reply.status(404).send({ error: 'Não Encontrado', message: 'Workspace não encontrado.' });
        }

        // Permissão: apenas o dono do workspace, um admin do próprio workspace ou um administrador global da plataforma
        const isOwner = targetWorkspace.ownerId === decoded.sub;

        const isWorkspaceAdmin = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, decoded.sub),
            eq(workspaceMembers.workspaceId, id),
            eq(workspaceMembers.role, 'admin')
          ),
        });

        const platformUserProfile = await db.query.profiles.findFirst({
          where: eq(profiles.id, decoded.sub),
        });
        const isPlatformAdmin = platformUserProfile?.role === 'admin';

        if (!isOwner && !isWorkspaceAdmin && !isPlatformAdmin) {
          return reply.status(403).send({ error: 'Proibido', message: 'Você não tem permissão para excluir este workspace.' });
        }

        const settings = await db.query.platformSettings.findFirst();

        // 1. Limpar Hostnames na Cloudflare (se houver customDomain em workspaceDomains ou em páginas)
        if (settings?.cloudflareApiToken && settings?.cloudflareZoneId) {
          const token = settings.cloudflareApiToken;
          const zoneId = settings.cloudflareZoneId;

          const pages = await db.query.capturePages.findMany({
            where: eq(capturePages.workspaceId, id),
          });

          for (const page of pages) {
            if (page.customDomain) {
              try {
                const listRes = await fetch(
                  `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames?hostname=${page.customDomain}`,
                  {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );
                const listData: any = await listRes.json().catch(() => ({}));
                if (listData.result && listData.result.length > 0) {
                  const hostnameId = listData.result[0].id;
                  await fetch(
                    `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${hostnameId}`,
                    {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );
                }
              } catch (pCfErr) {
                fastify.log.error(pCfErr, 'Erro ao excluir page custom hostname na Cloudflare');
              }
            }
          }
        }

        // 2. Limpar tabelas filhas / dependentes
        await db.delete(interactionHistory).where(eq(interactionHistory.workspaceId, id)).catch(() => {});
        await db.delete(contacts).where(eq(contacts.workspaceId, id)).catch(() => {});
        await db.delete(capturePages).where(eq(capturePages.workspaceId, id)).catch(() => {});
        await db.delete(mediaAssets).where(eq(mediaAssets.workspaceId, id)).catch(() => {});
        await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, id)).catch(() => {});

        // 3. Excluir o workspace
        await db.delete(workspaces).where(eq(workspaces.id, id));

        return reply.send({ success: true, message: 'Workspace excluído com sucesso.' });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno', message: err.message });
      }
    }
  );

  // POST /v1/platform/errors
  // Envia log de erro para a fila do RabbitMQ
  fastify.post(
    '/errors',
    {
      schema: {
        body: z.object({
          name: z.string().optional().nullable(),
          message: z.string().min(1, 'Mensagem é obrigatória'),
          stack: z.string().optional().nullable(),
          url: z.string().optional().nullable(),
          userAgent: z.string().optional().nullable(),
          severity: z.enum(['error', 'warning', 'fatal']).default('error'),
          metadata: z.record(z.any()).optional().nullable(),
        }),
      },
    },
    async (request, reply) => {
      try {
        let userId: string | null = null;
        const token = extractJwtFromRequest(request);
        if (token) {
          try {
            const decoded = verifyUserJwt(token);
            userId = decoded.sub;
          } catch (jwtErr) {
            // Ignora erro de JWT expirado/inválido para não quebrar a requisição
          }
        }

        const { name, message, stack, url, userAgent, severity, metadata } = request.body;

        await publishErrorLog({
          name,
          message,
          stack,
          url,
          userAgent,
          userId,
          serviceName: 'frontend',
          severity,
          metadata: metadata || undefined,
        });

        return reply.send({ success: true, message: 'Erro enfileirado com sucesso.' });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Erro interno',
          message: err.message || 'Não foi possível enfileirar o log de erro.',
        });
      }
    }
  );

  // GET /v1/platform/errors
  // Lista logs de erro com filtros e paginação
  fastify.get(
    '/errors',
    {
      schema: {
        querystring: z.object({
          limit: z.coerce.number().default(100),
          offset: z.coerce.number().default(0),
          serviceName: z.string().optional(),
          severity: z.string().optional(),
          name: z.string().optional(),
          message: z.string().optional(),
          userId: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
        }
        const decoded = verifyUserJwt(authHeader.split(' ')[1]);

        const platformUserProfile = await db.query.profiles.findFirst({
          where: eq(profiles.id, decoded.sub),
        });
        
        if (platformUserProfile?.role !== 'admin') {
          return reply.status(403).send({ error: 'Proibido', message: 'Acesso restrito a administradores da plataforma.' });
        }

        const { limit, offset, serviceName, severity, name, message, userId, startDate, endDate } = request.query;

        const conditions = [];

        if (serviceName) {
          conditions.push(eq(errorLogs.serviceName, serviceName));
        }
        if (severity) {
          conditions.push(eq(errorLogs.severity, severity as any));
        }
        if (name) {
          conditions.push(sql`${errorLogs.name} ILIKE ${'%' + name + '%'}`);
        }
        if (message) {
          conditions.push(sql`${errorLogs.message} ILIKE ${'%' + message + '%'}`);
        }
        if (userId) {
          conditions.push(eq(errorLogs.userId, userId));
        }
        if (startDate) {
          conditions.push(gte(errorLogs.createdAt, new Date(startDate)));
        }
        if (endDate) {
          conditions.push(lte(errorLogs.createdAt, new Date(endDate)));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Buscar registros e total
        const logs = await db.query.errorLogs.findMany({
          where: whereClause,
          limit,
          offset,
          orderBy: [desc(errorLogs.createdAt)],
        });

        const [totalCountResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(errorLogs)
          .where(whereClause);

        return reply.send({
          success: true,
          logs,
          total: totalCountResult?.count || 0,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Erro interno',
          message: err.message || 'Não foi possível listar os logs de erro.',
        });
      }
    }
  );
}

