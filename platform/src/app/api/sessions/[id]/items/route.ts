import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const items = await prisma.catalogItem.findMany({
    where: { sessionId: id },
    include: { photos: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  try {
    const item = await prisma.catalogItem.create({
      data: {
        sessionId: id,
        sku: body.sku,
        productName: body.productName,
        productType: body.productType,
        suffix: body.suffix,
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
        status: body.status || 'pending',
      },
      include: { photos: true },
    })

    // Update session item count
    await prisma.shootingSession.update({
      where: { id },
      data: { totalItems: { increment: 1 } },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
