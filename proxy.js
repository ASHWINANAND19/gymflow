// Runs before every matched page request. Sends logged-out visitors to
// /login and keeps each role inside its own section of the app.
// (Each API route also checks the role itself; this only guards pages.)
import { NextResponse } from 'next/server';
import { readSessionToken, SESSION_COOKIE, homeFor } from './lib/auth.js';

const PUBLIC_PAGES = ['/', '/login', '/register'];

export async function proxy(request) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (PUBLIC_PAGES.includes(pathname)) {
    if (session) return NextResponse.redirect(new URL(homeFor(session.role), request.url));
    if (pathname === '/') return NextResponse.redirect(new URL('/login', request.url));
    return NextResponse.next();
  }

  if (!session) return NextResponse.redirect(new URL('/login', request.url));

  const section = pathname.split('/')[1]; // 'admin' | 'trainer' | 'member'
  if (section !== session.role) {
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/register', '/admin/:path*', '/trainer/:path*', '/member/:path*'],
};
