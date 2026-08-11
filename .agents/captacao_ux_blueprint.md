# Blueprint de Design do Produto: Construtor de Páginas & Construtor de Fluxo de Triagem (Etapas)

Este blueprint descreve a experiência do usuário (UX), a interface (UI) e o design do produto para a funcionalidade de **Páginas de Captação Personalizáveis** no Psi App.

---

## 1. Arquitetura Multitenant de Frontends Separados

Para isolar o tráfego dos pacientes das operações do consultório e otimizar a performance, a solução será dividida em dois aplicativos front-end distintos:

1.  **`apps/web` (Aplicativo do Psicólogo - Privado):**
    *   Contém a agenda, CRM, prontuários e o **Editor de Páginas de Captação** (com suas 3 abas).
2.  **`apps/sites` (Renderizador de Landing Pages - Público):**
    *   Aplicação Next.js de alta performance e otimizada para SEO.
    *   Exibe as páginas públicas e os formulários de triagem dos pacientes.
    *   Conectada diretamente ao Cloudflare (SSL para domínios próprios) para resolver os domínios customizados (ex: `consulta.psicologageovanna.com.br`).

### 🌐 Resolução de Rotas e Acesso Local (Localhost & URL de Teste)

Para permitir que a psicóloga teste a página antes de publicar seu domínio DNS, ou para fins de desenvolvimento em ambiente local (`localhost`), a aplicação `apps/sites` suportará dois fluxos de mapeamento de URLs:

#### 1. Rota de Desenvolvimento / Testes (Localhost & Subdomínios do App)
Qualquer acesso feito via `localhost` (ou subdomínio padrão do aplicativo, ex: `sites.psiapp.com.br`) utilizará o roteamento estruturado por parâmetros na URL:
*   **URL de Teste / Localhost:** `http://localhost:3002/p/[tenantSlug]/[pageSlug]`
*   *Como funciona:* O Next.js mapeia o `tenantSlug` (ex: `geovanna`) e o `pageSlug` (ex: `terapia-individual`) diretamente como parâmetros de busca para carregar as configurações de design e o fluxo de etapas corretos no banco.

#### 2. Rota de Produção (Domínio Customizado White-Label)
Quando um paciente acessa o domínio próprio apontado para o app, o sistema usa reescrita de URL transparente:
*   **URL de Produção:** `https://terapia.geovannabastos.com.br/`
*   *Como funciona:* O middleware do `apps/sites` detecta que a requisição não é do localhost/sistema, identifica o hostname (`terapia.geovannabastos.com.br`) e faz uma reescrita interna para a rota resolvida no banco de dados, servindo a página na raiz `/` de forma transparente para o paciente.

---

```
                              +---------------------------------------+
                              |         Cloudflare Custom Hostnames   |
                              +-------------------+-------------------+
                                                  |
                         +------------------------+------------------------+
                         | (Domínio Customizado)                           | (Domínio do App)
                         v                                                 v
           +-------------+-------------+                     +-------------+-------------+
           |       apps/sites          |                     |         apps/web          |
           | (Renderizador Público)    |                     |   (Painel & Construtor)   |
           +-------------+-------------+                     +-------------+-------------+
                         |                                                 |
                         +------------------------+------------------------+
                                                  |
                                                  v
                                     +------------+------------+
                                     |        API Backend      |
                                     +-------------------------+
```

---

## 2. O Workspace do Editor (Estrutura de Três Abas)

Ao abrir uma página para edição no painel (`apps/web`), a psicóloga visualiza um workspace unificado dividido em três abas superiores:

```
+-----------------------------------------------------------------------------------------+
| [<- Voltar]  Página: Psicoterapia Individual   |  [ Layout ]  [ Formulário ]  [ Configs ] |
+-----------------------------------------------------------------------------------------+
```

### Aba 1: Editor do Layout (Estilo Elementor)
*   **Esquerda (Painel de Textos e Mídia):** Accordions com os campos de preenchimento (Textos do Hero, Biografia do Sobre Mim, Perguntas do FAQ, etc.) e uploads de fotos.
*   **Direita (Preview em Tempo Real):** Simulador visual interativo da landing page que reage instantaneamente a cada letra alterada no formulário à esquerda.

```
+-----------------------------------------------------------------------------------------+
| [<- Voltar]  Página: Psicoterapia Individual   |  [ Layout ]* [ Formulário ]  [ Configs ] |
+-----------------------------------------------------------------------------------------+
| PAINEL DE CONTEÚDO (Esquerda)          | PREVIEW DA LANDING PAGE (Direita)              |
|                                        | +--------------------------------------------+ |
| [+] Seção 1: Hero (Destaque)           | | [Logo]                          [Agendar]  | |
|     Título Principal:                  | |                                            | |
|     [Terapia Individual para Adultos]  | | Terapia Individual para Adultos            | |
|                                        | | Encontre o equilíbrio e o autoconhecimento | |
| [+] Seção 2: Diagnóstico               | | com atendimento personalizado.             | |
| [+] Seção 3: Sobre Mim                 | |                                            | |
| [+] Seção 4: FAQ                       | +--------------------------------------------+ |
+-----------------------------------------------------------------------------------------+
```

