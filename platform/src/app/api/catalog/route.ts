import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['super_admin', 'owner', 'user'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!user.companyId && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'No company' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const sessionId = searchParams.get('sessionId') || ''
  const productType = searchParams.get('productType') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')))
  const skip = (page - 1) * limit

  try {
    // Build session filter based on company ownership
    const sessionWhere = user.role === 'super_admin' ? {} : { companyId: user.companyId! }

    // Get session IDs the user has access to
    const sessions = await prisma.shootingSession.findMany({
      where: sessionWhere,
      select: { id: true, brand: true, season: true, year: true },
    })
    const sessionIds = sessions.map(s => s.id)

    if (sessionIds.length === 0) {
      return NextResponse.json({ items: [], total: 0, page, limit, sessions: [] })
    }

    // Build catalog item filter
    const where: any = {
      sessionId: sessionId ? { in: [sessionId] } : { in: sessionIds },
      status: { in: ['done', 'error', 'processing', 'pending'] },
    }

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
        { color: { contains: search, mode: 'insensitive' } },
        { license: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (productType) {
      where.productType = { contains: productType, mode: 'insensitive' }
    }

    const [items, total] = await Promise.all([
      prisma.catalogItem.findMany({
        where,
        include: {
          photos: { orderBy: { sortOrder: 'asc' }, take: 1 },
          session: { select: { brand: true, season: true, year: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.catalogItem.count({ where }),
    ])

    // Get distinct product types for filter
    const productTypes = await prisma.catalogItem.findMany({
      where: { sessionId: { in: sessionIds }, productType: { not: null } },
      distinct: ['productType'],
      select: { productType: true },
    })

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      sessions: sessions.map(s => ({ id: s.id, label: `${s.brand} ${s.season} ${s.year}` })),
      productTypes: productTypes.map(p => p.productType).filter(Boolean),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
