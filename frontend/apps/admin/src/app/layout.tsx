import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BrandProvider } from "@/context/BrandContext";
import { ProgressProvider } from "@/context/ProgressContext";
import { ApiStatusProvider } from "@/context/ApiStatusContext";

export const metadata: Metadata = {
  title: "Psi App - Backoffice Admin",
  description: "Painel de administração e gestão do sistema Psi App",
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
              Aguardando Bootstrap
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              O Backoffice está temporariamente bloqueado porque nenhum usuário Administrador foi cadastrado no banco de dados.
            </p>
          </div>
        </div>

        <div className="space-y-3 bg-zinc-50 dark:bg-black/35 border border-zinc-200 dark:border-white/5 p-5 rounded-2xl">
          <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wider uppercase">👉 Como Inicializar:</h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Acesse o console do servidor de backend e execute o comando de bootstrap para provisionar o primeiro administrador:
          </p>
          <div className="p-3 rounded-xl font-mono text-xs select-all bg-zinc-100 dark:bg-black/60 border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-white font-semibold text-center">
            npm run bootstrap
          </div>
        </div>

        <div className="text-center text-[10px] text-zinc-400 dark:text-zinc-500">
          Após finalizar o provisionamento no terminal, atualize esta página.
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
  const { hasAdmin } = await checkBootstrap();
  const unlocked = hasAdmin;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <ApiStatusProvider>
          <AuthProvider>
            <BrandProvider>
              <ProgressProvider>
                {unlocked ? children : <LockScreen />}
              </ProgressProvider>
            </BrandProvider>
          </AuthProvider>
        </ApiStatusProvider>
      </body>
    </html>
  );
}
