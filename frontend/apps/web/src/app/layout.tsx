import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BrandProvider } from "@/context/BrandContext";
import { ProgressProvider } from "@/context/ProgressContext";
import { ApiStatusProvider } from "@/context/ApiStatusContext";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
                {children}
              </ProgressProvider>
            </ApiStatusProvider>
          </BrandProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
