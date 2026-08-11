import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../../shared/db';
import { profiles, platformSettings, tenants, tenantMembers, emailLogs } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { createGoTrueUser, loginGoTrueUser, refreshGoTrueToken, verifyUserJwt, generateServiceRoleJwt, generateGoTrueLink } from '../../../shared/auth';
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
  appType: z.enum(['app', 'admin']).optional(),
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
        const { email, password, appType } = request.body;

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
            tenantId: matchedTenant?.id,
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

  // POST /v1/auth/invite
  // Convia um novo colaborador ou adiciona um colaborador existente ao tenant
  fastify.post(
    '/invite',
    {
      schema: {
        body: z.object({
          email: z.string().email('E-mail inválido'),
          tenantId: z.string().uuid('ID do tenant inválido'),
          role: z.enum(['admin', 'secretaria', 'psicologo', 'agent']),
        }),
      },
    },
    async (request, reply) => {
      try {
        // 1. Validar autenticação do remetente
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({
            error: 'Não autorizado',
            message: 'Cabeçalho Authorization ausente ou malformatado.',
          });
        }

        const token = authHeader.split(' ')[1];
        const payload = verifyUserJwt(token);
        const inviterId = payload.sub;

        const { email, tenantId, role } = request.body;
        const targetEmail = email.trim().toLowerCase();

        // 2. Buscar dados do tenant (Consultório) e validar privilégios do inviter
        const invitingTenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, tenantId),
        });

        if (!invitingTenant) {
          return reply.status(404).send({
            error: 'Não encontrado',
            message: 'O tenant/clínica especificado não foi encontrado.',
          });
        }

        // Validar se o inviter é dono do tenant ou possui role admin em tenantMembers
        const inviterMember = await db.query.tenantMembers.findFirst({
          where: and(
            eq(tenantMembers.tenantId, tenantId),
            eq(tenantMembers.userId, inviterId)
          ),
        });

        const isInviterAdmin =
          invitingTenant.ownerId === inviterId ||
          (inviterMember && inviterMember.role === 'admin');

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

        const gotrueSiteUrl = process.env.GOTRUE_SITE_URL || 'http://localhost:3000';

        if (existingProfile) {
          // --- USUÁRIO EXISTENTE ---
          targetUserId = existingProfile.id;

          // Verificar se já é membro do tenant
          const existingMember = await db.query.tenantMembers.findFirst({
            where: and(
              eq(tenantMembers.tenantId, tenantId),
              eq(tenantMembers.userId, targetUserId)
            ),
          });

          if (existingMember) {
            return reply.status(400).send({
              error: 'Erro',
              message: 'Este usuário já faz parte deste espaço clínico.',
            });
          }

          // Adicionar membro ao tenant com a role escolhida
          await db.insert(tenantMembers).values({
            tenantId,
            userId: targetUserId,
            role,
          });

          // Gerar link mágico (magiclink) para o login do usuário existente
          const linkRedirectUrl = `${gotrueSiteUrl}/auth/callback?type=login&tenant_id=${tenantId}`;
          const gotrueLinkRes = await generateGoTrueLink('magiclink', targetEmail, linkRedirectUrl);
          actionLink = gotrueLinkRes.action_link;
        } else {
          // --- NOVO USUÁRIO ---
          isNewUser = true;

          // Convidar no GoTrue (cria o usuário no auth.users sem senha, o que dispara handle_new_user() e cria o perfil no public.profiles)
          const linkRedirectUrl = `${gotrueSiteUrl}/auth/callback?type=invite&tenant_id=${tenantId}`;
          
          // Geramos um link de convite no GoTrue
          const gotrueLinkRes = await generateGoTrueLink('invite', targetEmail, linkRedirectUrl, {
            first_name: 'Colaborador',
            last_name: '',
          });
          
          targetUserId = gotrueLinkRes.id;
          actionLink = gotrueLinkRes.action_link;

          // Adicionar o novo usuário na tabela tenant_members
          await db.insert(tenantMembers).values({
            tenantId,
            userId: targetUserId,
            role,
          });
        }

        // 4. Disparar e-mail com a identidade visual do consultório
        const brandName = invitingTenant.name ?? 'Psi App';
        const gradientStart = invitingTenant.gradientColorStart ?? '#4F46E5';
        const gradientEnd = invitingTenant.gradientColorEnd ?? '#06B6D4';
        const logoUrl = invitingTenant.logoDarkUrl || invitingTenant.logoLightUrl || null;

        // Converter role técnica para nome legível em português
        const roleLabels: Record<string, string> = {
          admin: 'Administrador',
          secretaria: 'Secretária(o)',
          psicologo: 'Psicólogo(a)',
          agent: 'Agente',
        };
        const roleLabel = roleLabels[role] || role;

        await queueEmail({
          template: 'invite_member',
          to: targetEmail,
          tenantId,
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
            : 'Usuário existente associado ao tenant com sucesso! E-mail de notificação enfileirado.',
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
          tenantId: z.string().uuid('ID do tenant inválido'),
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
        const inviterId = payload.sub;

        const { email, tenantId } = request.body;
        const targetEmail = email.trim().toLowerCase();

        // 1. Validar permissões administrativas do inviter
        const invitingTenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, tenantId),
        });
        if (!invitingTenant) {
          return reply.status(404).send({ error: 'Não encontrado', message: 'Clínica/Tenant não encontrado.' });
        }

        const inviterMember = await db.query.tenantMembers.findFirst({
          where: and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, inviterId)),
        });
        const isInviterAdmin = invitingTenant.ownerId === inviterId || (inviterMember && inviterMember.role === 'admin');
        if (!isInviterAdmin) {
          return reply.status(403).send({ error: 'Proibido', message: 'Sem permissões administrativas.' });
        }

        // 2. Verificar se o usuário existe no tenant
        const targetUser = await db.query.profiles.findFirst({
          where: eq(profiles.email, targetEmail),
        });
        if (!targetUser) {
          return reply.status(404).send({ error: 'Não encontrado', message: 'Colaborador não cadastrado.' });
        }

        const memberRecord = await db.query.tenantMembers.findFirst({
          where: and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, targetUser.id)),
        });
        if (!memberRecord) {
          return reply.status(404).send({ error: 'Não encontrado', message: 'Colaborador não é membro deste espaço clínico.' });
        }

        // 3. Rate limiting de 60 segundos baseando-se nos logs de e-mail do destinatário
        const lastMail = await db.query.emailLogs.findFirst({
          where: eq(emailLogs.toEmail, targetEmail),
          orderBy: (emailLogs, { desc }) => [desc(emailLogs.createdAt)],
        });

        if (lastMail && Date.now() - new Date(lastMail.createdAt).getTime() < 60000) {
          const remainingSecs = Math.ceil((60000 - (Date.now() - new Date(lastMail.createdAt).getTime())) / 1000);
          return reply.status(429).send({
            error: 'Too Many Requests',
            message: `Aguarde ${remainingSecs} segundos antes de solicitar um novo reenvio.`,
          });
        }

        // 4. Gerar novo link de convite ou link mágico conforme o status do usuário
        const gotrueSiteUrl = process.env.GOTRUE_SITE_URL || 'http://localhost:3000';
        let actionLink = '';
        let isNewUser = false;

        // Se o nome for 'Colaborador', consideramos que ainda não concluiu seu setup
        if (targetUser.firstName === 'Colaborador' && targetUser.lastName === '') {
          isNewUser = true;
          const linkRedirectUrl = `${gotrueSiteUrl}/auth/callback?type=invite&tenant_id=${tenantId}`;
          const gotrueLinkRes = await generateGoTrueLink('invite', targetEmail, linkRedirectUrl);
          actionLink = gotrueLinkRes.action_link;
        } else {
          const linkRedirectUrl = `${gotrueSiteUrl}/auth/callback?type=login&tenant_id=${tenantId}`;
          const gotrueLinkRes = await generateGoTrueLink('magiclink', targetEmail, linkRedirectUrl);
          actionLink = gotrueLinkRes.action_link;
        }

        // 5. Enviar e-mail com a identidade visual do consultório
        const brandName = invitingTenant.name ?? 'Psi App';
        const gradientStart = invitingTenant.gradientColorStart ?? '#4F46E5';
        const gradientEnd = invitingTenant.gradientColorEnd ?? '#06B6D4';
        const logoUrl = invitingTenant.logoDarkUrl || invitingTenant.logoLightUrl || null;

        const roleLabels: Record<string, string> = {
          admin: 'Administrador',
          secretaria: 'Secretária(o)',
          psicologo: 'Psicólogo(a)',
          agent: 'Agente',
        };
        const roleLabel = roleLabels[memberRecord.role] || memberRecord.role;

        const inviterProfile = await db.query.profiles.findFirst({ where: eq(profiles.id, inviterId) });
        const inviterName = inviterProfile ? `${inviterProfile.firstName} ${inviterProfile.lastName}`.trim() : 'Um administrador';

        await queueEmail({
          template: 'invite_member',
          to: targetEmail,
          tenantId,
          subject: `Reenvio: Convite para colaborar na clínica ${brandName}`,
          props: {
            userName: targetUser.firstName === 'Colaborador' ? 'Colaborador' : targetUser.firstName,
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
          message: 'Convite reenviado com sucesso!',
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Erro ao reenviar',
          message: err.message || 'Não foi possível reenviar o convite.',
        });
      }
    }
  );
}


