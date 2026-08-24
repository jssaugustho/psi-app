# Arquitetura do Wizard de Criação de Sites, Gestão de Domínios, Identidade Visual & Sistema de Rascunhos

Este documento descreve a arquitetura técnica, fluxo de dados, algoritmos de extração de cores, lógica de domínios, regras de isolamento de marca contra vazamentos e o sistema de múltiplos rascunhos para a criação e edição de páginas de captação no **Psi App** (`apps/web`).

---

## 1. Visão Geral da Arquitetura do Wizard (`/dashboard/captacao/nova`)

O assistente de criação de páginas foi desenhado como um **Wizard em 4 Etapas Sequenciais**, garantindo onboarding fluido, validações em tempo real e visualização contínua das alterações da marca.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ [←] Captação / Nova Página           [Rascunho Salvo]   [1 Nome] [2 Identidade] [3 Endereço] [4 Revisão] │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  Etapa 1: Nome da Psicóloga / Identificação                                             │
│  Etapa 2: Identidade Visual & Estilo (Logo/Favicon, Cores, Fontes, Prévia ao Vivo)     │
│  Etapa 3: Escolha de Endereço & Domínios (Subdomínio Gratuito ou Domínio Próprio)       │
│  Etapa 4: Revisão Executiva & Publicação                                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detalhamento das 4 Etapas do Wizard

### 2.1 Etapa 1: Nome da Psicóloga & Identificação da Página
- **Entrada Principal:** Nome profissional da psicóloga ou título da landing page (ex: *Dra. Geovanna Bastos - Psicoterapia*).
- **Validação:** Mínimo de 2 caracteres obrigatórios antes de permitir o avanço.
- **Automação SEO:** Conforme a psicóloga digita o nome, o sistema gera automaticamente os campos de metadados para motores de busca (`metaTitle` e `metaDescription`).

---

### 2.2 Etapa 2: Identidade Visual & Estilo da Marca

Esta etapa reúne toda a experiência de marca em 4 sub-seções estruturadas:

#### 1. Logotipo e Ícone do Site (Favicon)
- Permite o upload independente de:
  - **Logotipo em Imagem:** Exibido no cabeçalho e rodapé do site.
  - **Ícone do Site (Favicon):** Exibido na aba do navegador e nos símbolos decorativos.
- Suporta upload direto ou seleção via Biblioteca de Mídia (`MediaLibraryModal`).

#### 2. Paleta de Cores, Herança & Overrides (Canvas + HSL Saturation Clustering)
- **Lógica de Herança vs. Override:**
  - **Herança Padrão (Sem Override):** Por padrão, ao abrir o wizard, a paleta é inicializada com as **cores da marca do Tenant dono** (`tenant.gradientColorStart`, `tenant.gradientColorEnd`, `tenant.contrastColor`). Se a psicóloga não alterar as cores (ou mantiver a opção "Usar Cores da Minha Marca"), o site é salvo sem override estático, herdando dinamicamente as alterações futuras da marca da conta.
  - **Override Customizado:** Caso a psicóloga selecione uma paleta pronta (`COLOR_PALETTES`) ou defina cores personalizadas, o site salva a flag `isOverride: true` e grava os valores em `siteConfig.theme.colors` como um **override exclusivo** do site.
- **Modo Paletas Prontas:** Apresenta uma coleção de combinações harmônicas pré-configuradas (`COLOR_PALETTES`), além da paleta extraída da marca.
- **Extração de Cores do Logo/Favicon (Algoritmo Imune a CORS e Canvas Tainting):**
  1. O algoritmo passa a URL da imagem (Logotipo ou Ícone/Favicon) pelo proxy interno mesmo-domínio [`/api/proxy-image?url=...`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/api/proxy-image/route.ts). O servidor Node faz o download da imagem sem restrições de CORS e retorna a imagem com o cabeçalho `Access-Control-Allow-Origin: *`.
  2. O navegador recebe o blob e o converte em **Base64 Data URL** sem macular (`taint`) o canvas HTML5.
  3. Desenha a imagem em um Canvas de **128x128 pixels**, garantindo que arquivos SVG sem dimensões ou favicons de 16x16 / 32x32 sejam lidos em escala adequada.
  4. **Pontuação por Saturação HSL & Classificação Inteligente:** Pontua as cores dando multiplicador de peso para tons vibrantes (como o roxo, azul, verde, terracota do seu ícone ou marca), enquanto mantém tons neutros (branco/preto/cinza) em pontuação secundária sem excluí-los erroneamente.
  5. Agrupa e ordena as cores por distância visual ($\Delta E \ge 30$), mesclando o Logotipo e o Ícone.
