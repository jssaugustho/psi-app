import * as React from 'react';

export interface InviteMemberProps {
  userName: string;
  inviterName: string;
  tenantName: string;
  roleName: string;
  actionLink: string;
  isNewUser: boolean;
  brandName: string;
  gradientStart: string;
  gradientEnd: string;
  logoUrl?: string | null;
}

export function InviteMemberEmail({
  userName,
  inviterName,
  tenantName,
  roleName,
  actionLink,
  isNewUser,
  brandName,
  gradientStart,
  gradientEnd,
  logoUrl,
}: InviteMemberProps) {
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
    body2: {
      padding: '32px 40px',
    } as React.CSSProperties,
    greeting: {
      fontSize: '16px',
      color: '#E2E8F0',
      margin: '0 0 8px',
    } as React.CSSProperties,
    intro: {
      fontSize: '14px',
      color: '#94A3B8',
      lineHeight: '1.6',
      margin: '0 0 28px',
    } as React.CSSProperties,
    buttonWrapper: {
      textAlign: 'center' as const,
      margin: '32px 0',
    } as React.CSSProperties,
    button: {
      display: 'inline-block',
      background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
      color: '#FFFFFF',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: '600',
      padding: '12px 32px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    } as React.CSSProperties,
    infoBox: {
      backgroundColor: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '28px',
    } as React.CSSProperties,
    infoRow: {
      display: 'flex',
      alignItems: 'flex-start',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    } as React.CSSProperties,
    infoRowLast: {
      display: 'flex',
      alignItems: 'flex-start',
      padding: '10px 0',
    } as React.CSSProperties,
    infoLabel: {
      fontSize: '12px',
      color: '#64748B',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.6px',
      fontWeight: '600',
      minWidth: '100px',
      paddingTop: '1px',
    } as React.CSSProperties,
    infoValue: {
      fontSize: '14px',
      color: '#CBD5E1',
      lineHeight: '1.5',
      flex: '1',
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
        <title>Convite para colaborar — {tenantName}</title>
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
                <img src={logoUrl} alt={tenantName} style={styles.headerLogo} />
              ) : (
                <p style={styles.headerTitle}>{tenantName}</p>
              )}
              <p style={styles.headerSubtitle}>Convite de Colaborador</p>
            </div>

            {/* Body */}
            <div style={styles.body2}>
              <p style={styles.greeting}>Olá, {userName}!</p>
              <p style={styles.intro}>
                Você foi convidado por <strong>{inviterName}</strong> para colaborar na equipe do consultório <strong>{tenantName}</strong>. 
                {isNewUser 
                  ? ' Como este é seu primeiro acesso, clique no botão abaixo para definir sua senha de acesso e concluir a configuração do seu perfil.'
                  : ' Clique no botão abaixo para confirmar seu acesso e começar a colaborar.'}
              </p>

              {/* Info box */}
              <div style={styles.infoBox}>
                <table width="100%" cellPadding="0" cellSpacing="0">
                  <tbody>
                    <tr>
                      <td style={{ ...styles.infoRow, display: 'table-row' }}>
                        <td style={styles.infoLabel}>Consultório</td>
                        <td style={styles.infoValue}>{tenantName}</td>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ ...styles.infoRow, display: 'table-row' }}>
                        <td style={styles.infoLabel}>Convidado por</td>
                        <td style={styles.infoValue}>{inviterName}</td>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ display: 'table-row' }}>
                        <td style={styles.infoLabel}>Papel (Função)</td>
                        <td style={{ ...styles.infoValue, textTransform: 'capitalize' } as React.CSSProperties}>{roleName}</td>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Action Button */}
              <div style={styles.buttonWrapper}>
                <a href={actionLink} style={styles.button}>
                  {isNewUser ? 'Definir Senha e Acessar' : 'Acessar Consultório'}
                </a>
              </div>
            </div>

            {/* Footer */}
            <div style={styles.footer}>
              <p style={styles.footerText}>
                Este e-mail foi enviado porque você foi convidado no consultório {tenantName}.<br />
                Se não reconhece este convite, pode ignorar este e-mail.
              </p>
              <p style={styles.footerBrand}>{brandName} &mdash; Acesso seguro</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
