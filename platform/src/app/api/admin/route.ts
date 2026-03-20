import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authorize } from '@/lib/auth-helpers'

export async function GET() {
  await authorize(['super_admin'])

  const [companiesCount, usersCount, sessionsCount, itemsCount] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.shootingSession.count(),
    prisma.catalogItem.count(),
  ])

  return NextResponse.json({
    companies: companiesCount,
    users: usersCount,
    sessions: sessionsCount,
    items: itemsCount,
  })
}
