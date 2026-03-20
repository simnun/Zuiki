import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public routes that don't need auth
  const publicPaths = ['/login', '/api/auth']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  // Check for auth session cookie (Auth.js v5 uses __Secure- prefix in production)
  const sessionCookie = req.cookies.get('__Secure-authjs.session-token')
    || req.cookies.get('authjs.session-token') // dev without HTTPS
  const isLoggedIn = !!sessionCookie?.value

  if (isPublic) {
    // If logged in and trying to access login, redirect to dashboard
    if (isLoggedIn && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // Everything else requires authentication
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
