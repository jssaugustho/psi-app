import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BrandProvider } from "@/context/BrandContext";
import { ProgressProvider } from "@/context/ProgressContext";

export const metadata: Metadata = {
  title: "Psi App - Backoffice Admin",
  description: "Painel de administração e gestão do sistema Psi App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      {/* bg e color são controlados pelo BrandContext via CSS vars */}
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <AuthProvider>
          <BrandProvider>
            <ProgressProvider>
              {/* Blobs de fundo animados (Altamente otimizados no compositor da GPU) */}
              <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none select-none">
                <div
                  className="absolute top-[-15%] left-[-15%] w-[60vw] h-[60vw] rounded-full opacity-[0.08] filter blur-[120px] animate-blob-1"
                  style={{
                    background: 'var(--brand-gradient-start)',
                  }}
                />
                <div
                  className="absolute bottom-[-15%] right-[-15%] w-[60vw] h-[60vw] rounded-full opacity-[0.08] filter blur-[120px] animate-blob-2"
                  style={{
                    background: 'var(--brand-gradient-end)',
                  }}
                />
              </div>
              {children}
            </ProgressProvider>
          </BrandProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
