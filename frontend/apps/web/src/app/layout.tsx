import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BrandProvider } from "@/context/BrandContext";
import { ProgressProvider } from "@/context/ProgressContext";
import { ApiStatusProvider } from "@/context/ApiStatusContext";
import { ErrorProvider } from "@/context/ErrorContext";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Psi App - Sistema de Autenticação",
  description: "Gerenciamento de usuários e autenticação com GoTrue e Fastify",
};

async function checkBootstrap(): Promise<{ hasAdmin: boolean; hasPlatformSettings: boolean }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';
  try {
    const res = await fetch(`${apiUrl}/auth/bootstrap/status`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        hasAdmin: !!data.has_admin,
        hasPlatformSettings: !!data.has_platform_settings,
      };
    }
  } catch (err: any) {
    console.warn('Conexão offline com o backend durante verificação de bootstrap no SSR:', err.message || err);
  }
  return { hasAdmin: true, hasPlatformSettings: true };
}

function LockScreen() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      <div 
        className="w-full max-w-md glass-md rounded-2xl shadow-xl p-8 transition-all duration-300 space-y-6"
        style={{ color: 'var(--brand-text-color, #F8FAFC)' }}
      >
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 
              className="text-2xl font-bold tracking-tight bg-clip-text text-transparent text-center"
              style={{
                backgroundImage: 'var(--brand-gradient, linear-gradient(135deg, #4f46e5, #06b6d4))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Portal em Manutenção
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              O portal está temporariamente suspenso para manutenção programada. Por favor, tente novamente em alguns instantes ou entre em contato com o suporte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { hasAdmin, hasPlatformSettings } = await checkBootstrap();
  const unlocked = hasAdmin && hasPlatformSettings;

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        <AuthProvider>
          <BrandProvider>
            <ApiStatusProvider>
              <ProgressProvider>
                <ErrorProvider>
                  {unlocked ? children : <LockScreen />}
                </ErrorProvider>
              </ProgressProvider>
            </ApiStatusProvider>
          </BrandProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
