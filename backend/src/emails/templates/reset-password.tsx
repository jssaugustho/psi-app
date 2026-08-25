import * as React from 'react';

export interface ResetPasswordProps {
  userName: string;
  userEmail: string;
  resetUrl: string;
  brandName: string;
  gradientStart: string;
  gradientEnd: string;
  logoUrl?: string | null;
  appType?: 'app' | 'admin';
}

export function ResetPasswordEmail({
  userName,
  userEmail,
  resetUrl,
  brandName,
  gradientStart,
  gradientEnd,
  logoUrl,
  appType,
}: ResetPasswordProps) {
  const styles = {
    body: {
      margin: '0',
      padding: '0',
      backgroundColor: '#0A0A0F',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    } as React.CSSProperties,
    wrapper: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px 16px',
    } as React.CSSProperties,
    card: {
      backgroundColor: '#13131A',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
    } as React.CSSProperties,
    header: {
      background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
      padding: '32px 40px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    headerTitle: {
      margin: '0',
      fontSize: '22px',
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: '-0.3px',
    } as React.CSSProperties,
    headerLogo: {
      maxHeight: '40px',
      maxWidth: '200px',
      margin: '0 auto 10px',
      display: 'block',
    } as React.CSSProperties,
    headerSubtitle: {
      margin: '6px 0 0',
      fontSize: '14px',
      color: 'rgba(255,255,255,0.75)',
    } as React.CSSProperties,
    bodyContainer: {
      padding: '32px 40px',
    } as React.CSSProperties,
    greeting: {
      fontSize: '16px',
      color: '#E2E8F0',
      margin: '0 0 12px',
    } as React.CSSProperties,
    intro: {
      fontSize: '14px',
      color: '#94A3B8',
      lineHeight: '1.6',
      margin: '0 0 28px',
    } as React.CSSProperties,
    buttonContainer: {
      textAlign: 'center' as const,
      margin: '32px 0',
    } as React.CSSProperties,
    button: {
      display: 'inline-block',
      background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: '15px',
      padding: '14px 32px',
      borderRadius: '12px',
      textDecoration: 'none',
      boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
    } as React.CSSProperties,
    linkFallback: {
      fontSize: '12px',
      color: '#64748B',
      lineHeight: '1.6',
      wordBreak: 'break-all' as const,
      backgroundColor: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      padding: '12px 16px',
      borderRadius: '8px',
      margin: '20px 0 28px',
    } as React.CSSProperties,
    alertBox: {
      backgroundColor: 'rgba(245,158,11,0.08)',
      border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: '10px',
      padding: '16px 20px',
      marginBottom: '28px',
    } as React.CSSProperties,
    alertText: {
      fontSize: '13px',
      color: '#FCD34D',
      lineHeight: '1.5',
      margin: '0',
    } as React.CSSProperties,
    footer: {
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '24px 40px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    footerText: {
      fontSize: '12px',
      color: '#475569',
      lineHeight: '1.6',
      margin: '0',
    } as React.CSSProperties,
    footerBrand: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#64748B',
      margin: '12px 0 0',
    } as React.CSSProperties,
  };

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Redefinição de Senha — {brandName}</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={styles.body}>
        <div style={styles.wrapper}>
          <div style={styles.card}>
            {/* Header */}
            <div style={styles.header}>
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} style={styles.headerLogo} />
              ) : (
                <p style={styles.headerTitle}>{brandName}</p>
              )}
              <p style={styles.headerSubtitle}>Recuperação de Acesso</p>
            </div>

            {/* Body */}
            <div style={styles.bodyContainer}>
              <p style={styles.greeting}>Olá, {userName}!</p>
              <p style={styles.intro}>
                Recebemos uma solicitação para redefinir a senha da sua conta ({userEmail}) no {appType === 'admin' ? 'Backoffice' : brandName}.
                Para cadastrar uma nova senha segura, clique no botão abaixo:
              </p>

              {/* Action Button */}
              <div style={styles.buttonContainer}>
                <a href={resetUrl} target="_blank" rel="noreferrer" style={styles.button}>
                  Redefinir Minha Senha
                </a>
              </div>

              {/* Link Fallback */}
              <div style={styles.linkFallback}>
                <span style={{ color: '#94A3B8', fontWeight: 600 }}>Se o botão não funcionar, copie e cole o link no navegador:</span><br />
                <span style={{ color: '#818CF8' }}>{resetUrl}</span>
              </div>

              {/* Security Warning */}
              <div style={styles.alertBox}>
                <p style={styles.alertText}>
                  ⚠️ <strong>Atenção:</strong> Este link é válido por 60 minutos. Se você não solicitou a redefinição de senha, nenhuma ação é necessária e sua senha atual continuará segura.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={styles.footer}>
              <p style={styles.footerText}>
                Este e-mail foi enviado automaticamente para {userEmail}.<br />
                Por motivos de segurança, não responda a esta mensagem.
              </p>
              <p style={styles.footerBrand}>{brandName} &mdash; Proteção de Conta</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
