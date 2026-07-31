# ✉️ Regras de E-mail, White-Label e Resolução de Tenant

Este documento estabelece as regras obrigatórias para a criação, envio e estilização de e-mails transacionais dentro do ecossistema multi-tenant. Todas as futuras implementações de e-mails e inteligências artificiais de desenvolvimento **devem** seguir estas diretrizes.

---

## 🎨 1. Estilização e Identidade Visual (White-Label)

Nenhum e-mail transacional deve conter referências diretas ou indiretas à marca padrão/master da plataforma (vazamento de marca) caso tenha sido disparado por interações dentro de um tenant específico.

* **Logotipo**:
  * Todo template de e-mail deve aceitar uma propriedade opcional `logoUrl`.
  * Se a URL do logotipo do tenant estiver disponível, exiba o logotipo no topo/cabeçalho do e-mail.
  * Por conta do design escuro (`dark mode`) padrão das notificações, dê preferência pela logo escura (`logoDarkUrl`) do tenant. Se ausente, faça fallback para a logo clara (`logoLightUrl`).
  * Se nenhuma logo estiver cadastrada no tenant, exiba o nome da marca em texto puro (`brandName`).
* **Cores**:
  * Os gradientes e botões nos e-mails devem seguir as cores configuradas do tenant: `gradientColorStart` e `gradientColorEnd`.
  * Nunca use as cores padrões da plataforma master se o tenant possuir paleta própria.

---

## 🗺️ 2. Links e Redirecionamentos

Qualquer link, botão ou menção a endereço web dentro de um e-mail transacional **deve apontar obrigatoriamente para a URL do tenant** que disparou a ação.

* **Construção da URL do Tenant**:
  * Se o tenant possuir um domínio próprio configurado (`tenant.domain`), utilize-o como base absoluta: `https://{tenant.domain}`.
  * Se não possuir domínio customizado, utilize o slug: `https://{plataforma.com}/{tenant.slug}` ou `https://{tenant.slug}.{plataforma.com}` (dependendo do modelo de roteamento da infraestrutura).
* **Nenhum Vazamento**: É proibido embutir links estáticos que apontem para o domínio raiz do painel administrativo da plataforma master nos e-mails de tenants.

---

## 🔑 3. Resolução Dinâmica de Tenant por Requisição

Quando uma ação de login ou cadastro ocorrer, o backend deve identificar dinamicamente qual tenant fez a chamada para aplicar o branding correto.

* **Como Resolver**:
  * Extraia os cabeçalhos `Origin` ou `Referer` da requisição HTTP Fastify.
  * Parseie a URL e filtre por:
    1. Domínio customizado correspondente (`tenants.domain`).
    2. Subdomínio correspondente ao slug (`tenants.slug`).
    3. Slug presente no path da URL (ex: `/slug/login`).
  * Se nenhum tenant for mapeado pela URL, faça o fallback seguro para o **Tenant Primário** cadastrado nas configurações gerais da plataforma (`platformSettings.primaryTenantId`).

### Exemplo de Implementação (Fastify API):
```typescript
const matchedTenant = await resolveTenantFromRequest(request);
const brandName = matchedTenant?.name ?? 'Plataforma';
const logoUrl = matchedTenant ? (matchedTenant.logoDarkUrl || matchedTenant.logoLightUrl || null) : null;
```

---

## 🔒 4. Autenticação e Envio (Resend)

* **Formato do Remetente (`from`)**:
  * O remetente do e-mail sempre deve ser um endereço válido. Se as configurações globais possuírem apenas o domínio (ex: `exemplo.com`), o backend deve prefixar automaticamente com `no-reply@` (ex: `no-reply@exemplo.com`).
* **Registros de Segurança**:
  * Certifique-se de que os registros DNS **SPF, DKIM e DMARC** estejam configurados e validados no painel administrativo para garantir que os e-mails não caiam na caixa de spam de provedores como Google e Yahoo.
