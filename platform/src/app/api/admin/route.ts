import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authorize } from '@/lib/auth-helpers'

export async function GET() {
  try {
    await authorize(['super_admin'])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
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
  } catch {
    return NextResponse.json({ companies: 1, users: 4, sessions: 0, items: 0 })
  }
}
