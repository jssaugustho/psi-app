# Rascunhos, Staging e Publicação (Guia de Arquitetura)

Este documento descreve o funcionamento técnico do fluxo de **Rascunhos (Drafts)**, **Ambiente de Homologação (Staging)** e **Publicação (Publishing)** das páginas de captação no ecossistema TheraOS, servindo como guia de desenvolvimento para futuras alterações no Editor de Sites e Wizard.

---

## 1. Visão Geral da Arquitetura

O sistema gerencia o estado da página em dois níveis:
1. **Status Geral da Página**: Se a página está pública ou privada (`site_config.status: 'draft' | 'published'`).
2. **Alterações Pendentes (Staging)**: Representado pelas chaves dentro da coluna JSONB `draft_data` da tabela `capture_pages`.

```
                  ┌──────────────────────────────┐
                  │   Criador / Site Editor      │
                  └──────────────┬───────────────┘
                                 │ (Autosave)
                                 ▼
                     Status da Página no Banco?
                     /                        \
           Se status = 'draft'            Se status = 'published'
          (Ainda não publicada)           (Já publicada ao vivo)
                   /                            \
   Salva diretamento nas colunas         Salva alterações APENAS na
   principais + colunas de draft         coluna 'draft_data' (Staging)
                   │                            │
                   ▼                            ▼
        Visita pública dá 404         Visita pública exibe versão live
        (Sem token de membro)         (Staging oculto até Publicar)
```

---

## 2. Status e Ciclo de Vida da Página

### A. Estado `'draft'` (Rascunho Inicial - Pré-Publicação)
- **Quando ocorre**: Durante a criação no Wizard e enquanto o site nunca tiver sido publicado pelo usuário.
- **Autosave**: Salva todas as modificações nas colunas principais (`site_config`, `dictionary`, `form_flow`, `seo_config`, etc.) E nas respectivas chaves de rascunho (`titleDraft`, `slugDraft`, etc., que alimentam `draft_data`).
- **Visibilidade**:
  - **No Dashboard**: Listado como badge **Rascunho**. O botão "Ver Site" aponta para a URL com parâmetros de staging.
  - **No Live (App Sites)**: Visitantes públicos que tentarem acessar a URL recebem **404 (Not Found)**.
  - **No Preview (Staging)**: Apenas membros logados do workspace podem visualizar (autenticação feita via parâmetro `token` na URL).

### B. Estado `'published'` (Publicado - Pós-Publicação)
- **Quando ocorre**: A partir do momento em que o usuário clica em "Publicar Página" no editor.
- **Autosave**: Ao modificar elementos no editor, o autosave escreve as alterações **estritamente dentro da coluna `draft_data`** (especificamente em chaves como `siteConfigDraft`, `formFlowDraft`, etc.).
  - As colunas de produção permanecem intocadas.
- **Visibilidade**:
  - **No Live (App Sites)**: Visitantes públicos continuam visualizando as colunas estáveis de produção.
  - **No Preview (Staging)**: Membros autorizados visualizam a versão com as alterações mais recentes ao acessar a URL com `?staging=true&token=[JWT]`.
  - **No Dashboard**: A listagem de páginas detecta dados em `draft_data` e exibe o badge **Staging**, sinalizando alterações pendentes.

---

## 3. Lógica de Segurança e Renderização no App de Sites

A aplicação de sites (`apps/sites`) decide o que renderizar usando a lógica unificada abaixo:

1. **Visitas Públicas Padrão (`preview=false`)**:
   - Só permite renderizar a página se `site_config.status === 'published'`. Caso contrário, retorna `null` (404).
   - Renderiza estritamente os campos das colunas de produção (ignora o conteúdo de `draft_data`).

