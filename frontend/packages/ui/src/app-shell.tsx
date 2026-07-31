'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface AppShellProps {
  appName: string;
  logoUrl?: string | null;
  iconUrl?: string | null;
  menuItems: MenuItem[];
  user?: {
    nome: string;
    sobrenome: string;
    email: string;
    role?: string;
    avatarUrl?: string | null;
  } | null;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onLogout?: () => void;
  onEditProfile?: () => void;
  LinkComponent?: React.ComponentType<any>;
  children: React.ReactNode;
}

export function AppShell({
  appName,
  logoUrl,
  iconUrl,
  menuItems,
  user,
  theme = 'dark',
  onToggleTheme,
  onLogout,
  onEditProfile,
  LinkComponent,
  children,
}: AppShellProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div
      style={{
        color: 'var(--brand-text-color)',
      }}
      className="min-h-screen flex flex-col md:flex-row transition-colors duration-300"
    >
      {/* Sidebar - Fixo no Desktop (sticky 100vh), Glassmorphism */}
      <aside
        style={{
          borderTop: 'none',
          borderBottom: 'none',
          borderLeft: 'none',
          borderRadius: 0,
        }}
        className="glass-md w-full md:w-64 shrink-0 p-5 flex flex-col justify-between transition-all duration-300 md:h-screen md:sticky md:top-0 z-10"
      >
        <div>
          {/* Logo */}
          <div className="flex items-center justify-between gap-2 mb-8 h-10">
            <div className="flex items-center gap-2 max-w-[200px] overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={appName} className="max-h-10 max-w-full object-contain" />
              ) : (
                <>
                  {iconUrl ? (
                    <img src={iconUrl} alt="Icon" className="w-8 h-8 object-contain shrink-0" />
                  ) : (
                    <div
                      style={{
                        background: 'var(--brand-gradient)',
                        color: 'var(--brand-contrast-color)',
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold shadow-md shrink-0"
                    >
                      Ψ
                    </div>
                  )}
                  <span
                    style={{
                      background: 'var(--brand-gradient)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                    className="text-lg font-bold truncate"
                  >
                    {appName}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Navegação */}
          <nav className="space-y-1">
            {menuItems.map((item, index) => {
              const LinkTag = LinkComponent || 'a';
              return (
                <LinkTag
                  key={index}
                  href={item.href}
                  style={
                    item.active
                      ? {
                          background: 'color-mix(in srgb, var(--brand-gradient-start) 15%, transparent)',
                          color: 'var(--brand-gradient-start)',
                          border: '1px solid color-mix(in srgb, var(--brand-gradient-start) 30%, transparent)',
                        }
                      : {
                          color: 'var(--brand-text-color)',
                          border: '1px solid transparent',
                        }
                  }
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    item.active ? '' : 'opacity-65 hover:opacity-100 hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </LinkTag>
              );
            })}
          </nav>
        </div>

        {/* Usuário logado */}
        {user && (
          <div className="relative">
            {showUserMenu && (
              <div
                ref={menuRef}
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: 'var(--surface-border)',
                  color: 'var(--brand-text-color)',
                }}
                className="absolute bottom-14 left-0 w-full mb-2 rounded-xl p-1.5 shadow-2xl z-50 border glass-lg space-y-1"
              >
                {onEditProfile && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onEditProfile();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--surface-hover)] transition-all cursor-pointer bg-transparent border-none text-left"
                    style={{ color: 'var(--brand-text-color)' }}
                  >
                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Editar Perfil
                  </button>
                )}
                {onLogout && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--surface-hover)] transition-all cursor-pointer bg-transparent border-none text-left"
                    style={{ color: 'var(--status-error-text, #F87171)' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sair da Sessão
                  </button>
                )}
              </div>
            )}

            <div
              style={{ borderTop: '1px solid var(--surface-border)' }}
              className="pt-4 flex items-center justify-between"
            >
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex flex-1 items-center gap-3 overflow-hidden text-left bg-transparent border-none cursor-pointer p-1 rounded-lg hover:bg-[var(--surface-hover)] transition-all"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Foto de perfil"
                    className="w-9 h-9 rounded-full object-cover shrink-0 shadow-md"
                  />
                ) : (
                  <div
                    style={{
                      background: 'var(--brand-gradient)',
                      color: 'var(--brand-contrast-color)',
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-md"
                  >
                    {user.nome?.[0]?.toUpperCase()}
                    {user.sobrenome?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="truncate text-xs" style={{ color: 'var(--brand-text-color)' }}>
                  <span className="block font-medium truncate">
                    {user.nome} {user.sobrenome}
                  </span>
                  <span className="block truncate" style={{ opacity: 0.55 }}>
                    {user.email}
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Área de Conteúdo (Header Fixo + Corpo da Página) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Fixo (Top Bar), Glassmorphism */}
        <header
          style={{
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderRadius: 0,
          }}
          className="sticky top-0 z-30 h-16 shrink-0 flex items-center justify-between px-6 md:px-8 glass-sm transition-all"
        >
          {/* Lado Esquerdo do Header */}
          <div className="flex items-center gap-3">
            {/* Título ou Breadcrumb opcional pode ser inserido aqui */}
          </div>

          {/* Lado Direito - Botão de Alternar Tema */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              style={{
                border: '1px solid var(--surface-border)',
                color: 'var(--brand-text-color)',
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-base cursor-pointer shrink-0 bg-transparent hover:bg-[var(--surface-hover)]"
              title={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
            >
              {theme === 'dark' ? (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          )}
        </header>

        {/* Corpo da Página */}
        <main
          style={{ color: 'var(--brand-text-color)' }}
          className="flex-1 p-6 md:p-8 overflow-y-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
