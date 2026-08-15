import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /static, /images, /favicon.ico (static files)
     */
    '/((?!api|_next/static|_next/image|images|favicon.ico).*)',
  ],
};

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  const isLocal = hostname.includes('localhost');
  const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 
    (isLocal ? 'http://localhost:3000' : 'https://app.psiapp.com.br');

  // Define hostnames that are treated as the main platform domains
  const isPlatformDomain = 
    hostname.includes('localhost:') || 
    hostname.includes('sites.psiapp.com.br') || 
    hostname === 'psiapp.com.br';

  if (isPlatformDomain) {
    // Protection: If user accesses the root of the sites app, redirect to the main app
    if (url.pathname === '/' || url.pathname === '') {
      return NextResponse.redirect(new URL(mainAppUrl), 307);
    }

    // Exclude local testing paths starting with /p/
    if (url.pathname.startsWith('/p/')) {
      return NextResponse.next();
    }
  }

  // Rewrite custom domain requests to /_sites/[hostname]/[path]
  url.pathname = `/_sites/${hostname}${url.pathname}`;
  return NextResponse.rewrite(url);
}
