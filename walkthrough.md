# Walkthrough do Ajuste na Linha do Tempo & Temas

Ajustamos o layout da Linha do Tempo (Timeline) para corrigir o problema em que os círculos de indicação (pontos) estavam sendo cortados na lateral esquerda. Além disso, adicionamos a funcionalidade de uma aba global com o Histórico de Alterações em tempo real e corrigimos um problema estrutural de contraste do Tailwind CSS v4 com o tema claro.

## Alterações Realizadas

### 1. Correção de Overflow Clipping
- **Componente**: [`ContactTabPanel.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/dashboard/crm/components/ContactTabPanel.tsx)
  - Separamos o scroll vertical da borda da linha do tempo. Adicionamos uma margem de `ml-4` para a linha do tempo interna, garantindo espaço suficiente à esquerda para que os pontos indicadores não sofram clipping.
  - Ocultamos a linha vertical quando não há registros na linha do tempo.

### 2. Novo Histórico de Alterações Global (Aba em Tempo Real)
- **Zustand Store**: [`crmStore.ts`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/stores/crmStore.ts)
  - Adicionamos a action `openTimelineTab` para gerenciar a abertura e ativação da aba especial de histórico global (`__timeline`). A aba se integra ao ciclo de abas do CRM e persiste no `sessionStorage`.
- **API Client**: [`api.ts`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/lib/api.ts)
  - Adicionamos a propriedade `contact` na interface `InteractionHistory` para conter dados do lead/contato associado.
  - Criamos o método `getGlobalInteractionHistory(tenantId)` para buscar as últimas 50 interações ocorridas em todo o CRM daquele tenant.
- **Painel de Histórico**: [`GlobalTimelinePanel.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/dashboard/crm/components/GlobalTimelinePanel.tsx)
  - Criamos um painel bonito baseado em glassmorphism que renderiza todos os logs do CRM cronologicamente.
  - Cada log exibe o nome do contato correspondente. Ao clicar no nome do contato, a aba daquele lead é aberta automaticamente.
- **Página do CRM**: [`page.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/dashboard/crm/page.tsx)
  - Adicionamos o botão "Histórico de Alterações" ao lado do botão de "Configurar Funil".
  - Registramos a aba "Histórico" no menu de abas principal e alternamos o conteúdo para o `GlobalTimelinePanel` quando ativa.

### 3. Correção de Contraste e Hover no Tema Claro (Tailwind v4)
- **Estilos Globais**: [`globals.css`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/globals.css)
  - Adicionamos a diretiva `@custom-variant dark (&:where(.dark, .dark *));` logo após o import do Tailwind.
  - **Motivo do Erro**: Por padrão, o Tailwind CSS v4 usa a mídia de preferência do sistema (`prefers-color-scheme`) para decidir se aplica as classes `dark:`. Se o sistema operacional do usuário estivesse em tema escuro, as classes `dark:` (como `dark:text-slate-400` e `dark:hover:text-slate-200`) eram ativadas mesmo que o aplicativo estivesse renderizado no tema claro (`html.light`). Isso fazia com que o texto das abas ficasse cinza claro e ficasse branco ao passar o mouse.
  - **Solução**: Forçar o Tailwind v4 a usar a estratégia baseada em classe `.dark` no elemento HTML, alinhando-se perfeitamente com o gerenciamento de temas da aplicação.

## Verificação Realizada

- **Ajuste de Altura das Abas de Triagem**:
  - Padronizadas as abas com altura fixa `h-8` (32px) e borda física (`border border-transparent` no estado ativo e `border border-[var(--surface-border)]` no estado inativo) no arquivo [`page.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/dashboard/crm/page.tsx). Isso elimina discrepâncias de altura e impede desalinhametos verticais e layout shifts de 2px.

- **Resolução de Fontes UTM no Webhook**:
  - Modificado o arquivo de rotas do CRM do backend [`crm.ts`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/backend/src/apis/core/routes/crm.ts) para realizar resolução inteligente de UTMs enviadas para as origens cadastradas nas configurações do tenant (ex: `utm_source: 'ig'` ou `utm_source: 'instagram'` são atribuídos a `Instagram`). Caso não haja correspondência direta, cai no fallback da origem padrão do tenant ou `Webhook`.

- **Script de Teste de Carga e Deduplicação (`test-leads-webhook`)**:
  - Criado o script [`test-leads-webhook.ts`](file:///c:/Users/josea/Documents/Desenvolvimento\psi-app\backend\src\scripts\test-leads-webhook.ts) para gerar e subir 100 leads aleatórios via webhook de forma automatizada.
  - Adicionado o atalho correspondente em [`package.json`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/backend/package.json) para rodar o teste com `npm run test-leads-webhook`.
  - Executados os testes com 100% de sucesso (89 novos contatos criados e 11 duplicados detectados/atualizados na timeline, sem erros de requisição).

- **Correção da Visibilidade do Ícone de Filtro**:
  - Adicionadas as classes `z-10` e `top-1/2 -translate-y-1/2` ao ícone `<Filter>` na barra de controles do CRM no arquivo [`page.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/dashboard/crm/page.tsx).
  - **Motivo do Erro**: O componente customizado `<Select>` é renderizado com posicionamento relativo (`relative`), o que criava um contexto de empilhamento que desenhava o fundo do seletor de origem por cima do ícone do filtro posicionado de forma absoluta, ocultando-o. O ajuste garante que o ícone renderize acima do fundo e fique perfeitamente centralizado verticalmente.

- **Script de Reset do CRM (`reset-crm`)**:
  - Criado o script [`reset-crm.ts`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/backend/src/scripts/reset-crm.ts) que limpa todos os contatos e históricos de interação no banco mantendo as configurações do funil de vendas e tenant.
  - Adicionado o atalho correspondente em [`package.json`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/backend/package.json) para rodar a limpeza com `npm run reset-crm`.

- **Mapeamento de Fontes em Formato Duplo**:
  - Aprimorado o webhook [`crm.ts`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/backend/src/apis/core/routes/crm.ts) para resolver UTMs com compatibilidade para o novo formato de origens configuradas (tanto arrays de strings simples `string[]` quanto objetos `{ id, name, utm_source... }[]`).

- **Ajuste de Altura do Seletor ao Abrir**:
  - Atualizados os componentes [`select.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/packages/ui/src/select.tsx) e [`select-with-helper.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/packages/ui/src/select-with-helper.tsx) na variante `glass` para possuir altura fixa `h-9` (36px) em vez de `py-2`.
  - **Motivo do Erro**: Ao abrir o dropdown, a animação de rotação 180° do SVG do chevron no seletor baseado em padding criava uma micro-flutuação de tamanho da caixa física, resultando em layout shift. Com `h-9`, a altura permanece perfeitamente idêntica.

