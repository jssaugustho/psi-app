import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { profiles, platformSettings, workspaces, workspaceMembers, workspaceDomains, visualIdentities, emailLogs, pipelineColumns } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { createGoTrueUser, loginGoTrueUser, refreshGoTrueToken, verifyUserJwt, generateServiceRoleJwt, generateGoTrueLink, extractJwtFromRequest } from '../../../shared/auth';
import { queueEmail } from '../../../emails/queue-email';
import { publishErrorLog, publishAuditLog } from '../../../shared/queue';


async function resolveWorkspaceFromRequest(request: any) {
  const origin = request.headers['origin'] as string | undefined;
  const referer = request.headers['referer'] as string | undefined;
  
  const urlToParse = origin || referer;
  if (!urlToParse) return null;

  try {
    const parsedUrl = new URL(urlToParse);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const domainRecord = await db.query.workspaceDomains.findFirst({
        where: eq(workspaceDomains.customDomain, hostname),
      });
      if (domainRecord) {
        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, domainRecord.workspaceId),
        });
        if (workspace) return workspace;
      }

      const parts = hostname.split('.');
      if (parts.length > 2) {
        const subdomain = parts[0];
        const subRecord = await db.query.workspaceDomains.findFirst({
          where: eq(workspaceDomains.subdomain, subdomain),
        });
        if (subRecord) {
          const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.id, subRecord.workspaceId),
          });
          if (workspace) return workspace;
        }
      }
    }
  } catch (err) {
    // Ignora erro de parse de URL
  }

  return null;
}

const RegisterBodySchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  sobrenome: z.string().min(1, 'Sobrenome é obrigatório'),
  telefone: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  crp: z.string().optional().nullable(),
  hasNoCrp: z.boolean().optional(),
  has_no_crp: z.boolean().optional(),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

const LoginBodySchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  appType: z.enum(['app', 'admin']).optional(),
});

const ForgotPasswordBodySchema = z.object({
  email: z.string().email('E-mail inválido'),
  appType: z.enum(['app', 'admin']).optional().default('app'),
});

const ResetPasswordBodySchema = z.object({
  password: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
});

