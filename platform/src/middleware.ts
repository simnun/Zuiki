import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public routes that don't need auth
  const publicPaths = ['/login', '/api/auth', '/api/health']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  const token = await getToken({ req, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET })
  const isLoggedIn = !!token

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

  // Admin routes require super_admin role
  if (pathname.startsWith('/admin')) {
    const role = (token as any)?.role
    if (role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
