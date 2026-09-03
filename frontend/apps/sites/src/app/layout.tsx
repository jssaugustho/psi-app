import React from 'react';
import './globals.css';
import { ApiStatusProvider } from '@psi/ui';
import { IframeNavigationBlocker } from '../components/IframeNavigationBlocker';

export const metadata = {
  title: 'Consultório de Psicologia | Triagem',
  description: 'Agende sua consulta e preencha a triagem inicial.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#000000] text-[#F4F4F5]" suppressHydrationWarning>
        <ApiStatusProvider defaultRedirectUrl="/">
          <IframeNavigationBlocker />
          {children}
        </ApiStatusProvider>
      </body>
    </html>
  );
}
