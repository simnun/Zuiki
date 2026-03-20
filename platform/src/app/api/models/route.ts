import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

const DEFAULT_COMPANY = 'zuiki-default'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = user.companyId || DEFAULT_COMPANY

  const models = await prisma.model.findMany({
    where: { companyId },
    include: { facePhotos: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(models)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = user.companyId || DEFAULT_COMPANY
  const body = await req.json()

  const model = await prisma.model.create({
    data: {
      companyId,
      name: body.name,
      heightCm: body.heightCm,
      sizeTop: body.sizeTop,
      sizeBottom: body.sizeBottom,
    },
    include: { facePhotos: true },
  })

  return NextResponse.json(model, { status: 201 })
}
