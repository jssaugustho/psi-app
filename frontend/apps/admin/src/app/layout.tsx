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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      {/* bg e color são controlados pelo BrandContext via CSS vars */}
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <ApiStatusProvider>
          <AuthProvider>
            <BrandProvider>
              <ProgressProvider>

                {children}
              </ProgressProvider>
            </BrandProvider>
          </AuthProvider>
        </ApiStatusProvider>
      </body>
    </html>
  );
}
