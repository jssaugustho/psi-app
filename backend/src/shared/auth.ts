import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { log } from './queue';


const JWT_SECRET = env.JWT_SECRET;
const GOTRUE_URL = env.GOTRUE_URL;
const SERVICE_SECRET_KEY = env.SERVICE_SECRET_KEY;

/**
 * Gera um JWT com role service_role assinado com JWT_SECRET
 * Utilizado para autenticar chamadas à API Admin do GoTrue
 */
export function generateServiceRoleJwt(): string {
  const payload = {
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hora
  };
  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Interface dos dados do perfil de usuário estendido
 */
export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
  role: 'admin' | 'user';
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface do payload decodificado do JWT do usuário
 */
export interface JwtUserPayload {
  sub: string; // User ID
  session_id?: string; // Auth Session ID (GoTrue/Supabase)
  sid?: string;
  email: string;
  role: string;
  exp: number;
}

/**
 * Decodifica o token JWT para extrair com seguranca userId e sessionId
 */
export function extractUserAndSessionFromToken(token: string): { userId: string | null; sessionId: string | null; userRole: string | null } {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded) return { userId: null, sessionId: null, userRole: null };
    const userId = decoded.sub || decoded.user_id || null;
    const sessionId = decoded.session_id || decoded.sid || decoded.jti || null;
    const userRole = decoded.role || decoded.user_role || (decoded.app_metadata as any)?.role || null;
    return { userId, sessionId, userRole };
  } catch {
    return { userId: null, sessionId: null, userRole: null };
  }
}

/**
 * Valida um token JWT de usuário enviado no Authorization header ou Cookie HttpOnly
 */
export function verifyUserJwt(token: string): JwtUserPayload {
  return jwt.verify(token, JWT_SECRET) as JwtUserPayload;
}

/**
 * Extrai o token JWT da requisição (seja via Cookie HttpOnly ou via Authorization Header)
 */
export function extractJwtFromRequest(request: any): string | null {
  if (request.cookies?.access_token) {
    return request.cookies.access_token;
  }
  const authHeader = request.headers['authorization'] || request.headers['Authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Valida a Service Secret Key
 */
export function isValidServiceSecret(key: string | undefined): boolean {
  return !!key && key === SERVICE_SECRET_KEY;
}

/**
 * Cria um usuário no GoTrue usando a API Admin do GoTrue
 */
export async function createGoTrueUser(
  email: string,
  password: string,
  metadata: Record<string, any> = {},
  baseUrl?: string
) {
  const adminToken = generateServiceRoleJwt();
  const targetUrl = baseUrl ? `${baseUrl}/admin/users` : `${GOTRUE_URL}/admin/users`;
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      role: 'authenticated',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: metadata,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody as any)?.msg || (errorBody as any)?.error_description || (errorBody as any)?.message || 'Erro ao criar usuário no GoTrue';
    
    await log({
      name: 'GoTrueCreateUserError',
      type: 'error',
      message: `GoTrue: ${message}`,
      stack: `URL: ${targetUrl}\nStatus: ${response.status}`,
      serviceName: 'gotrue',
      severity: 'error',
      metadata: { status: response.status, url: targetUrl, email }
    }).catch(err => console.error('Erro ao reportar falha do GoTrue:', err));

    throw new Error(message);
  }

  return await response.json();
}

/**
 * Realiza autenticação no GoTrue (/token)
 */
export async function loginGoTrueUser(email: string, password: string, baseUrl?: string) {
  const targetUrl = baseUrl ? `${baseUrl}/token?grant_type=password` : `${GOTRUE_URL}/token?grant_type=password`;
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody as any)?.error_description || (errorBody as any)?.msg || 'Credenciais inválidas';

    if (response.status >= 500) {
      await log({
        name: 'GoTrueLoginError',
        type: 'error',
        message: `GoTrue: ${message}`,
        stack: `URL: ${targetUrl}\nStatus: ${response.status}`,
        serviceName: 'gotrue',
        severity: 'error',
        metadata: { status: response.status, url: targetUrl, email }
      }).catch(err => console.error('Erro ao reportar falha do GoTrue:', err));
    }

    throw new Error(message);
  }

  return await response.json();
}

/**
 * Renova um access_token usando o refresh_token via GoTrue
 * Endpoint GoTrue: POST /token?grant_type=refresh_token
 */
export async function refreshGoTrueToken(refreshToken: string, baseUrl?: string) {
  const targetUrl = baseUrl
    ? `${baseUrl}/token?grant_type=refresh_token`
    : `${GOTRUE_URL}/token?grant_type=refresh_token`;

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      (errorBody as any)?.error_description ||
      (errorBody as any)?.msg ||
      'Refresh token inválido ou expirado';

    if (response.status >= 500) {
      await log({
        name: 'GoTrueRefreshTokenError',
        type: 'error',
        message: `GoTrue: ${message}`,
        stack: `URL: ${targetUrl}\nStatus: ${response.status}`,
        serviceName: 'gotrue',
        severity: 'error',
        metadata: { status: response.status, url: targetUrl }
      }).catch(err => console.error('Erro ao reportar falha do GoTrue:', err));
    }

    throw new Error(message);
  }

  return await response.json();
}

/**
 * Gera um link de ação no GoTrue (Magic Link, Convite, Confirmação, Recuperação)
 * via API Admin (/admin/generate_link) sem enviar e-mail automaticamente.
 */
export async function generateGoTrueLink(
  type: 'magiclink' | 'signup' | 'invite' | 'recovery',
  email: string,
  redirectTo: string,
  metadata: Record<string, any> = {},
  baseUrl?: string
) {
  const adminToken = generateServiceRoleJwt();
  const targetUrl = baseUrl
    ? `${baseUrl}/admin/generate_link`
    : `${GOTRUE_URL}/admin/generate_link`;

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      type,
      email,
      user_metadata: metadata,
      redirect_to: redirectTo,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      (errorBody as any)?.msg ||
      (errorBody as any)?.error_description ||
      (errorBody as any)?.message ||
      'Erro ao gerar link no GoTrue';

    await log({
      name: 'GoTrueGenerateLinkError',
      type: 'error',
      message: `GoTrue: ${message}`,
      stack: `URL: ${targetUrl}\nStatus: ${response.status}`,
      serviceName: 'gotrue',
      severity: 'error',
      metadata: { status: response.status, url: targetUrl, email, type }
    }).catch(err => console.error('Erro ao reportar falha do GoTrue:', err));

    throw new Error(message);
  }

  return await response.json();
}

