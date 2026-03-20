import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, any> = {
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : 'MISSING',
      AUTH_SECRET: process.env.AUTH_SECRET ? 'SET' : 'MISSING',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
    },
  }

  try {
    const { prisma } = await import('@/lib/db')
    const result = await prisma.$queryRawUnsafe('SELECT 1 as ok')
    checks.db = { status: 'connected', result }
  } catch (e: any) {
    checks.db = { status: 'error', message: e.message }
  }

  try {
    const { prisma } = await import('@/lib/db')
    const userCount = await prisma.user.count()
    checks.users = { count: userCount }
  } catch (e: any) {
    checks.users = { error: e.message }
  }

  return NextResponse.json(checks)
}
