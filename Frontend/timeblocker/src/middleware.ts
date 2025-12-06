import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Supabase auth is handled client-side; let Supabase redirect unauthenticated users
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