- **Pop-over Overlay ("CORES DA SUA MARCA"):**
  - Exibe as cores extraídas reais da marca do usuário (Logo e/ou Ícone).
  - Gerencia o estado de processamento via `isExtractingColors` com o indicador `"Lendo cores da imagem..."` e indica graciosamente caso nenhuma cor adicional tenha sido identificada.
  - Inclui o botão `Escolha +` para acionar o seletor nativo hexadecimal.
- **Painel de Seleção Personalizada:**
  - Controlado pelo estado `isCustomColor`.
  - **Exibição Inicial:** As Paletas Prontas são exibidas por padrão (`isCustomColor = false`), com o card **Personalizar Cores** posicionado no final em **100% de largura** (`sm:col-span-2 col-span-full`) para máximo destaque.
  - Ao clicar no card, abre o painel inline com seletores de **Cor Primária**, **Cor Secundária** e **Texto / Contraste**.

#### 3. Tipografia & Fontes
- Seleção independente de **Fonte dos Títulos** (`fontHeading`) e **Fonte dos Parágrafos** (`fontBody`) utilizando o componente `FontPicker`.
- As fontes são injetadas dinamicamente no `<head>` via Google Fonts API para renderização em tempo real.

#### 4. Prévia em Tempo Real da Marca
- Exibe simulador ao vivo com a combinação exata de cores, logotipo e fontes escolhidas.

---

### 2.3 Etapa 3: Escolha de Endereço & Domínio

Esta etapa gerencia o roteamento e o endereço da página na internet:

#### 1. Domínios no Nível da Conta (`tenant.slug` & `tenant.domain`)
- O **Subdomínio TheraOS** (`.theraos.app`) e o **Domínio Próprio Customizado** pertencem ao **nível da conta (Tenant)** e são compartilhados entre todas as páginas do mesmo psicólogo. O usuário pode ter ambos ativos simultaneamente.
- **Trava de Edição no Wizard:** Se a conta já possuir pelo menos um registro cadastrado (`tenant.slug` ou `tenant.domain`), a interface do wizard exibe os endereços ativos em modo de leitura (Read-Only) com o selo "Domínios da Conta Configurados" e um botão que redireciona em nova aba (`target="_blank"`) para a tela de **Configurações da Conta** (`/dashboard/configuracoes`), onde o gerenciamento global deve ser realizado.
- **Cadastro Inicial (Sem Subdomínio):** Se a conta ainda não possuir subdomínio cadastrado (`!tenant.slug`), o wizard permite registrar o primeiro subdomínio gratuito durante a criação do primeiro site.

#### 2. Slug da Página (`/slug`) e Validação Única por Conta
- Define o caminho/endereço específico da landing page (ex: `/terapia-adulto`, ou raiz `/` para a página principal).
- **Validação Única por Conta ao Avançar:** Ao clicar em "Avançar" ou navegar a partir da Etapa 3, o sistema executa uma consulta assíncrona (`api.getCapturePages`) para verificar se a slug informada já pertence a outra página da mesma conta. Caso pertença, o avanço é bloqueado com aviso visual, prevenindo colisões ou sobrescrita acidental de páginas existentes.

---

### 2.4 Etapa 4: Revisão & Publicação Final

- Apresenta o resumo executivo das configurações de marca, tipografia e endereço.
- Ao clicar em **Criar Página**, o backend registra a página de captação e o rascunho correspondente é removido automaticamente do `localStorage`.

---

## 3. Arquitetura do Sistema de Múltiplos Rascunhos

