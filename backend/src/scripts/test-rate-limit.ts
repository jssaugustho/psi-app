import dotenv from 'dotenv';
import { queueEmail } from '../emails/queue-email';

dotenv.config();

async function testRateLimiting() {
  console.log('🚀 Iniciando teste intensivo do Rate Limiter / Anti-Spam (15 E-mails)...\n');
  const targetEmail = 'joseaugustholi@gmail.com';

  for (let i = 1; i <= 15; i++) {
    console.log(`📧 Enfileirando e-mail #${i}/15...`);
    await queueEmail({
      template: 'login_notification',
      to: targetEmail,
      subject: `Teste Carga #${i} [${new Date().toLocaleTimeString('pt-BR')}]`,
      props: {
        userName: 'José (Teste Intensivo)',
        userEmail: targetEmail,
        loginAt: new Date().toISOString(),
        device: 'Teste Carga 15 Emails Script',
        ip: '127.0.0.1',
        brandName: 'PSI App Test',
        gradientStart: '#4F46E5',
        gradientEnd: '#06B6D4',
      },
    });

    // Intervalo curto de 500ms entre envios
    if (i < 15) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log('\n✅ 15 e-mails enfileirados com sucesso! Aguardando 6 segundos para os workers processarem...');
  await new Promise((r) => setTimeout(r, 6000));
  process.exit(0);
}

testRateLimiting().catch((err) => {
  console.error('❌ Erro no script de teste:', err);
  process.exit(1);
});
