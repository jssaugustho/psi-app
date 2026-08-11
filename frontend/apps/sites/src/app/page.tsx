import React from 'react';

export default function PlatformHomePage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        <span className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-[#06B6D4] flex items-center justify-center font-bold text-3xl text-white mx-auto shadow-lg animate-pulse">
          Ψ
        </span>
        <h1 className="text-3xl font-serif font-normal">Sites de Captação</h1>
        <p className="text-[#A1A1AA] text-sm leading-relaxed">
          Esta é a rede de distribuição de páginas de captação de pacientes e triagem para psicólogos do Psi App.
        </p>
        <div className="text-xs text-[#52525B]">
          Configure seu domínio próprio no painel administrativo para visualizar sua página aqui.
        </div>
      </div>
    </div>
  );
}
