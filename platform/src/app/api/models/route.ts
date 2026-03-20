import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const models = await prisma.model.findMany({
    where: { companyId: user.companyId },
    include: { facePhotos: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(models)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const body = await req.json()

  const model = await prisma.model.create({
    data: {
      companyId: user.companyId,
      name: body.name,
      heightCm: body.heightCm,
      sizeTop: body.sizeTop,
      sizeBottom: body.sizeBottom,
    },
    include: { facePhotos: true },
  })

  return NextResponse.json(model, { status: 201 })
}
