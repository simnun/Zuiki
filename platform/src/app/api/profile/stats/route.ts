import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [sessionCount, itemCount, userData] = await Promise.all([
      prisma.shootingSession.count({ where: { createdById: user.id } }),
      user.companyId
        ? prisma.catalogItem.count({
            where: { session: { companyId: user.companyId }, status: 'done' },
          })
        : Promise.resolve(0),
      prisma.user.findUnique({ where: { id: user.id }, select: { createdAt: true } }),
    ])

    return NextResponse.json({
      sessions: sessionCount,
      items: itemCount,
      since: userData?.createdAt
        ? new Date(userData.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
        : '',
    })
  } catch {
    return NextResponse.json({ sessions: 0, items: 0, since: '' })
  }
}
