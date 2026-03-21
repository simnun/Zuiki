import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import { inngest } from '@/lib/inngest'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Mark session as processing
  await prisma.shootingSession.update({
    where: { id },
    data: { status: 'processing' },
  })

  // Get all pending items
  const pendingItems = await prisma.catalogItem.findMany({
    where: { sessionId: id, status: 'pending' },
    include: { photos: { orderBy: { sortOrder: 'asc' } } },
  })

  // Mark items as processing
  await prisma.catalogItem.updateMany({
    where: { sessionId: id, status: 'pending' },
    data: { status: 'processing' },
  })

  // Trigger Inngest background job
  try {
    await inngest.send({
      name: 'catalog/session.process',
      data: { sessionId: id },
    })
  } catch (e) {
    console.error('[INNGEST] Failed to send event, processing will run on next trigger:', e)
  }

  return NextResponse.json({
    sessionId: id,
    itemsQueued: pendingItems.length,
    status: 'processing',
  })
}
