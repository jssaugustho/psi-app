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

  // Exclude local testing paths starting with /p/
  if (url.pathname.startsWith('/p/')) {
    return NextResponse.next();
  }

  // Define hostnames that are treated as the main platform domains (do not rewrite)
  const isPlatformDomain = 
    hostname.includes('localhost:') || 
    hostname.includes('sites.psiapp.com.br') || 
    hostname === 'psiapp.com.br';

  if (isPlatformDomain) {
    // If it's a main domain and accesses the root, show a default welcome page
    if (url.pathname === '/') {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // Rewrite custom domain requests to /_sites/[hostname]/[path]
  url.pathname = `/_sites/${hostname}${url.pathname}`;
  return NextResponse.rewrite(url);
}
