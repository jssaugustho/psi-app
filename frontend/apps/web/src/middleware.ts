import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Intercepta todas as requisições exceto:
     * - api/ (rotas de API interna ou proxy)
     * - _next/static (assets estáticos compilados)
     * - _next/image (otimizador de imagem do Next)
     * - favicon.ico, sitemap.xml, robots.txt
     * - arquivos de mídia e estáticos (.svg, .png, .jpg, .jpeg, .gif, .webp, .css, .js, .woff, .woff2, .ttf, .eot, .ico, .json, .webmanifest)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ttf|eot|ico|json|webmanifest)$).*)',
  ],
};

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  // 1. Obter o hostname original do visitante (injetado pelo Cloudflare Worker em X-Forwarded-Host ou Host)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host') || '';
  const hostname = (forwardedHost || hostHeader).split(':')[0].toLowerCase();

  // 2. Definir domínios base da plataforma (que não devem ser tratados como subdomínio de psicóloga)
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'theraos.app';
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  // Ignorar rotas de API interna
  if (url.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 3. Extrair subdomínio (ex: "dra-geovanna" em "dra-geovanna.ajstrategy.digital")
  let subdomain: string | null = null;

  if (isLocalhost) {
    // No ambiente local, permite testar subdomínios via localhost (ex: dra-geovanna.localhost:3000)
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') {
      subdomain = parts[0];
    }
  } else if (hostname.endsWith(`.${baseDomain}`)) {
    const parts = hostname.replace(`.${baseDomain}`, '').split('.');
    subdomain = parts[parts.length - 1];
  }

  // Ignorar subdomínios de sistema reservados
  const reservedSubdomains = ['www', 'app', 'admin', 'api', 'dashboard', 'auth'];
  if (subdomain && !reservedSubdomains.includes(subdomain)) {
    // REWRITE INTERNO: Mantém a URL bonita na barra do navegador (https://dra-geovanna.ajstrategy.digital/)
    // e serve a página dinâmica do tenant em /sites/[slug]
    const rewriteUrl = new URL(`/sites/${subdomain}${url.pathname}${url.search}`, request.url);
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}
