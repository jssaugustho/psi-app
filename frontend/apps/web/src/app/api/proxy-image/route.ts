import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  if (url.startsWith('data:')) {
    const matches = url.match(/^data:(.+?);base64,(.+)$/);
    if (matches) {
      const contentType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return new NextResponse('Failed to fetch remote image', { status: res.status });
    }

    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/png';

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new NextResponse('Error proxying image', { status: 500 });
  }
}
