import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoginNotificationEmail, LoginNotificationProps } from './templates/login-notification';

// ── Tipos de templates disponíveis ────────────────────────────────────────
export type TemplateName = 'login_notification';

export interface TemplatePropsMap {
  login_notification: LoginNotificationProps;
}

// ── Registro de templates ─────────────────────────────────────────────────
const templateComponents: {
  [K in TemplateName]: React.FC<TemplatePropsMap[K]>;
} = {
  login_notification: LoginNotificationEmail,
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