O sistema permite salvar e retomar múltiplos rascunhos em paralelo durante a criação de landing pages.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ CHAVE LOCALSTORAGE: psi_page_drafts_[tenantId]                                          │
│                                                                                         │
│ [                                                                                       │
│   { "id": "draft_1787149680616", "newTitle": "José Augustho", "currentStep": 2, ... },  │
│   { "id": "draft_1787150123999", "newTitle": "Terapia Ansiedade", "currentStep": 3, ... }  │
│ ]                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Gravação & Auto-Save em Tempo Real
- **Salvamento Automático:** Sempre que qualquer campo (título, logotipo, cores, fontes, subdomínio, slug ou etapa) é alterado, o estado é persistido no array `psi_page_drafts_${tenantId}`.
- **Identificador Único (`draftId`):** Cada rascunho possui seu próprio `draftId` (ex: `draft_1787149680616`), permitindo a convivência de múltiplos rascunhos em paralelo.
- **Pílula de Confirmação:** Exibe a pílula verde **"Rascunho Salvo"** no cabeçalho do wizard.

### 3.2 Migração Transparente de Rascunhos Legados
- O leitor de rascunhos possui um algoritmo de fallback que inspeciona as chaves das versões anteriores (`psi_page_creation_draft_${tenantId}` e `psi_page_creation_draft_global`).
- Se houver algum rascunho gravado no formato antigo, ele é migrado automaticamente para a nova lista sem perda de dados para a psicóloga.

### 3.3 Apresentação dos Rascunhos na Listagem (`/dashboard/captacao`)

#### 1. Rascunhos no Grid Principal de Cards
- Rascunhos não concluídos são listados **na mesma grade de cards onde ficam os sites criados/ativos**.
- **Anatomia do Card de Rascunho:**
  - Badge de status de cor âmbar: **`RASCUNHO`**.
  - Título da página em rascunho e horário do último salvamento.
  - Indicador da etapa alcançada (ex: *Etapa 2 de 4*), fonte dos títulos e amostras circulares de cores.
  - Botão de **Excluir** (Lixeira).
  - Botão principal **Continuar Rascunho** (Edit), que redireciona para `/dashboard/captacao/nova?draftId=[ID]`.

#### 2. Modal ao Clicar em "+ NOVA PÁGINA" (`DraftModal`)
- Se existirem rascunhos salvos, ao clicar no botão **+ NOVA PÁGINA**, o sistema abre o modal **Nova Página de Captação**:
  - **Ação Principal:** Card pontilhado **+ Criar Nova Página do Zero** (redireciona para `/dashboard/captacao/nova?fresh=true`).
  - **Lista de Rascunhos:** Exibe todos os rascunhos salvos com data/hora e botões de **Continuar** e **Excluir**.
- Se não houver rascunhos, redireciona diretamente para o wizard limpo.

---

## 4. Prevenção de Vazamento de Marca Multi-Tenant (Ordem de Fallback)

Para evitar que as cores de uma clínica ou do tema padrão azulem/vazem para a interface de outro psicólogo, o sistema segue uma **ordem estrita de resolução de marca**:

1. **API do Backend (`tenant` / `platformBrand` via `BrandContext`):** Fonte primária e mandatória.
2. **Cache Local (`localStorage`):** Utilizado para preservar rascunhos em andamento específicos do tenant ativo.
3. **Escala de Cinza Neutra / Preto (`#27272A` / `#52525B`):** Fallback técnico seguro em `globals.css`. NUNCA utiliza azul ou cores vibrantes genéricas.

---

## 5. Resumo das Alterações e Arquivos Envolvidos

| Arquivo | Função & Modificações Realizadas |
| :--- | :--- |
| [`frontend/apps/web/src/app/globals.css`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/globals.css) | Fallback CSS global alterado de azul (`#4F46E5`) para escala de cinza/preto neutro (`#27272A` / `#52525B`). |
| [`frontend/apps/web/src/app/dashboard/captacao/nova/page.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/dashboard/captacao/nova/page.tsx) | Wizard em 4 etapas, extração de cores via Base64 Canvas, seletores de fontes, visualização ao vivo e suporte a `draftId`. |
| [`frontend/apps/web/src/app/dashboard/captacao/page.tsx`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/frontend/apps/web/src/app/dashboard/captacao/page.tsx) | Listagem principal de sites, renderização de cards de rascunhos na grade, exclusão e `DraftModal`. |
| [`.agents/site_creation_wizard_architecture.md`](file:///c:/Users/josea/Documents/Desenvolvimento/psi-app/.agents/site_creation_wizard_architecture.md) | Documentação oficial da arquitetura do wizard, domínios, marca e rascunhos. |
