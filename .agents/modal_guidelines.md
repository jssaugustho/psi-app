# Arquitetura e Guia de Uso de Modais, Popups & Portais no TheraOS

Este documento serve como diretriz oficial para a criação e uso de **Popups, Modais, Drawers e Dialogs** na plataforma TheraOS.

---

## 🛑 O Problema: Modais Presos em Sub-containers (Containing Blocks)

No desenvolvimento web com CSS moderno, se um container pai possui propriedades como:
- `transform: translate...` / `scale(...)`
- `animation: ...` (ex: `.animate-page-enter`, `.animate-fade-in`)
- `perspective: ...` / `filter: ...` / `contain: layout`

Qualquer elemento filho dentro dele com `position: fixed; inset: 0` **não** ficará posicionado em relação à janela do navegador (`viewport`). Em vez disso, ele ficará **preso dentro das dimensões do elemento pai**.

### Efeito Visual Negativo:
- O backdrop escuro cobre apenas a área do conteúdo da página.
- A barra lateral (Sidebar) e o cabeçalho (Topbar) continuam totalmente visíveis e des-escurecidos.
- O popup parece "desalinhado" ou "cortado".

---

## ✅ A Solução Oficial: React Portals + Componentes Padronizados

Para garantir que o modal escureça **100% da tela** (incluindo a Sidebar esquerda e a Topbar) e responda ao tema Claro/Escuro do tenant, **todos os modais devem utilizar o React Portal (`createPortal`)**.

A plataforma fornece componentes padronizados para essa finalidade:

1. **`<BrandModal>` (`@psi/ui`):** Para modais genéricos e formulários flutuantes.
2. **`<ConfirmModal>` (`@psi/ui`):** Para caixas de diálogo de confirmação (exclusão, ações destrutivas ou confirmações simples).
3. **`<Portal>` (`@/components/portal`):** Para overlays customizados e menus flutuantes que precisam de renderização na raiz do DOM (`document.body`).

---

## 🛠️ Como Usar os Componentes Padronizados

### 1. Usando `<BrandModal>` (Modais Genéricos e Rascunhos)
```tsx
import { BrandModal } from '@psi/ui';

function MeuComponente() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Abrir Modal</button>

      <BrandModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="max-w-lg" // Opções: max-w-md | max-w-lg | max-w-xl | max-w-2xl
      >
        <div className="space-y-4 text-slate-900 dark:text-white">
          <h3 className="text-base font-bold">Título do Popup</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Conteúdo do seu formulário ou alerta aqui.</p>
          
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setIsOpen(false)}>Fechar</button>
          </div>
        </div>
      </BrandModal>
    </>
  );
}
```

### 2. Usando `<ConfirmModal>` (Confirmações e Exclusões)
```tsx
import { ConfirmModal } from '@psi/ui';

<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Excluir Item"
  description="Tem certeza que deseja excluir este item permanentemente?"
  confirmText="Excluir"
  cancelText="Cancelar"
  variant="danger" // Opções: danger | primary
/>
```

---

## 🎨 Recursos Nativos dos Modais

1. **Renderização no Nível Raiz (`document.body`)**:
   Internamente, o componente utiliza `createPortal(children, document.body)` com `z-[10000]`, o que desvincula o popup de qualquer container pai transformado ou animado.

2. **Suporte Nativo a Tema Claro / Escuro (Light/Dark Mode)**:
   Os modais utilizam classes duplas de Tailwind e variáveis CSS reativas:
   - `--mix-base`: Define a cor de base do backdrop e superfície (preto no dark, branco no light).
   - `text-slate-900 dark:text-white`: Adaptação automática da tipografia.

3. **Comportamentos Nativos Inclusos**:
   - **ESC Key:** Pressionar a tecla `ESC` fecha o modal automaticamente.
   - **Backdrop Click:** Clicar na área fora do modal aciona o `onClose`.
   - **Lock de Scroll:** O scroll da página (`document.body.style.overflow = 'hidden'`) é travado enquanto o modal estiver aberto.
   - **Backdrop Blur:** Efeito fosco profissional (`backdrop-blur-md`).

---

## 🛑 O Que NUNCA Fazer

❌ **NUNCA crie uma div inline bruta de modal assim em páginas com animação:**
```tsx
// ❌ ERRADO: Ficará preso no container pai animado/transformado
{isOpen && (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
    <div className="bg-white p-6 rounded">Meu Modal</div>
  </div>
)}
```

✅ **CORRETO:** Utilizar sempre `<BrandModal>`, `<ConfirmModal>` ou envelopar no componente `<Portal>`.
