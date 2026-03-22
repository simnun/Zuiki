import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, itemId } = await params

  // Verify session ownership
  const session = await prisma.shootingSession.findUnique({ where: { id }, select: { companyId: true } })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.companyId !== user.companyId && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const item = await prisma.catalogItem.findUnique({
    where: { id: itemId },
    include: { photos: { orderBy: { sortOrder: 'asc' } } },
  })

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, itemId } = await params

  // Verify session ownership
  const sess = await prisma.shootingSession.findUnique({ where: { id }, select: { companyId: true } })
  if (!sess) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (sess.companyId !== user.companyId && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  try {
    const item = await prisma.catalogItem.update({
      where: { id: itemId },
      data: {
        productName: body.productName,
        productType: body.productType,
        color: body.color,
        composition: body.composition,
        shortDesc: body.shortDesc,
        longDesc: body.longDesc,
        seoTags: body.seoTags,
        metaTitle: body.metaTitle,
        metaDesc: body.metaDesc,
        metaKeywords: body.metaKeywords,
        altImage: body.altImage,
        aiResponse: body.aiResponse,
        license: body.license,
        recognizedModel: body.recognizedModel,
        status: body.status,
        errorMessage: body.errorMessage,
        processingTimeMs: body.processingTimeMs,
      },
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    })

    // Update session counters if status changed
    if (body.status === 'done') {
      await prisma.shootingSession.update({
        where: { id },
        data: { processedItems: { increment: 1 } },
      })
    } else if (body.status === 'error') {
      await prisma.shootingSession.update({
        where: { id },
        data: { failedItems: { increment: 1 } },
      })
    }

    return NextResponse.json(item)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { itemId, id } = await params

    // Verify session ownership
    const sess = await prisma.shootingSession.findUnique({ where: { id }, select: { companyId: true } })
    if (!sess) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (sess.companyId !== user.companyId && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.catalogItem.delete({ where: { id: itemId } })

    await prisma.shootingSession.update({
      where: { id },
      data: { totalItems: { decrement: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
