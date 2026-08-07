# 🚀 Regras de Transição de Páginas e Lazy Loading

Este documento estabelece as diretrizes obrigatórias para transição de páginas e navegação no backoffice (`admin`) e no aplicativo do cliente (`web`). O cumprimento dessas regras garante transições instantâneas, previne flicker (piscar de tela) e evita requisições redundantes de APIs.

---

## 🏗️ 1. Uso de Layouts Compartilhados (`layout.tsx`)

Toda seção que possua um contêiner comum (como a dashboard com menu lateral e cabeçalho) **deve** centralizar esse contêiner em um arquivo de Layout do Next.js (`layout.tsx`) na raiz do diretório da rota.

### ❌ Exemplo Incorreto (Duplicação do AppShell):
*Colocar o AppShell em cada página individual:*
```tsx
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  return <AppShell menuItems={...}>Conteúdo</AppShell>;
}

// src/app/dashboard/emails/page.tsx
export default function EmailsPage() {
  return <AppShell menuItems={...}>E-mails</AppShell>;
}
```
*Problema:* Ao navegar de `/dashboard` para `/dashboard/emails`, o React desmonta todo o `AppShell`, recarregando a barra lateral, reinicializando o estado do menu, revalidando a autenticação e buscando configurações visuais novamente.

### ✅ Exemplo Correto (Layout Centralizado):
*Criar um arquivo de layout que monta o contêiner apenas uma vez:*
```tsx
// src/app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  const menuItems = [
    { label: 'Painel', href: '/dashboard', active: pathname === '/dashboard' },
    { label: 'E-mails', href: '/dashboard/emails', active: pathname === '/dashboard/emails' }
  ];

  return (
    <AppShell menuItems={menuItems} user={user} onLogout={logout}>
      {children}
    </AppShell>
  );
}

// src/app/dashboard/emails/page.tsx (Fica limpo de AppShell!)
export default function EmailsPage() {
  return <div className="space-y-6">Conteúdo de E-mails</div>;
}
```

---

## 🔒 2. Centralização de Guards (Autenticação e Permissões)

*   **Validação Única**: A verificação de sessão (se o usuário está logado, se é administrador, etc.) deve ser feita **exclusivamente no `layout.tsx`** da rota autenticada.
*   **Boilerplate Mínimo**: Subpáginas (como `emails/page.tsx`) não devem conter verificações manuais de `useEffect` com redirecionamentos para `/login`. Elas devem assumir que o ambiente é seguro.

---

## ⚡ 3. Animações de Entrada da Página (`Transition Animations`)

Toda página renderizada dentro do layout principal deve utilizar uma animação suave de entrada para que o conteúdo carregue com elegância.
*   **Classe CSS**: Utilize a classe utilitária `animate-page-enter` na div raiz de cada página.
*   **Definição no global.css**:
    ```css
    @keyframes pageEnter {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-page-enter {
      animation: pageEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    ```

---

## 🔗 4. Navegação Sem Recarregamento do Navegador

*   **Evite o elemento `<a>` nativo**: Nunca use links HTML tradicionais `<a href="...">` para navegação interna, pois eles causam recarga completa da página.
*   **Use o componente customizado `<Link>`**: Utilize sempre o componente customizado de navegação que integra o Next.js `Link` e dispara a barra de carregamento de progresso (`ProgressContext`), preservando o estado do aplicativo.

---

## 🌓 5. Aplicação Unificada (Admin & Web)

Estas regras de transições, bem como as diretrizes de **Glassmorphism** e **Temas (Claro/Escuro)** descritas em [glassmorphism_rules.md](file:///.agents/glassmorphism_rules.md), aplicam-se igualmente a:
1.  **Painel de Administração Global** (`apps/admin`)
2.  **Portal do Cliente/Usuário** (`apps/web`)
