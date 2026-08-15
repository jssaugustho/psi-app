import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function PlatformHomePage() {
  const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://app.psiapp.com.br';
  redirect(mainAppUrl);
}
