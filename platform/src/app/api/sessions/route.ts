import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureUserExists, withRetry } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['super_admin', 'owner', 'user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId && user.role !== 'super_admin') return NextResponse.json({ error: 'No company' }, { status: 403 })

  try {
    const where = user.role === 'super_admin' ? {} : { companyId: user.companyId! }
    const sessions = await withRetry(() => prisma.shootingSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { catalogItems: true, correlations: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    }))
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

  try {
    // Ensure user and company exist in DB (with retry for transient connection issues)
    await withRetry(() => ensureUserExists(user))

    const session = await withRetry(() => prisma.shootingSession.create({
      data: {
        companyId: user.companyId!,
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
    }))

    return NextResponse.json(session, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Sessions POST] Error creating session:', message)
    // Return a more specific status for connection issues
    const isConnectionError = message.includes('connect') || message.includes('timeout') || message.includes('ECONNREFUSED') || message.includes('P1001')
    return NextResponse.json(
      { error: isConnectionError ? 'Database non raggiungibile. Riprova tra qualche secondo.' : message },
      { status: isConnectionError ? 503 : 500 },
    )
  }
}
