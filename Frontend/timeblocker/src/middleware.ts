import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Skip static and API routes
  if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api') || url.pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  // Force fresh HTML responses (no-store) for navigations
  const acceptsHTML = req.headers.get('accept')?.includes('text/html');
  if (req.method === 'GET' && acceptsHTML) {
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
