import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureCompanyExists } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['super_admin', 'owner', 'user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = user.companyId
  if (!companyId) return NextResponse.json([])

  try {
    const models = await prisma.model.findMany({
      where: { companyId },
      include: { facePhotos: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(models)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const companyId = user.companyId
  if (!companyId) {
    return NextResponse.json({ error: 'User has no company' }, { status: 400 })
  }

  const body = await req.json()

  try {
    // Ensure company exists (handles fallback auth when seed hasn't run)
    await ensureCompanyExists(companyId)

    const model = await prisma.model.create({
      data: {
        companyId,
        name: body.name,
        heightCm: body.heightCm ? parseInt(body.heightCm) : null,
        sizeTop: body.sizeTop || null,
        sizeBottom: body.sizeBottom || null,
      },
      include: { facePhotos: true },
    })

    return NextResponse.json(model, { status: 201 })
  } catch (e: any) {
    console.error('[API] Model create error:', e)
    return NextResponse.json({ error: e.message || 'Database error' }, { status: 500 })
  }
}