2. **Visualização em Staging / Preview (`preview=true` ou `staging=true`)**:
   - Requer obrigatoriamente um parâmetro `token` na query da URL.
   - O app de sites faz uma chamada interna de validação à tabela `capture_pages` passando `Authorization: Bearer <token>` no header da requisição.
   - **Autorizado**: Se o token for de um membro válido do workspace, o banco retorna os dados (RLS validada). O app de sites então executa a mesclagem de rascunhos (`applyDraftData`), exibindo as alterações não publicadas.
   - **Não Autorizado**: Se falhar na validação:
     - Se o site for publicado, exibe a versão live padrão (ignora as alterações de staging).
     - Se o site for rascunho, bloqueia com 404.

---

## 4. Como Trabalhar com Alterações no Criador de Sites daqui para frente

Ao implementar novos componentes, campos de configuração ou fluxos no Site Editor, siga as diretrizes abaixo:

### A. Adicionando uma Nova Propriedade ao Site
Caso crie uma nova propriedade estrutural no site (ex: `siteConfig.professional.newField`):
1. **No Editor Web (`apps/web`)**: 
   - Certifique-se de que o campo seja serializado adequadamente no estado `page.siteConfig`.
   - O autosave salvará a alteração dentro do objeto de rascunho.
2. **No App de Sites (`apps/sites`)**:
   - Atualize a função de mesclagem `applyDraftData` no arquivo `frontend/apps/sites/src/lib/api.ts` caso o novo campo seja salvo fora de `site_config` ou exija mesclagem customizada.
   - **Nota**: A maior parte dos campos adicionados dentro de `site_config`, `dictionary` ou `form_flow` é tratada automaticamente, pois a função `applyDraftData` mescla os objetos JSONB raiz de uma vez só:
     ```typescript
     site_config: draft.siteConfig !== undefined ? draft.siteConfig : item.site_config
     ```

### B. Manuseando o Estado de Autosave
No editor (`captacao/[pageId]/page.tsx`), o hook de autosave sempre deve verificar o status antes de salvar:
```typescript
const isDraft = page.siteConfig?.status === 'draft';
const updatePayload: any = {
  // Salva no staging (draft_data)
  titleDraft: page.title,
  siteConfigDraft: page.siteConfig,
  formFlowDraft: updatedFlow,
  // ... outros campos
};

// Se for rascunho, atualiza também a produção imediatamente
if (isDraft) {
  updatePayload.title = page.title;
  updatePayload.siteConfig = page.siteConfig;
  updatePayload.formFlow = updatedFlow;
}

await api.updateCapturePage(page.id, updatePayload);
```

### C. Ação de Publicar
A consolidação de staging para produção deve sempre passar pelo método `api.publishCapturePage(id)` da API.
- **Fluxo do Botão**: No cabeçalho, verifique o status da página. Exiba **"Publicar Página"** para rascunhos e **"Publicar Alterações"** para páginas ativas em staging. 
- Chamar a publicação atualiza as colunas principais com os rascunhos e redefine `draft_data` para `null`.

---

## 5. Relação de Arquivos Críticos do Fluxo

- **Web App**:
  - [`api.ts` (web)](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/lib/api.ts) - Implementação de `updateCapturePage` (mesclagem de draft) e `publishCapturePage` (consolidar para produção).
  - [`captacao/page.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/dashboard/captacao/page.tsx) - Listagem de páginas segregando rascunhos ativos de wizard baseados no banco de dados.
  - [`captacao/nova/page.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/dashboard/captacao/nova/page.tsx) - Wizard persistindo rascunhos diretamente no banco de dados e repassando UUID.
  - [`captacao/[pageId]/page.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/dashboard/captacao/[pageId]/page.tsx) - Site Editor aplicando lógica condicional de salvar vs publicar e injetando token JWT nos previews.

- **Sites App**:
  - [`api.ts` (sites)](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/sites/src/lib/api.ts) - Resolução de tokens, mesclagem `applyDraftData` e validação RLS com PostgREST.
  - [Rotas `[[...slug]]/page.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/sites/src/app/_sites/[domain]/[[...slug]]/page.tsx) e [`[pageSlug]/page.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/sites/src/app/p/[tenantSlug]/[pageSlug]/page.tsx) - Captura de `staging`, `preview` e `token` da query e encaminhamento ao resolver.
