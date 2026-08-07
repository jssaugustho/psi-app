import * as React from 'react';

export interface LoginNotificationProps {
  userName: string;
  userEmail: string;
  loginAt: string;        // ISO string
  device: string;         // user-agent string
  ip: string;
  brandName: string;
  gradientStart: string;
  gradientEnd: string;
  logoUrl?: string | null;
  appType?: 'app' | 'admin';
}

/** Faz parse simplificado do user-agent para texto legível */
function parseDevice(ua: string): string {
  if (!ua || ua === 'Desconhecido') return 'Dispositivo desconhecido';

  let os = 'Sistema operacional desconhecido';
  if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6/i.test(ua)) os = 'Windows 7/8';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Navegador desconhecido';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\//i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  return `${browser} em ${os}`;
}

/** Formata data ISO para português */
function formatDate(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
    });
    const time = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    });
    return { date, time };
  } catch {
    return { date: iso, time: '' };
  }
}

export function LoginNotificationEmail({
  userName,
  userEmail,
  loginAt,
  device,
  ip,
  brandName,
  gradientStart,
  gradientEnd,
  logoUrl,
  appType,
}: LoginNotificationProps) {
  const { date, time } = formatDate(loginAt);
  const deviceLabel = parseDevice(device);

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
      minWidth: '90px',
      paddingTop: '1px',
    } as React.CSSProperties,
    infoValue: {
      fontSize: '14px',
      color: '#CBD5E1',
      lineHeight: '1.5',
      flex: '1',
    } as React.CSSProperties,
    alertBox: {
      backgroundColor: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '10px',
      padding: '16px 20px',
      marginBottom: '28px',
    } as React.CSSProperties,
    alertText: {
      fontSize: '13px',
      color: '#FCA5A5',
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
        <title>Novo acesso detectado — {brandName}</title>
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
              <p style={styles.headerSubtitle}>
                {appType === 'admin' ? 'Acesso ao Backoffice' : 'Acesso ao Aplicativo'}
              </p>
            </div>

            {/* Body */}
            <div style={styles.body2}>
              <p style={styles.greeting}>Olá, {userName}!</p>
              <p style={styles.intro}>
                Detectamos um novo acesso à sua conta {appType === 'admin' ? 'de administrador (Backoffice)' : 'no aplicativo'}. Confira os detalhes abaixo.
                Se foi você, pode ignorar este e-mail com segurança.
              </p>

              {/* Info box */}
              <div style={styles.infoBox}>
                <table width="100%" cellPadding="0" cellSpacing="0">
                  <tbody>
                    <tr>
                      <td style={{ ...styles.infoRow, display: 'table-row' }}>
                        <td style={styles.infoLabel}>Data</td>
                        <td style={styles.infoValue}>{date}</td>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ ...styles.infoRow, display: 'table-row' }}>
                        <td style={styles.infoLabel}>Horário</td>
                        <td style={styles.infoValue}>{time} (horário de Brasília)</td>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ ...styles.infoRow, display: 'table-row' }}>
                        <td style={styles.infoLabel}>Dispositivo</td>
                        <td style={styles.infoValue}>{deviceLabel}</td>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ display: 'table-row' }}>
                        <td style={styles.infoLabel}>IP</td>
                        <td style={styles.infoValue}>{ip}</td>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Alert */}
              <div style={styles.alertBox}>
                <p style={styles.alertText}>
                  <strong style={{ color: '#F87171' }}>Nao reconhece esse acesso?</strong>
                  {' '}Troque sua senha imediatamente e entre em contato com o suporte.
                  Seu e-mail de acesso e: <strong>{userEmail}</strong>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={styles.footer}>
              <p style={styles.footerText}>
                Este e-mail foi enviado automaticamente para {userEmail}.<br />
                Voce nao precisa responder.
              </p>
              <p style={styles.footerBrand}>{brandName} &mdash; Acesso seguro</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
