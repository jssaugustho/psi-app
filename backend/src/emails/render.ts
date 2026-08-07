import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoginNotificationEmail, LoginNotificationProps } from './templates/login-notification';
import { InviteMemberEmail, InviteMemberProps } from './templates/invite-member';

// ── Tipos de templates disponíveis ────────────────────────────────────────
export type TemplateName = 'login_notification' | 'invite_member';

export interface TemplatePropsMap {
  login_notification: LoginNotificationProps;
  invite_member: InviteMemberProps;
}

// ── Registro de templates ─────────────────────────────────────────────────
const templateComponents: {
  [K in TemplateName]: React.FC<TemplatePropsMap[K]>;
} = {
  login_notification: LoginNotificationEmail,
  invite_member: InviteMemberEmail,
};

/**
 * Renderiza um template de e-mail para HTML estático.
 * @param template - Identificador do template
 * @param props    - Props tipadas conforme o template
 * @returns HTML string completo do e-mail
 */
export function renderEmailTemplate<T extends TemplateName>(
  template: T,
  props: TemplatePropsMap[T],
): string {
  const Component = templateComponents[template] as React.FC<TemplatePropsMap[T]>;
  return '<!DOCTYPE html>' + renderToStaticMarkup(React.createElement(Component, props));
}
