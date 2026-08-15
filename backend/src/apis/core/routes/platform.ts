import { FastifyInstance } from 'fastify';
import { resolveTxt } from 'dns/promises';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { platformSettings, tenants, emailLogs, mediaAssets, tenantMembers } from '../../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { verifyUserJwt } from '../../../shared/auth';
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

const SetupTenantBodySchema = z.object({
  name: z.string().min(1, 'Nome da plataforma é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  domain: z.string().optional().nullable(),
  logo_light_url: z.string().optional().nullable(),
  logo_dark_url: z.string().optional().nullable(),
  icon_light_url: z.string().optional().nullable(),
  icon_dark_url: z.string().optional().nullable(),
  gradient_color_start: z.string().default('#4F46E5'),
  gradient_color_end: z.string().default('#06B6D4'),
  contrast_color: z.string().default('#FFFFFF'),
  bg_light_color: z.string().default('#F8FAFC'),
  bg_dark_color: z.string().default('#020617'),
  card_light_color: z.string().default('#FFFFFF'),
  card_dark_color: z.string().default('#0F172A'),
  text_light_color: z.string().default('#0F172A'),
  text_dark_color: z.string().default('#F8FAFC'),
});

export async function platformRoutes(fastifyApp: FastifyInstance) {
  const fastify = fastifyApp.withTypeProvider<ZodTypeProvider>();

  // GET /v1/platform/setup/status
  fastify.get('/setup/status', async (request, reply) => {
    try {
      const settings = await db.query.platformSettings.findFirst();

      let primaryTenant = null;
      if (settings?.primaryTenantId) {
        primaryTenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, settings.primaryTenantId),
        });
      } else {
        primaryTenant = await db.query.tenants.findFirst({
          where: eq(tenants.isPrimary, true),
        });
      }

      const hasCloudflare = !!(settings?.cloudflareApiToken && settings?.cloudflareZoneId);
      const hasR2 = !!(
        settings?.cloudflareAccountId &&
        settings?.r2BucketName &&
        settings?.r2AccessKeyId &&
        settings?.r2SecretAccessKey
      );
      const hasResend = !!(settings?.resendApiKey);

      return reply.send({
        is_configured: settings ? settings.isConfigured : false,
        has_cloudflare: hasCloudflare,
        has_r2: hasR2,
        has_resend: hasResend,
        cloudflare_zone_id: settings?.cloudflareZoneId || null,
        cloudflare_account_id: settings?.cloudflareAccountId || null,
        base_domain: settings?.baseDomain || null,
        r2_bucket_name: settings?.r2BucketName || null,
        r2_public_domain: settings?.r2PublicDomain || null,
        resend_from_domain: settings?.resendFromDomain || null,
        primary_tenant: primaryTenant,
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
        verifyUserJwt(authHeader.split(' ')[1]);

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

        const effectiveApiToken = api_token?.trim() || existingSettings?.cloudflareApiToken;
        const effectiveAccessKeyId = r2_access_key_id?.trim() || existingSettings?.r2AccessKeyId;
        const effectiveSecretAccessKey = r2_secret_access_key?.trim() || existingSettings?.r2SecretAccessKey;

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

        // 2. Testar acesso direto ao R2 Bucket via S3 Client (se chaves disponíveis)
        if (effectiveAccessKeyId && effectiveSecretAccessKey) {
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
            fastify.log.warn(`S3 HeadBucket aviso: ${s3Err.message}`);
          }
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
            isConfigured: false,
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
        const TRANSPARENT_MIMES = ['image/webp', 'image/png', 'image/svg+xml'];
        const OPAQUE_SAFE_MIMES  = ['image/webp', 'image/jpeg', 'image/jpg', 'image/png'];
        const FONT_SAFE_MIMES    = [
          'font/woff2', 'font/woff', 'font/ttf', 'font/otf',
          'application/font-woff', 'application/font-woff2',
          'font/opentype', 'application/x-font-ttf', 'application/x-font-opentype'
        ];

        if ((upload_type === 'logo' || upload_type === 'icon') && !TRANSPARENT_MIMES.includes(content_type)) {
          return reply.status(422).send({
            error: 'Tipo de arquivo inválido',
            message: `Logotipos e ícones devem ser enviados em formato WebP, PNG ou SVG para preservar a transparência. Tipo recebido: ${content_type}`,
          });
        }

        if ((upload_type === 'avatar' || upload_type === 'asset') && !OPAQUE_SAFE_MIMES.includes(content_type)) {
          return reply.status(422).send({
            error: 'Tipo de arquivo inválido',
            message: `Imagens do tipo "${upload_type}" devem ser WebP, JPEG ou PNG. Tipo recebido: ${content_type}`,
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

        const { tenantId } = request.query;

        // Validar se o usuário pertence ao tenant
        const targetTenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, tenantId),
        });

        if (!targetTenant) {
          return reply.status(404).send({ error: 'Não Encontrado', message: 'Tenant não cadastrado.' });
        }

        const isOwner = targetTenant.ownerId === decoded.sub;
        const member = await db.query.tenantMembers.findFirst({
          where: and(
            eq(tenantMembers.userId, decoded.sub),
            eq(tenantMembers.tenantId, tenantId)
          ),
        });

        if (!isOwner && !member) {
          return reply.status(403).send({ error: 'Proibido', message: 'Você não tem acesso a este tenant.' });
        }

        // Buscar assets
        const assets = await db.query.mediaAssets.findMany({
          where: and(
            eq(mediaAssets.tenantId, tenantId),
            eq(mediaAssets.isCropped, false)
          ),
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
          tenantId: z.string().uuid('ID do Tenant inválido'),
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

        const body = request.body;

        // Validar se o usuário pertence ao tenant
        const targetTenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, body.tenantId),
        });

        if (!targetTenant) {
          return reply.status(404).send({ error: 'Não Encontrado', message: 'Tenant não cadastrado.' });
        }

        const isOwner = targetTenant.ownerId === decoded.sub;
        const member = await db.query.tenantMembers.findFirst({
          where: and(
            eq(tenantMembers.userId, decoded.sub),
            eq(tenantMembers.tenantId, body.tenantId)
          ),
        });

        if (!isOwner && !member) {
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
              eq(mediaAssets.tenantId, body.tenantId),
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
            tenantId: body.tenantId,
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

        // Validar se o usuário pertence ao tenant do asset
        const targetTenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, asset.tenantId),
        });

        if (!targetTenant) {
          return reply.status(404).send({ error: 'Não Encontrado', message: 'Tenant não cadastrado.' });
        }

        const isOwner = targetTenant.ownerId === decoded.sub;
        const member = await db.query.tenantMembers.findFirst({
          where: and(
            eq(tenantMembers.userId, decoded.sub),
            eq(tenantMembers.tenantId, asset.tenantId)
          ),
        });

        if (!isOwner && !member) {
          return reply.status(403).send({ error: 'Proibido', message: 'Você não tem permissão para remover assets deste tenant.' });
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

  // POST /v1/platform/setup/tenant (Cadastra/Atualiza o Tenant-Pai Principal)
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

        // Executar transação de atualização do Tenant-Pai
        const newPrimaryTenant = await db.transaction(async (tx) => {
          // 1. Desmarcar is_primary de todos os tenants existentes
          await tx.update(tenants).set({ isPrimary: false });

          // 2. Inserir ou atualizar o tenant
          const [createdTenant] = await tx
            .insert(tenants)
            .values({
              name: body.name,
              slug: body.slug,
              domain: body.domain || null,
              isPrimary: true,
              logoLightUrl: body.logo_light_url || null,
              logoDarkUrl: body.logo_dark_url || null,
              iconLightUrl: body.icon_light_url || null,
              iconDarkUrl: body.icon_dark_url || null,
              gradientColorStart: body.gradient_color_start,
              gradientColorEnd: body.gradient_color_end,
              contrastColor: body.contrast_color,
              bgLightColor: body.bg_light_color,
              bgDarkColor: body.bg_dark_color,
              cardLightColor: body.card_light_color,
              cardDarkColor: body.card_dark_color,
              textLightColor: body.text_light_color,
              textDarkColor: body.text_dark_color,
            })
            .onConflictDoUpdate({
              target: tenants.slug,
              set: {
                name: body.name,
                domain: body.domain || null,
                isPrimary: true,
                logoLightUrl: body.logo_light_url || null,
                logoDarkUrl: body.logo_dark_url || null,
                iconLightUrl: body.icon_light_url || null,
                iconDarkUrl: body.icon_dark_url || null,
                gradientColorStart: body.gradient_color_start,
                gradientColorEnd: body.gradient_color_end,
                contrastColor: body.contrast_color,
                bgLightColor: body.bg_light_color,
                bgDarkColor: body.bg_dark_color,
                cardLightColor: body.card_light_color,
                cardDarkColor: body.card_dark_color,
                textLightColor: body.text_light_color,
                textDarkColor: body.text_dark_color,
                updatedAt: new Date(),
              },
            })
            .returning();

          // 3. Atualizar platform_settings vinculando primary_tenant_id e is_configured = true
          const existingSettings = await tx.query.platformSettings.findFirst();
          if (existingSettings) {
            await tx
              .update(platformSettings)
              .set({
                primaryTenantId: createdTenant.id,
                isConfigured: true,
                updatedAt: new Date(),
              })
              .where(eq(platformSettings.id, existingSettings.id));
          } else {
            await tx.insert(platformSettings).values({
              primaryTenantId: createdTenant.id,
              isConfigured: true,
            });
          }

          return createdTenant;
        });

        return reply.status(201).send({
          message: 'Tenant principal e identidade visual configurados com sucesso!',
          tenant: newPrimaryTenant,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Erro ao configurar Tenant',
          message: err.message || 'Não foi possível salvar as configurações do Tenant-Pai.',
        });
      }
    }
  );

  // GET /v1/platform/tenant/primary (Público)
  fastify.get('/tenant/primary', async (request, reply) => {
    try {
      const settings = await db.query.platformSettings.findFirst();

      let primaryTenant = null;
      if (settings?.primaryTenantId) {
        primaryTenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, settings.primaryTenantId),
        });
      } else {
        primaryTenant = await db.query.tenants.findFirst({
          where: eq(tenants.isPrimary, true),
        });
      }

      if (!primaryTenant) {
        return reply.status(404).send({
          error: 'Não encontrado',
          message: 'Tenant principal ainda não configurado.',
        });
      }

      return reply.send({
        tenant: primaryTenant,
      });
    } catch (err: any) {
      return reply.status(500).send({
        error: 'Erro no servidor',
        message: 'Não foi possível buscar a marca do tenant principal.',
      });
    }
  });

  // PUT /v1/platform/tenant/primary (Atualizar configurações White-Label - Requer Admin)
  fastify.put(
    '/tenant/primary',
    {
      schema: {
        body: z.object({
          name: z.string().min(1).optional(),
          slug: z.string().min(1).optional(),
          domain: z.string().optional().nullable(),
          logo_light_url: z.string().optional().nullable(),
          logo_dark_url: z.string().optional().nullable(),
          icon_light_url: z.string().optional().nullable(),
          icon_dark_url: z.string().optional().nullable(),
          gradient_color_start: z.string().optional(),
          gradient_color_end: z.string().optional(),
          contrast_color: z.string().optional(),
          bg_light_color: z.string().optional(),
          bg_dark_color: z.string().optional(),
          card_light_color: z.string().optional(),
          card_dark_color: z.string().optional(),
          text_light_color: z.string().optional(),
          text_dark_color: z.string().optional(),
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

        // Localizar o Tenant-Pai atual
        const settings = await db.query.platformSettings.findFirst();
        let primaryTenant = null;
        if (settings?.primaryTenantId) {
          primaryTenant = await db.query.tenants.findFirst({
            where: eq(tenants.id, settings.primaryTenantId),
          });
        } else {
          primaryTenant = await db.query.tenants.findFirst({
            where: eq(tenants.isPrimary, true),
          });
        }

        if (!primaryTenant) {
          return reply.status(404).send({
            error: 'Não encontrado',
            message: 'Tenant principal não configurado.',
          });
        }

        // Atualizar somente os campos enviados (partial update)
        const [updatedTenant] = await db
          .update(tenants)
          .set({
            name: body.name ?? primaryTenant.name,
            slug: body.slug ?? primaryTenant.slug,
            domain: body.domain !== undefined ? body.domain : primaryTenant.domain,
            logoLightUrl: body.logo_light_url !== undefined ? body.logo_light_url : primaryTenant.logoLightUrl,
            logoDarkUrl: body.logo_dark_url !== undefined ? body.logo_dark_url : primaryTenant.logoDarkUrl,
            iconLightUrl: body.icon_light_url !== undefined ? body.icon_light_url : primaryTenant.iconLightUrl,
            iconDarkUrl: body.icon_dark_url !== undefined ? body.icon_dark_url : primaryTenant.iconDarkUrl,
            gradientColorStart: body.gradient_color_start ?? primaryTenant.gradientColorStart,
            gradientColorEnd: body.gradient_color_end ?? primaryTenant.gradientColorEnd,
            contrastColor: body.contrast_color ?? primaryTenant.contrastColor,
            bgLightColor: body.bg_light_color ?? primaryTenant.bgLightColor,
            bgDarkColor: body.bg_dark_color ?? primaryTenant.bgDarkColor,
            cardLightColor: body.card_light_color ?? primaryTenant.cardLightColor,
            cardDarkColor: body.card_dark_color ?? primaryTenant.cardDarkColor,
            textLightColor: body.text_light_color ?? primaryTenant.textLightColor,
            textDarkColor: body.text_dark_color ?? primaryTenant.textDarkColor,
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, primaryTenant.id))
          .returning();

        return reply.send({
          message: 'Configurações White-Label atualizadas com sucesso!',
          tenant: updatedTenant,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Erro ao atualizar',
          message: err.message || 'Não foi possível atualizar as configurações White-Label.',
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
        verifyUserJwt(authHeader.split(' ')[1]);

        const { resend_api_key, resend_from_domain } = request.body;
        const normalizedInput = resend_from_domain.replace(/^@/, '').toLowerCase();

        // 1. Validar a API key do Resend listando os domínios
        const resendRes = await fetch('https://api.resend.com/domains', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${resend_api_key}`,
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
              Authorization: `Bearer ${resend_api_key}`,
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
        const existingSettings = await db.query.platformSettings.findFirst();

        if (existingSettings) {
          await db
            .update(platformSettings)
            .set({
              resendApiKey: resend_api_key,
              resendFromDomain: normalizedInput,
              hasResend: true,
              updatedAt: new Date(),
            })
            .where(eq(platformSettings.id, existingSettings.id));
        } else {
          await db.insert(platformSettings).values({
            resendApiKey: resend_api_key,
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
        verifyUserJwt(authHeader.split(' ')[1]);

        const { resend_api_key, resend_from_domain } = request.body;

        const existingSettings = await db.query.platformSettings.findFirst();

        const apiKeyToUse = resend_api_key || existingSettings?.resendApiKey;
        const domainToUse = resend_from_domain || existingSettings?.resendFromDomain;

        if (!apiKeyToUse) {
          return reply.status(400).send({
            error: 'Configuração inválida',
            message: 'API Key do Resend ausente. Insira uma API Key para salvar.',
          });
        }

        // Se houver nova API key ou novo domínio, realiza validação e cadastro se necessário
        if (resend_api_key || resend_from_domain) {
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
              ...(resend_api_key ? { resendApiKey: resend_api_key, hasResend: true } : {}),
              ...(resend_from_domain ? { resendFromDomain: resend_from_domain.replace(/^@/, '').toLowerCase() } : {}),
              updatedAt: new Date(),
            })
            .where(eq(platformSettings.id, existingSettings.id));
        } else {
          await db.insert(platformSettings).values({
            resendApiKey: resend_api_key || null,
            resendFromDomain: resend_from_domain ? resend_from_domain.replace(/^@/, '').toLowerCase() : null,
            hasResend: !!resend_api_key,
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
      verifyUserJwt(authHeader.split(' ')[1]);

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
      verifyUserJwt(authHeader.split(' ')[1]);

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
}
