import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public routes that don't need auth
  const publicPaths = ['/', '/login', '/api/auth', '/api/contact', '/api/ai/test-key']
  const isPublic = pathname === '/' || publicPaths.slice(1).some(p => pathname.startsWith(p))

  // Check for auth session cookie (Auth.js v5 uses __Secure- prefix in production)
  const sessionCookie = req.cookies.get('__Secure-authjs.session-token')
    || req.cookies.get('authjs.session-token') // dev without HTTPS
  const isLoggedIn = !!sessionCookie?.value

  if (isPublic) {
    // Let login page handle redirect if user is already authenticated
    // (avoids redirect loops when cookie exists but session is invalid)
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
