import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const session = await prisma.shootingSession.findUnique({
    where: { id },
    include: {
      sessionModels: { include: { model: { include: { facePhotos: true } } } },
      mannequinConfig: true,
      catalogItems: {
        include: { photos: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      },
      correlations: { include: { items: { include: { item: true } } } },
      excelFiles: true,
      createdBy: { select: { firstName: true, lastName: true } },
    },
  })

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.companyId !== user.companyId && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(session)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const session = await prisma.shootingSession.findUnique({ where: { id } })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.companyId !== user.companyId && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const updated = await prisma.shootingSession.update({
      where: { id },
      data: {
        status: body.status,
        totalItems: body.totalItems,
        processedItems: body.processedItems,
        failedItems: body.failedItems,
        completedAt: body.status === 'completed' ? new Date() : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params

    const session = await prisma.shootingSession.findUnique({ where: { id } })
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (session.companyId !== user.companyId && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.shootingSession.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