### Aba 2: Editor do Formulário (Estilo Construtor Foxbase)
*   **Esquerda (Painel de Etapas):** Menu contendo as Etapas Modelo para arrastar e soltar no canvas.
*   **Direita (Canvas de Conexões de Etapas):** Tela infinita onde a psicóloga conecta as etapas criando a árvore lógica de triagem (com suporte a saídas condicionais nos seletores).

```
+-----------------------------------------------------------------------------------------+
| [<- Voltar]  Página: Psicoterapia Individual   |  [ Layout ]  [ Formulário ]* [ Configs ] |
+-----------------------------------------------------------------------------------------+
| PAINEL DE ETAPAS (Esquerda)  | CANVAS DE FLUXOGRAMA (Centro/Direita)                    |
|                              | +------------------------------------------------------+ |
| [ Arrastar Nova Etapa ]      | |                                                      | |
| [+] Nome                     | |  [ Início ]                                          | |
| [+] Celular                  | |       o--------------------+                         | |
| [+] E-mail                   | |                            |                         | |
| [+] CPF                      | |                            v                         | |
| [+] Maioridade               | |                      [ Nome ]                        | |
| [+] C. Emergência            | |                        o                             | |
| [+] Contrato                 | |                        |                             | |
|                              | |                        v                             | |
| [ Campos Livres ]            | |                 [ Maioridade ]                       | |
| [+] Texto Curto              | |                       o                              | |
| [+] Parágrafo                | |                       |                              | |
| [+] Seletor Condicional      | |          +------------+------------+                 | |
|                              | |          | (Maior)                 | (Menor)         | |
|                              | |          v                         v                 | |
|                              | |   [ Terapia Adulto ]       [ Terapia Infantil ]      | |
|                              | |                                                      | |
|                              | +------------------------------------------------------+ |
+-----------------------------------------------------------------------------------------+
```

### Aba 3: Configurações da Página (Metadados e Redes)
Nesta aba, a psicóloga gerencia a URL de acesso e as otimizações de SEO da página.

```
+-----------------------------------------------------------------------------------------+
| [<- Voltar]  Página: Psicoterapia Individual   |  [ Layout ]  [ Formulário ]  [ Configs ]*|
+-----------------------------------------------------------------------------------------+
| CONFIGURAÇÕES DA PÁGINA (SEO & Domínios)                                                |
|                                                                                         |
| 1. Configurações de Domínio e Acesso                                                    |
|    URL da Página de Captação:                                                           |
|    [x] Usar Domínio Próprio Cadastrado                                                  |
|    [https://terapia.geovannabastos.com.br                                          ]    |
|    (Status DNS: [ CNAME Ativo / SSL Seguro ])                                           |
|                                                                                         |
| 2. SEO & Metadados (Como a página aparece no Google e WhatsApp)                         |
|    Título da Página (Meta Title):                                                       |
|    [ Geovanna Bastos - Psicoterapia Clínica TCC                            ]            |
|    Descrição de Busca (Meta Description):                                               |
|    [ Terapia individual online e presencial para adultos em São Paulo. Agende...   ]    |
|    Imagem de Compartilhamento (Open Graph Image):                                       |
|    [ Upload de Imagem (Recomendado: 1200x630px) ]                                       |
|                                                                                         |
| 3. Ações e Integrações pós-Triagem                                                      |
|    Destino de Sucesso:                                                                  |
|    (o) Redirecionar para o WhatsApp da Psicóloga                                        |
|    ( ) Redirecionar para URL Externa (Ex: Calendly, página de obrigado)                 |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Catálogo Refinado de Etapas (Modelos de Inputs)

A triagem é montada sequencialmente pelo paciente no frontend público (`apps/sites`) exibindo uma única tela por etapa:

1.  **`[Nome]` Nome Completo:** Input de texto simples de identificação.
2.  **`[Celular]` Celular / WhatsApp:** Máscara dinâmica com seletor de DDI nacional/internacional.
3.  **`[E-mail]` E-mail:** Validação de formato de correio eletrônico.
4.  **`[CPF]` CPF:** Validador e máscara de CPF brasileira.
5.  **`[Maioridade]` Verificação de Idade:** Escolha única simples ("Sim, sou maior" / "Não, sou menor").
6.  **`[C. Emergência]` Contato de Emergência (Composto):** Captura estruturada em uma tela unificada de:
    *   *Nome completo* do contato.
    *   *Grau de parentesco / Relação*.
    *   *Telefone de contato*.
7.  **`[Contrato]` Contrato Terapêutico:** Exibe a minuta selecionada em scroll e obriga a marcação do checkbox de consentimento antes de permitir o avanço.
8.  **`[T]` Texto Curto (Personalizado):** Pergunta customizada com input de uma linha.
9.  **`[¶]` Parágrafo (Personalizado):** Pergunta com caixa de texto multilinha para relatos.
10. **`[S]` Seletor Condicional (Personalizado):** Escolha de opções onde cada alternativa gera um conector físico no canvas para ramificar e direcionar o fluxo de triagem.
