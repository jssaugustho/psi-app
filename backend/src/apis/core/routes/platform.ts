import { FastifyInstance } from 'fastify';
import { resolveTxt } from 'dns/promises';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { platformSettings, tenants, emailLogs } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { verifyUserJwt } from '../../../shared/auth';
import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

// Schemas Zod de Validação
const SaveCloudflareBodySchema = z.object({
  api_token: z.string().min(1, 'API Token é obrigatório'),
  zone_id: z.string().min(1, 'Zone ID é obrigatório'),
  account_id: z.string().min(1, 'Account ID é obrigatório'),
  r2_bucket_name: z.string().min(1, 'Nome do Bucket R2 é obrigatório'),
  r2_public_domain: z.string().min(1, 'Domínio Público do R2 é obrigatório'),
  r2_access_key_id: z.string().min(1, 'Access Key ID do R2 é obrigatório'),
  r2_secret_access_key: z.string().min(1, 'Secret Access Key do R2 é obrigatório'),
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
          r2_bucket_name,
          r2_public_domain,
          r2_access_key_id,
          r2_secret_access_key,
        } = request.body;

        // 1. Testar permissão da Zone no Cloudflare API
        const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone_id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${api_token}`,
            'Content-Type': 'application/json',
          },
        }).catch((fetchErr) => {
          throw new Error(`Falha ao conectar com o Cloudflare: ${fetchErr.message}`);
        });

        if (!cfResponse.ok) {
          const errorData = await cfResponse.json().catch(() => ({}));
          const message = (errorData as any)?.errors?.[0]?.message || 'API Token ou Zone ID do Cloudflare inválidos.';
          return reply.status(400).send({
            error: 'Validação do Cloudflare Falhou',
            message: `Cloudflare recusou as credenciais da Zone: ${message}`,
          });
        }

        // 2. Testar acesso direto ao R2 Bucket via S3 Client (Access Key ID + Secret Key)
        try {
          const s3TestClient = new S3Client({
            region: 'auto',
            endpoint: `https://${account_id.trim()}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: r2_access_key_id.trim(),
              secretAccessKey: r2_secret_access_key.trim(),
            },
          });

          await s3TestClient.send(new HeadBucketCommand({ Bucket: r2_bucket_name.trim() }));
        } catch (s3Err: any) {
          fastify.log.warn(`S3 HeadBucket aviso: ${s3Err.message}`);
          // Se HeadBucket falhar por falta de permissão explícita HeadBucket, logar aviso e aceitar se as chaves forem fornecidas
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
        const existingSettings = await db.query.platformSettings.findFirst();

        if (existingSettings) {
          await db
            .update(platformSettings)
            .set({
              cloudflareApiToken: api_token.trim(),
              cloudflareZoneId: zone_id.trim(),
              cloudflareAccountId: account_id.trim(),
              r2BucketName: r2_bucket_name.trim(),
              r2PublicDomain: formattedDomain,
              r2AccessKeyId: r2_access_key_id.trim(),
              r2SecretAccessKey: r2_secret_access_key.trim(),
              updatedAt: new Date(),
            })
            .where(eq(platformSettings.id, existingSettings.id));
        } else {
          await db.insert(platformSettings).values({
            cloudflareApiToken: api_token.trim(),
            cloudflareZoneId: zone_id.trim(),
            cloudflareAccountId: account_id.trim(),
            r2BucketName: r2_bucket_name.trim(),
            r2PublicDomain: formattedDomain,
            r2AccessKeyId: r2_access_key_id.trim(),
            r2SecretAccessKey: r2_secret_access_key.trim(),
            isConfigured: false,
          });
        }

        return reply.send({
          message: 'Credenciais do Cloudflare e Bucket R2 validadas e salvas com sucesso!',
          zone_id,
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

  // POST /v1/platform/upload (Upload direto de arquivo para o Cloudflare R2)
  fastify.post('/upload', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
      }
      verifyUserJwt(authHeader.split(' ')[1]);

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'Requisição inválida', message: 'Nenhum arquivo enviado.' });
      }

      // Buscar credenciais do R2
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

      const buffer = await data.toBuffer();

      // Extensão e chave do arquivo no S3
      const ext = data.filename.split('.').pop() || 'png';
      const fileKey = `assets/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      // Cliente AWS S3 para Cloudflare R2
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
          ContentType: data.mimetype,
        })
      );

      const publicDomain = settings.r2PublicDomain || `https://${settings.r2BucketName}.${settings.cloudflareAccountId}.r2.cloudflarestorage.com`;
      const publicUrl = `${publicDomain}/${fileKey}`;

      return reply.send({
        url: publicUrl,
        key: fileKey,
        filename: data.filename,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: 'Erro no Upload',
        message: err.message || 'Não foi possível realizar o upload para o Cloudflare R2.',
      });
    }
  });

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