export async function authRoutes(fastifyApp: FastifyInstance) {
  const fastify = fastifyApp.withTypeProvider<ZodTypeProvider>();

  // GET /v1/auth/bootstrap/status
  fastify.get('/bootstrap/status', async (request, reply) => {
    try {
      const existingAdmin = await db.query.profiles.findFirst({
        where: eq(profiles.role, 'admin'),
      });
      const settings = await db.query.platformSettings.findFirst();

      const hasAdmin = !!existingAdmin;
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
      const hasResend = !!(
        settings?.resendApiKey &&
        settings?.resendFromDomain
      );
      const hasVisualIdentity = !!(
        settings?.platformName &&
        settings?.logoLightUrl &&
        settings?.logoDarkUrl
      );

      const hasPlatformSettings = hasCloudflare && hasR2 && hasResend && hasVisualIdentity;
      const bootstrapped = hasAdmin && hasPlatformSettings;

      return reply.send({
        bootstrapped,
        has_admin: hasAdmin,
        has_platform_settings: hasPlatformSettings,
        admin_email: existingAdmin ? existingAdmin.email : null,
        message: bootstrapped
          ? 'Sistema inicializado e pronto para uso.'
          : 'Sistema necessita de bootstrap inicial.',
      });
    } catch (err: any) {
      fastify.log.warn('Tabelas do banco ainda não inicializadas no bootstrap/status:', err);
      return reply.send({
        bootstrapped: false,
        has_admin: false,
        has_platform_settings: false,
        admin_email: null,
        message: 'Sistema necessita de bootstrap inicial.',
      });
    }
  });

  // POST /v1/auth/bootstrap
  fastify.post(
    '/bootstrap',
    {
      schema: {
        body: RegisterBodySchema,
      },
    },
    async (request, reply) => {
      try {
        // 1. Checar se já existe um Admin cadastrado
        const existingAdmin = await db.query.profiles.findFirst({
          where: eq(profiles.role, 'admin'),
        });

        if (existingAdmin) {
          return reply.status(400).send({
            error: 'Operação não permitida',
            message: 'O sistema já possui um Administrador cadastrado. Operação de bootstrap desativada.',
          });
        }

        const { nome, sobrenome, telefone, email, password } = request.body;
        const cleanEmail = email.trim().toLowerCase();

        // 2. Criar usuário no GoTrue
        const goTrueUser = await createGoTrueUser(cleanEmail, password, {
          first_name: nome,
          last_name: sobrenome,
          phone: telefone || null,
        });

        const userId = goTrueUser.id;

        // 3. Inserir perfil com role 'admin'
        const [profile] = await db
          .insert(profiles)
          .values({
            id: userId,
            firstName: nome,
            lastName: sobrenome,
            phone: telefone || null,
            email: cleanEmail,
            role: 'admin',
          })
          .onConflictDoUpdate({
            target: profiles.id,
            set: {
              firstName: nome,
              lastName: sobrenome,
              phone: telefone || null,
              email: cleanEmail,
              role: 'admin',
              updatedAt: new Date(),
            },
          })
          .returning();

        // 4. Autenticar automaticamente o novo Admin via GoTrue com retries progressivos
        let authData;
        let loginAttemptCount = 0;
        const delays = [200, 500, 1000];
        while (loginAttemptCount <= delays.length) {
          try {
            authData = await loginGoTrueUser(cleanEmail, password);
            break;
          } catch (loginErr: any) {
            loginAttemptCount++;
            if (loginAttemptCount > delays.length) {
              fastify.log.error(`Falha no auto-login do bootstrap após ${loginAttemptCount} tentativas:`, loginErr);
              throw loginErr;
            }
            await new Promise((resolve) => setTimeout(resolve, delays[loginAttemptCount - 1]));
          }
        }

        await publishAuditLog({
          action: 'auth.bootstrap',
          category: 'auth',
          serviceName: 'core-api',
          status: 'success',
          userId: profile.id,
          ip: request.ip ?? null,
          userAgent: (request.headers['user-agent'] as string) ?? null,
          details: { email: cleanEmail, name: `${nome} ${sobrenome}` },
        }).catch(() => {});

        return reply.status(201).send({
          message: 'Primeiro Administrador criado com sucesso!',
          access_token: authData.access_token,
          refresh_token: authData.refresh_token,
          expires_in: authData.expires_in,
          token_type: authData.token_type,
            user: {
              id: profile.id,
              nome: profile.firstName,
              sobrenome: profile.lastName,
              telefone: profile.phone,
              email: profile.email,
              role: profile.role,
              avatar_url: profile.avatarUrl,
              created_at: profile.createdAt,
            },
        });
      } catch (err: any) {
        fastify.log.error(err);
        publishErrorLog({
          name: err.name || 'BootstrapError',
          message: err.message || String(err),
          stack: err.stack,
          url: request.url,
          userAgent: request.headers['user-agent'] || null,
          serviceName: 'core-api',
          severity: 'error',
        }).catch(() => {});
        return reply.status(400).send({
          error: 'Erro no bootstrap',
          message: err.message || 'Não foi possível criar o Administrador inicial.',
        });
      }

    }
  );

  // POST /v1/auth/register
  fastify.post(
    '/register',
    {
      schema: {
        body: RegisterBodySchema,
      },
    },
    async (request, reply) => {
      try {
        // 0. Bloquear cadastro se o sistema não possuir Administrador cadastrado
        const existingAdmin = await db.query.profiles.findFirst({
          where: eq(profiles.role, 'admin'),
        });

        if (!existingAdmin) {
          return reply.status(403).send({
            error: 'Operação não permitida',
            message:
              'O sistema ainda não possui um Administrador cadastrado. O cadastro de novos usuários está temporariamente bloqueado até que o bootstrap inicial seja realizado no Backoffice.',
          });
        }

        const { nome, sobrenome, telefone, cpf, crp, hasNoCrp, has_no_crp, email, password } = request.body;
        const cleanEmail = email.trim().toLowerCase();
        const noCrpFlag = hasNoCrp ?? has_no_crp ?? false;

        // 1. Criar usuário no GoTrue usando o token admin service_role
        const goTrueUser = await createGoTrueUser(cleanEmail, password, {
          first_name: nome,
          last_name: sobrenome,
          phone: telefone || null,
        });

        const userId = goTrueUser.id;

        // 2. Inserir ou atualizar o perfil estendido usando Drizzle ORM
        const [profile] = await db
          .insert(profiles)
          .values({
            id: userId,
            firstName: nome,
            lastName: sobrenome,
            phone: telefone || null,
            email: cleanEmail,
            cpf: cpf || null,
            crp: noCrpFlag ? null : (crp || null),
            hasNoCrp: noCrpFlag,
            role: 'user',
          })
          .onConflictDoUpdate({
            target: profiles.id,
            set: {
              firstName: nome,
              lastName: sobrenome,
              phone: telefone || null,
              email: cleanEmail,
              cpf: cpf || null,
              crp: noCrpFlag ? null : (crp || null),
              hasNoCrp: noCrpFlag,
              updatedAt: new Date(),
            },
          })
          .returning();

        await publishAuditLog({
          action: 'auth.register',
          category: 'auth',
          serviceName: 'core-api',
          status: 'success',
          userId: profile.id,
          ip: request.ip ?? null,
          userAgent: (request.headers['user-agent'] as string) ?? null,
          details: { email: cleanEmail, name: `${nome} ${sobrenome}` },
        }).catch(() => {});

        return reply.status(201).send({
          message: 'Usuário cadastrado com sucesso!',
          user: {
            id: profile.id,
            nome: profile.firstName,
            sobrenome: profile.lastName,
            telefone: profile.phone,
            email: profile.email,
            cpf: profile.cpf,
            crp: profile.crp,
            has_no_crp: profile.hasNoCrp,
            role: profile.role,
            avatar_url: profile.avatarUrl,
            created_at: profile.createdAt,
          },
        });
      } catch (err: any) {
        fastify.log.error(err);
        publishErrorLog({
          name: err.name || 'RegisterError',
          message: err.message || String(err),
          stack: err.stack,
          url: request.url,
          userAgent: request.headers['user-agent'] || null,
          serviceName: 'core-api',
          severity: 'error',
        }).catch(() => {});
        return reply.status(400).send({
          error: 'Erro no cadastro',
          message: err.message || 'Não foi possível realizar o cadastro.',
        });
      }

    }
  );

  // POST /v1/auth/login
  fastify.post(
    '/login',
    {
      schema: {
        body: LoginBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const { email, password, appType } = request.body;
        const cleanEmail = email.trim().toLowerCase();

        // 1. Autenticar credenciais via GoTrue
        const authData = await loginGoTrueUser(cleanEmail, password);
        const userId = authData.user?.id;

        // 2. Buscar dados do perfil do usuário via Drizzle ORM
        let profile = null;
        if (userId) {
          profile = await db.query.profiles.findFirst({
            where: eq(profiles.id, userId),
          });
        }

        // 3. Disparar e-mail de notificação de login (assíncrono, sem bloquear resposta)
        if (profile) {
          // Resolve o workspace a partir do origin/referer da requisição para envio white-label correto
          let matchedWorkspace = await resolveWorkspaceFromRequest(request);

          const settings = await db.query.platformSettings.findFirst();

          const brandName = matchedWorkspace?.name ?? settings?.platformName ?? 'TheraOS';
          const visualIdentity = matchedWorkspace ? await db.query.visualIdentities.findFirst({
            where: and(
              eq(visualIdentities.workspaceId, matchedWorkspace.id),
              eq(visualIdentities.isWorkspaceDefault, true)
            ),
          }) : null;
          const gradientStart = visualIdentity?.primaryColor ?? settings?.gradientColorStart ?? '#7C3AED';
          const gradientEnd = visualIdentity?.secondaryColor ?? settings?.gradientColorEnd ?? '#A855F7';
          const logoUrl = visualIdentity?.logoUrl || settings?.logoDarkUrl || settings?.logoLightUrl || null;

          // Gerar assunto de e-mail dinâmico e personalizado para evitar agrupamento no Gmail
          const now = new Date();
          const timeString = now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
          });
          const dateString = now.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            timeZone: 'America/Sao_Paulo',
          });

          const emailSubject = appType === 'admin'
            ? `Acesso ao Backoffice detectado [${dateString} ${timeString}]`
            : `Novo acesso detectado na sua conta [${dateString} ${timeString}]`;

          queueEmail({
            template: 'login_notification',
            to: email,
            tenantId: matchedWorkspace?.id,
            subject: emailSubject,
            props: {
              userName: profile.firstName,
              userEmail: email,
              loginAt: new Date().toISOString(),
              device: request.headers['user-agent'] ?? 'Desconhecido',
              ip: request.ip ?? '0.0.0.0',
              brandName,
              gradientStart,
              gradientEnd,
              logoUrl,
              appType,
            },
          }).catch((err) => {
            fastify.log.warn('Falha ao enfileirar e-mail de login:', err);
          });
        }

        await publishAuditLog({
          action: 'auth.login',
          category: 'auth',
          serviceName: 'core-api',
          status: 'success',
          userId: userId || null,
          ip: request.ip ?? null,
          userAgent: (request.headers['user-agent'] as string) ?? null,
          details: { email: cleanEmail, appType },
        }).catch(() => {});

        return reply.send({
          access_token: authData.access_token,
          refresh_token: authData.refresh_token,
          expires_in: authData.expires_in,
          token_type: authData.token_type,
          user: {
            id: userId,
            email: authData.user?.email || email,
            nome: profile ? profile.firstName : authData.user?.user_metadata?.first_name || '',
            sobrenome: profile ? profile.lastName : authData.user?.user_metadata?.last_name || '',
            telefone: profile ? profile.phone : authData.user?.user_metadata?.phone || null,
            role: profile ? profile.role : 'user',
            avatar_url: profile ? profile.avatarUrl : null,
          },
        });
      } catch (err: any) {
        fastify.log.error(err);
        publishAuditLog({
          action: 'auth.login',
          category: 'auth',
          serviceName: 'core-api',
          status: 'failure',
          ip: request.ip ?? null,
          userAgent: (request.headers['user-agent'] as string) ?? null,
          details: { email: (request.body as any)?.email, reason: err.message },
        }).catch(() => {});

        return reply.status(401).send({
          error: 'Falha no login',
          message: err.message || 'Credenciais inválidas.',
        });
      }

    }
  );

  // POST /v1/auth/forgot-password
  fastify.post(
    '/forgot-password',
    {
      schema: {
        body: ForgotPasswordBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const { email, appType } = request.body;

        // 1. Procurar perfil no banco pelo e-mail
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.email, email.trim().toLowerCase()),
        });

        if (profile) {
          const matchedWorkspace = await resolveWorkspaceFromRequest(request);
          const settings = await db.query.platformSettings.findFirst();

          const brandName = matchedWorkspace?.name ?? settings?.platformName ?? 'TheraOS';
          const visualIdentity = matchedWorkspace
            ? await db.query.visualIdentities.findFirst({
                where: and(
                  eq(visualIdentities.workspaceId, matchedWorkspace.id),
                  eq(visualIdentities.isWorkspaceDefault, true)
                ),
              })
            : null;
          const gradientStart = visualIdentity?.primaryColor ?? settings?.gradientColorStart ?? '#7C3AED';
          const gradientEnd = visualIdentity?.secondaryColor ?? settings?.gradientColorEnd ?? '#A855F7';
          const logoUrl = visualIdentity?.logoUrl || settings?.logoDarkUrl || settings?.logoLightUrl || null;

          // Determina a URL de redirecionamento para a página de redefinição
          const origin = (request.headers['origin'] || request.headers['referer']) as string | undefined;
          let baseUrl = origin ? origin.replace(/\/$/, '') : 'http://localhost:3000';
          const resetUrl = `${baseUrl}/login/reset-password`;

          // Gerar link de recuperação via GoTrue API Admin
          const linkData = await generateGoTrueLink('recovery', profile.email, resetUrl);
          const actionLink = linkData.action_link || `${resetUrl}#access_token=${linkData.hashed_token || ''}&type=recovery`;

          queueEmail({
            template: 'reset_password',
            to: profile.email,
            tenantId: matchedWorkspace?.id,
            subject: `Redefinição de Senha — ${brandName}`,
            props: {
              userName: profile.firstName,
              userEmail: profile.email,
              resetUrl: actionLink,
              brandName,
              gradientStart,
              gradientEnd,
              logoUrl,
              appType,
            },
          }).catch((err) => {
            fastify.log.warn('Falha ao enfileirar e-mail de reset de senha:', err);
          });
        }

        return reply.send({
          message: 'Se o e-mail estiver cadastrado no sistema, você receberá as instruções para redefinir sua senha.',
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Erro no servidor',
          message: 'Não foi possível processar a solicitação de redefinição de senha.',
        });
      }
    }
  );

  // POST /v1/auth/reset-password
  fastify.post(
    '/reset-password',
    {
      schema: {
        body: ResetPasswordBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const token = extractJwtFromRequest(request);
        if (!token) {
          return reply.status(401).send({
            error: 'Não autorizado',
            message: 'Token de recuperação ausente ou inválido.',
          });
        }

        const decoded = verifyUserJwt(token);
        const userId = decoded.sub;

        const { password } = request.body;

        // Atualizar senha no GoTrue usando API Admin
        const adminToken = generateServiceRoleJwt();
        const targetUrl = `${env.GOTRUE_URL}/admin/users/${userId}`;
        const updateRes = await fetch(targetUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ password }),
        });

        if (!updateRes.ok) {
          const errData = await updateRes.json().catch(() => ({}));
          throw new Error((errData as any)?.msg || 'Falha ao atualizar senha no GoTrue.');
        }

        return reply.send({
          message: 'Senha redefinida com sucesso!',
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Erro ao redefinir senha',
          message: err.message || 'Token expirado ou inválido. Solicite um novo link.',
        });
      }
    }
  );

  // GET /v1/auth/me
  fastify.get('/me', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: 'Não autorizado',
          message: 'Cabeçalho Authorization ausente ou malformatado.',
        });
      }

      const token = authHeader.split(' ')[1];
      const payload = verifyUserJwt(token);

      // Buscar perfil usando Drizzle ORM
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, payload.sub),
      });

      if (!profile) {
        return reply.status(404).send({
          error: 'Não encontrado',
          message: 'Perfil de usuário não encontrado.',
        });
      }

      return reply.send({
        user: {
          id: profile.id,
          nome: profile.firstName,
          sobrenome: profile.lastName,
          telefone: profile.phone,
          email: profile.email,
          cpf: profile.cpf,
          crp: profile.crp,
          has_no_crp: profile.hasNoCrp,
          role: profile.role,
          avatar_url: profile.avatarUrl,
          created_at: profile.createdAt,
          updated_at: profile.updatedAt,
        },
      });
    } catch (err: any) {
      return reply.status(401).send({
        error: 'Sessão inválida',
        message: 'Token expirado ou inválido.',
      });
    }
  });

  // PUT /v1/auth/me
  // Atualiza o perfil do usuário logado
  fastify.put(
    '/me',
    {
      schema: {
        body: z.object({
          nome: z.string().min(1, 'Nome é obrigatório'),
          sobrenome: z.string().min(1, 'Sobrenome é obrigatório'),
          telefone: z.string().optional().nullable(),
          cpf: z.string().optional().nullable(),
          crp: z.string().optional().nullable(),
          hasNoCrp: z.boolean().optional(),
          has_no_crp: z.boolean().optional(),
          avatarUrl: z.string().optional().nullable(),
          password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres').optional().nullable(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({
            error: 'Não autorizado',
            message: 'Cabeçalho Authorization ausente ou malformatado.',
          });
        }

        const token = authHeader.split(' ')[1];
        const payload = verifyUserJwt(token);
        const userId = payload.sub;

        const { nome, sobrenome, telefone, cpf, crp, hasNoCrp, has_no_crp, avatarUrl, password } = request.body;
        const noCrpFlag = hasNoCrp ?? has_no_crp ?? false;

        // 1. Se fornecida senha, atualiza no GoTrue via Admin API
        if (password && password.trim()) {
          const adminToken = generateServiceRoleJwt();
          const response = await fetch(`${env.GOTRUE_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
              password: password.trim(),
            }),
          });

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const message = (errorBody as any)?.msg || (errorBody as any)?.message || 'Erro ao atualizar a senha no serviço de autenticação.';
            throw new Error(message);
          }
        }

        // 2. Atualizar perfil no Drizzle ORM
        const updateData: Record<string, any> = {
          firstName: nome,
          lastName: sobrenome,
          phone: telefone || null,
          avatarUrl: avatarUrl || null,
          hasNoCrp: noCrpFlag,
          updatedAt: new Date(),
        };

        if (cpf !== undefined) updateData.cpf = cpf || null;
        if (crp !== undefined) updateData.crp = noCrpFlag ? null : (crp || null);

        const [profile] = await db
          .update(profiles)
          .set(updateData)
          .where(eq(profiles.id, userId))
          .returning();

        if (!profile) {
          return reply.status(404).send({
            error: 'Não encontrado',
            message: 'Perfil de usuário não encontrado para atualização.',
          });
        }

        return reply.send({
          message: 'Perfil atualizado com sucesso!',
          user: {
            id: profile.id,
            nome: profile.firstName,
            sobrenome: profile.lastName,
            telefone: profile.phone,
            email: profile.email,
            cpf: profile.cpf,
            crp: profile.crp,
            has_no_crp: profile.hasNoCrp,
            role: profile.role,
            avatar_url: profile.avatarUrl,
            created_at: profile.createdAt,
            updated_at: profile.updatedAt,
          },
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Erro na atualização',
          message: err.message || 'Não foi possível atualizar o perfil.',
        });
      }
    }
  );

  // POST /v1/auth/refresh
  // Faz proxy para GoTrue /token?grant_type=refresh_token
  // O frontend envia o refresh_token e recebe um novo par access_token + refresh_token
  fastify.post(
    '/refresh',
    {
      schema: {
        body: z.object({
          refresh_token: z.string().min(1, 'refresh_token é obrigatório'),
        }),
      },
    },
    async (request, reply) => {
      try {
        const { refresh_token } = request.body;
        const authData = await refreshGoTrueToken(refresh_token);

        // O GoTrue retorna expires_in em segundos; calculamos o timestamp absoluto
        const expiresAt = Math.floor(Date.now() / 1000) + (authData.expires_in ?? 3600);

        return reply.send({
          access_token: authData.access_token,
          refresh_token: authData.refresh_token,
          expires_in: authData.expires_in,
          expires_at: expiresAt,
          token_type: authData.token_type ?? 'bearer',
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(401).send({
          error: 'Refresh inválido',
          message: err.message || 'Não foi possível renovar a sessão. Faça login novamente.',
        });
      }
    }
  );

  // POST /v1/auth/invite
  // Convia um novo colaborador ou adiciona um colaborador existente ao workspace
  fastify.post(
    '/invite',
    {
      schema: {
        body: z.object({
          email: z.string().email('E-mail inválido'),
          workspaceId: z.string().uuid('ID do workspace inválido'),
          role: z.enum(['owner', 'admin', 'secretaria', 'psicologo', 'agent', 'membro']),
        }),
      },
    },
    async (request, reply) => {
      try {
        const token = extractJwtFromRequest(request);
        if (!token) {
          return reply.status(401).send({
            error: 'Não autorizado',
            message: 'Cabeçalho Authorization ou Cookie ausente.',
          });
        }

        const payload = verifyUserJwt(token);
        const inviterId = payload.sub;

        const { email, workspaceId, role } = request.body;
        const targetEmail = email.trim().toLowerCase();

        // 2. Buscar dados do workspace (Consultório) e validar privilégios do inviter
        const invitingWorkspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, workspaceId),
        });

        if (!invitingWorkspace) {
          return reply.status(404).send({
            error: 'Não encontrado',
            message: 'O workspace/clínica especificado não foi encontrado.',
          });
        }

        // Validar se o inviter é dono do workspace ou possui role admin em workspaceMembers
        const inviterMember = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, inviterId)
          ),
        });

        const isInviterAdmin =
          invitingWorkspace.ownerId === inviterId ||
          (inviterMember && (inviterMember.role === 'admin' || inviterMember.role === 'owner'));

        if (!isInviterAdmin) {
          return reply.status(403).send({
            error: 'Proibido',
            message: 'Você não possui permissões administrativas neste espaço clínico para convidar membros.',
          });
        }

        // Buscar dados do perfil do inviter para incluir no e-mail
        const inviterProfile = await db.query.profiles.findFirst({
          where: eq(profiles.id, inviterId),
        });
        const inviterName = inviterProfile
          ? `${inviterProfile.firstName} ${inviterProfile.lastName}`.trim()
          : 'Um administrador';

        // 3. Verificar se o e-mail convidado já possui perfil na plataforma
        const existingProfile = await db.query.profiles.findFirst({
          where: eq(profiles.email, targetEmail),
        });

        let targetUserId: string;
        let isNewUser = false;
        let actionLink = '';

        const gotrueSiteUrl = env.GOTRUE_SITE_URL || 'http://localhost:3000';

        if (existingProfile) {
          // --- USUÁRIO EXISTENTE ---
          targetUserId = existingProfile.id;

          // Verificar se já é membro do workspace
          const existingMember = await db.query.workspaceMembers.findFirst({
            where: and(
              eq(workspaceMembers.workspaceId, workspaceId),
              eq(workspaceMembers.userId, targetUserId)
            ),
          });

          if (existingMember) {
            return reply.status(400).send({
              error: 'Erro',
              message: 'Este usuário já faz parte deste espaço clínico.',
            });
          }

          // Adicionar membro ao workspace com a role escolhida
          await db.insert(workspaceMembers).values({
            workspaceId,
            userId: targetUserId,
            role,
          });

          // Gerar link mágico (magiclink) para o login do usuário existente
          const linkRedirectUrl = `${gotrueSiteUrl}/auth/callback?type=login&workspace_id=${workspaceId}`;
          const gotrueLinkRes = await generateGoTrueLink('magiclink', targetEmail, linkRedirectUrl);
          actionLink = gotrueLinkRes.action_link;
        } else {
          // --- NOVO USUÁRIO ---
          isNewUser = true;

          const linkRedirectUrl = `${gotrueSiteUrl}/auth/callback?type=invite&workspace_id=${workspaceId}`;
          
          // Geramos um link de convite no GoTrue
          const gotrueLinkRes = await generateGoTrueLink('invite', targetEmail, linkRedirectUrl, {
            first_name: 'Colaborador',
            last_name: '',
          });
          
          targetUserId = gotrueLinkRes.id;
          actionLink = gotrueLinkRes.action_link;

          // Adicionar o novo usuário na tabela workspace_members
          await db.insert(workspaceMembers).values({
            workspaceId,
            userId: targetUserId,
            role,
          });
        }

        const brandName = invitingWorkspace.name ?? 'TheraOS';
        const visualIdentity = await db.query.visualIdentities.findFirst({
          where: and(
            eq(visualIdentities.workspaceId, workspaceId),
            eq(visualIdentities.isWorkspaceDefault, true)
          ),
        });
        const gradientStart = visualIdentity?.primaryColor ?? '#4F46E5';
        const gradientEnd = visualIdentity?.secondaryColor ?? '#06B6D4';
        const logoUrl = visualIdentity?.logoUrl || null;

        // Converter role técnica para nome legível em português
        const roleLabels: Record<string, string> = {
          owner: 'Proprietário(a)',
          admin: 'Administrador(a)',
          secretaria: 'Secretária(o)',
          psicologo: 'Psicólogo(a)',
          agent: 'Agente',
          membro: 'Membro',
        };
        const roleLabel = roleLabels[role] || role;

        await queueEmail({
          template: 'invite_member',
          to: targetEmail,
          tenantId: workspaceId,
          subject: `Você foi convidado para colaborar na clínica ${brandName}`,
          props: {
            userName: existingProfile ? `${existingProfile.firstName}`.trim() : 'Colaborador',
            inviterName,
            tenantName: brandName,
            roleName: roleLabel,
            actionLink,
            isNewUser,
            brandName,
            gradientStart,
            gradientEnd,
            logoUrl,
          },
        });

        return reply.status(200).send({
          message: isNewUser
            ? 'Novo usuário convidado com sucesso! E-mail de ativação enfileirado.'
            : 'Usuário existente associado ao workspace com sucesso! E-mail de notificação enfileirado.',
          user_id: targetUserId,
          is_new: isNewUser,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Erro no convite',
          message: err.message || 'Não foi possível enviar o convite.',
        });
      }
    }
  );

  // POST /v1/auth/invite/resend
  // Reenvia o e-mail de convite ou link mágico com rate limiting (ex: 60 segundos)
  fastify.post(
    '/invite/resend',
    {
      schema: {
        body: z.object({
          email: z.string().email('E-mail inválido'),
          workspaceId: z.string().uuid('ID do workspace inválido'),
        }),
      },
    },
    async (request, reply) => {
      try {
        const token = extractJwtFromRequest(request);
        if (!token) {
          return reply.status(401).send({
            error: 'Não autorizado',
            message: 'Cabeçalho Authorization ou Cookie ausente.',
          });
        }

        const payload = verifyUserJwt(token);
        const inviterId = payload.sub;

        const { email, workspaceId } = request.body;
        const targetEmail = email.trim().toLowerCase();

        // 1. Validar permissões administrativas do inviter
        const invitingWorkspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, workspaceId),
        });
        if (!invitingWorkspace) {
          return reply.status(404).send({ error: 'Não encontrado', message: 'Workspace não encontrado.' });
        }

        const inviterMember = await db.query.workspaceMembers.findFirst({
          where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, inviterId)),
        });
        const isInviterAdmin = invitingWorkspace.ownerId === inviterId || (inviterMember && (inviterMember.role === 'admin' || inviterMember.role === 'owner'));
        if (!isInviterAdmin) {
          return reply.status(403).send({ error: 'Proibido', message: 'Sem permissões administrativas.' });
        }

        // 2. Verificar se o usuário existe no workspace
        const targetUser = await db.query.profiles.findFirst({
          where: eq(profiles.email, targetEmail),
        });
        if (!targetUser) {
          return reply.status(404).send({ error: 'Não encontrado', message: 'Colaborador não cadastrado.' });
        }

        const memberRecord = await db.query.workspaceMembers.findFirst({
          where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUser.id)),
        });
        if (!memberRecord) {
          return reply.status(404).send({ error: 'Não encontrado', message: 'Colaborador não é membro deste espaço.' });
        }

        // 3. Rate limiting de 60 segundos baseando-se nos logs de e-mail do destinatário
        const lastMail = await db.query.emailLogs.findFirst({
          where: eq(emailLogs.toEmail, targetEmail),
          orderBy: (emailLogs, { desc }) => [desc(emailLogs.createdAt)],
        });

        if (lastMail) {
          const secondsDiff = Math.floor((Date.now() - new Date(lastMail.createdAt).getTime()) / 1000);
          if (secondsDiff < 60) {
            const waitTime = 60 - secondsDiff;
            return reply.status(429).send({
              error: 'Muitas requisições',
              message: `Aguarde ${waitTime} segundo(s) antes de solicitar um novo e-mail.`,
            });
          }
        }

        // 4. Gerar novo link de convite ou link mágico conforme o status do usuário
        const gotrueSiteUrl = env.GOTRUE_SITE_URL || 'http://localhost:3000';
        const linkRedirectUrl = `${gotrueSiteUrl}/auth/callback?type=invite&workspace_id=${workspaceId}`;

        const gotrueLinkRes = await generateGoTrueLink('invite', targetEmail, linkRedirectUrl);
        const actionLink = gotrueLinkRes.action_link;

        // 5. Enviar e-mail com a identidade visual do consultório
        const visualIdentity = await db.query.visualIdentities.findFirst({
          where: and(
            eq(visualIdentities.workspaceId, workspaceId),
            eq(visualIdentities.isWorkspaceDefault, true)
          ),
        });

        await queueEmail({
          template: 'invite_member',
          to: targetEmail,
          tenantId: workspaceId,
          subject: `Convite de acesso - ${invitingWorkspace.name}`,
          props: {
            userName: `${targetUser.firstName}`.trim(),
            inviterName: 'Administrador',
            tenantName: invitingWorkspace.name,
            roleName: memberRecord.role,
            actionLink,
            isNewUser: false,
            brandName: invitingWorkspace.name,
            gradientStart: visualIdentity?.primaryColor ?? '#4F46E5',
            gradientEnd: visualIdentity?.secondaryColor ?? '#06B6D4',
            logoUrl: visualIdentity?.logoUrl || null,
          },
        });

        return reply.status(200).send({
          message: 'E-mail de convite reenviado com sucesso!',
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Erro ao reenviar convite',
          message: err.message || 'Não foi possível reenviar o convite.',
        });
      }
    }
  );
}
