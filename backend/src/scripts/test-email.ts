import dotenv from 'dotenv';
import { queueEmail } from '../emails/queue-email';

dotenv.config();

async function run() {
  console.log('Sending test email to queue...');
  const success = await queueEmail({
    template: 'login_notification',
    to: 'joseaugustholi@gmail.com',
    props: {
      userName: 'José',
      userEmail: 'joseaugustholi@gmail.com',
      loginAt: new Date().toISOString(),
      device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ip: '127.0.0.1',
      brandName: 'AJ Strategy',
      gradientStart: '#4F46E5',
      gradientEnd: '#06B6D4',
    },
  });

  if (success) {
    console.log('✅ Email queued successfully!');
  } else {
    console.log('❌ Failed to queue email.');
  }

  // Allow some time for RabbitMQ publish before exit
  await new Promise((resolve) => setTimeout(resolve, 2000));
  process.exit(0);
}

run().catch(console.error);
