/**
 * Traduz e formata erros de requisições de autenticação em mensagens amigáveis em PT-BR para a UI.
 */
export function getFriendlyAuthErrorMessage(
  err: any,
  defaultFallback: string = 'Ocorreu um erro ao processar sua solicitação. Tente novamente em instantes.'
): string {
  if (!err) return defaultFallback;

  const rawMessage = typeof err === 'string' ? err : err.message || err.error || '';
  if (!rawMessage) return defaultFallback;

  const lower = rawMessage.toLowerCase();

  // 1. Credenciais inválidas ou Usuário não encontrado (Anti-User Enumeration)
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('user not found') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid email or password')
  ) {
    return 'E-mail ou senha incorretos.';
  }

  // 2. E-mail não confirmado
  if (lower.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.';
  }

  // 3. Limite de taxa / Anti-Spam
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    err?.status === 429
  ) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  }

  // 4. Usuário já cadastrado
  if (
    lower.includes('user already registered') ||
    lower.includes('user_already_exists') ||
    lower.includes('already exists')
  ) {
    return 'Já existe uma conta cadastrada com este e-mail.';
  }

  // 5. Senha muito curta
  if (
    lower.includes('password should be at least') ||
    lower.includes('password is too short')
  ) {
    return 'A senha deve ter no mínimo 6 caracteres.';
  }

  // 6. Token / Link expirado ou inválido
  if (
    lower.includes('token has expired') ||
    lower.includes('invalid or has expired') ||
    lower.includes('otp expired')
  ) {
    return 'O link expirou ou é inválido. Solicite um novo link.';
  }

  // 7. Erro de rede ou servidor offline
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network error')) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão de internet.';
  }

  return rawMessage;
}
