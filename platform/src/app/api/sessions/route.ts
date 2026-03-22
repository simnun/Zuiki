import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureCompanyExists } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['super_admin', 'owner', 'user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId && user.role !== 'super_admin') return NextResponse.json({ error: 'No company' }, { status: 403 })

  try {
    const where = user.role === 'super_admin' ? {} : { companyId: user.companyId! }
    const sessions = await prisma.shootingSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { catalogItems: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    })
    return NextResponse.json(sessions)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const body = await req.json()
  const { brand, season, year, shootingDate, shootType, modelIds, mannequin } = body

  await ensureCompanyExists(user.companyId)

  const session = await prisma.shootingSession.create({
    data: {
      companyId: user.companyId,
      createdById: user.id,
      brand,
      season,
      year,
      shootingDate: new Date(shootingDate),
      shootType,
      sessionModels: modelIds?.length
        ? { create: modelIds.map((modelId: string) => ({ modelId })) }
        : undefined,
      mannequinConfig: mannequin
        ? { create: { size: mannequin.size, bustCm: mannequin.bustCm, waistCm: mannequin.waistCm, hipsCm: mannequin.hipsCm } }
        : undefined,
    },
    include: {
      sessionModels: { include: { model: true } },
      mannequinConfig: true,
    },
  })

  return NextResponse.json(session, { status: 201 })
}
