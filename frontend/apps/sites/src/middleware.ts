import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match todas as rotas exceto:
     * - _next/static, _next/image, favicon.ico, sitemap.xml, robots.txt
     * - arquivos de mídia/estáticos (.css, .js, .svg, .png, .jpg, .webp)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Obter hostname real (injetado pelo Cloudflare Worker via X-Tenant-Domain, X-Foxbase-Tenant, X-Forwarded-Host, query param tenant ou Host)
  const tenantDomain = request.headers.get('x-tenant-domain') || 
                       request.headers.get('x-foxbase-tenant') || 
                       url.searchParams.get('tenant');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host') || '';
  const hostname = (tenantDomain || forwardedHost || hostHeader).split(':')[0].toLowerCase();

  const isLocal = hostname.includes('localhost');
  const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || (isLocal ? 'http://localhost:3000' : 'https://app.theraos.app');

  // Permitir rotas de teste local e preview direto em /p/[tenant]/[slug] ou /sites/
  if (url.pathname.startsWith('/p/') || url.pathname.startsWith('/sites/')) {
    return NextResponse.next();
  }

  // Se for o domínio raiz direto da plataforma (ex: sites.psiapp.com.br ou app da vercel sem header)
  const isPlatformRoot = hostname.includes('vercel.app') && !forwardedHost && !tenantDomain;
  if (isPlatformRoot) {
    if (url.pathname === '/' || url.pathname === '') {
      return NextResponse.redirect(new URL(mainAppUrl), 307);
    }
    return NextResponse.next();
  }

  // Rewrite interno para a rota dinâmica por subdomínio/domínio: /sites/[hostname]/[path]
  const normalizedPath = url.pathname.startsWith('/') ? url.pathname : `/${url.pathname}`;
  url.pathname = `/sites/${hostname}${normalizedPath === '/' ? '' : normalizedPath}`;
  return NextResponse.rewrite(url);
}

