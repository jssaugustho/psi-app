import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { profiles, platformSettings, tenants } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { createGoTrueUser, loginGoTrueUser, refreshGoTrueToken, verifyUserJwt, generateServiceRoleJwt } from '../../../shared/auth';
import { queueEmail } from '../../../emails/queue-email';

async function resolveTenantFromRequest(request: any) {
  const origin = request.headers['origin'] as string | undefined;
  const referer = request.headers['referer'] as string | undefined;
  
  const urlToParse = origin || referer;
  if (!urlToParse) return null;

  try {
    const parsedUrl = new URL(urlToParse);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const tenantByDomain = await db.query.tenants.findFirst({
        where: eq(tenants.domain, hostname),
      });
      if (tenantByDomain) return tenantByDomain;

      const parts = hostname.split('.');
      if (parts.length > 2) {
        const slug = parts[0];
        const tenantBySlug = await db.query.tenants.findFirst({
          where: eq(tenants.slug, slug),
        });
        if (tenantBySlug) return tenantBySlug;
      }
    }

    if (referer) {
      const pathParts = parsedUrl.pathname.split('/');
      for (const part of pathParts) {
        if (part && part !== 'login' && part !== 'auth' && part !== 'dashboard') {
          const tenantByPathSlug = await db.query.tenants.findFirst({
            where: eq(tenants.slug, part.toLowerCase()),
          });
          if (tenantByPathSlug) return tenantByPathSlug;
        }
      }
    }
  } catch (err) {
    // Ignora erro de parse de URL
  }

  return null;
}

// Schemas Zod de Validação
const RegisterBodySchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  sobrenome: z.string().min(1, 'Sobrenome é obrigatório'),
  telefone: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

const LoginBodySchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export async function authRoutes(fastifyApp: FastifyInstance) {
  const fastify = fastifyApp.withTypeProvider<ZodTypeProvider>();

  // GET /v1/auth/bootstrap/status
  fastify.get('/bootstrap/status', async (request, reply) => {
    try {
      const existingAdmin = await db.query.profiles.findFirst({
        where: eq(profiles.role, 'admin'),
      });
      return reply.send({
        bootstrapped: !!existingAdmin,
        admin_email: existingAdmin ? existingAdmin.email : null,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: 'Erro no servidor',
        message: 'Não foi possível checar o status de inicialização.',
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

        // 2. Criar usuário no GoTrue
        const goTrueUser = await createGoTrueUser(email, password, {
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
            email,
            role: 'admin',
          })
          .onConflictDoUpdate({
            target: profiles.id,
            set: {
              firstName: nome,
              lastName: sobrenome,
              phone: telefone || null,
              email,
              role: 'admin',
              updatedAt: new Date(),
            },
          })
          .returning();

        // 4. Autenticar automaticamente o novo Admin
        const authData = await loginGoTrueUser(email, password);

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
        const { nome, sobrenome, telefone, email, password } = request.body;

        // 1. Criar usuário no GoTrue usando o token admin service_role
        const goTrueUser = await createGoTrueUser(email, password, {
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
            email,
            role: 'user',
          })
          .onConflictDoUpdate({
            target: profiles.id,
            set: {
              firstName: nome,
              lastName: sobrenome,
              phone: telefone || null,
              email,
              updatedAt: new Date(),
            },
          })
          .returning();

        return reply.status(201).send({
          message: 'Usuário cadastrado com sucesso!',
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
        const { email, password } = request.body;

        // 1. Autenticar credenciais via GoTrue
        const authData = await loginGoTrueUser(email, password);
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
          // Resolve o tenant a partir do origin/referer da requisição para envio white-label correto
          let matchedTenant = await resolveTenantFromRequest(request);

          // Se não encontrou pelo cabeçalho da requisição, busca o tenant primário como fallback
          if (!matchedTenant) {
            const settings = await db.query.platformSettings.findFirst();
            if (settings?.primaryTenantId) {
              matchedTenant = await db.query.tenants.findFirst({
                where: eq(tenants.id, settings.primaryTenantId),
              }) ?? null;
            }
          }

          const brandName = matchedTenant?.name ?? 'Plataforma';
          const gradientStart = matchedTenant?.gradientColorStart ?? '#4F46E5';
          const gradientEnd = matchedTenant?.gradientColorEnd ?? '#06B6D4';
          const logoUrl = matchedTenant ? (matchedTenant.logoDarkUrl || matchedTenant.logoLightUrl || null) : null;

          queueEmail({
            template: 'login_notification',
            to: email,
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
            },
          }).catch((err) => {
            fastify.log.warn('Falha ao enfileirar e-mail de login:', err);
          });
        }

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
        return reply.status(401).send({
          error: 'Falha no login',
          message: err.message || 'Credenciais inválidas.',
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

        const { nome, sobrenome, telefone, avatarUrl, password } = request.body;

        // 1. Se fornecida senha, atualiza no GoTrue via Admin API
        if (password && password.trim()) {
          const adminToken = generateServiceRoleJwt();
          const response = await fetch(`${process.env.GOTRUE_URL || 'http://gotrue:9999'}/admin/users/${userId}`, {
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
        const [profile] = await db
          .update(profiles)
          .set({
            firstName: nome,
            lastName: sobrenome,
            phone: telefone || null,
            avatarUrl: avatarUrl || null,
            updatedAt: new Date(),
          })
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
}

