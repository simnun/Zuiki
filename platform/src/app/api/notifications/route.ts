import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch {
    // Table may not exist yet before migration
    return NextResponse.json({ notifications: [], unreadCount: 0 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  try {
    if (body.markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      })
    } else if (body.markByLink) {
      // Mark all notifications with a matching link as read (e.g. when opening a ticket)
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false, link: body.markByLink },
        data: { read: true },
      })
    } else if (body.id) {
      await prisma.notification.update({
        where: { id: body.id },
        data: { read: true },
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
