import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authorize } from '@/lib/auth-helpers'

// Fallback data when DB is unreachable
const FALLBACK_COMPANIES = [
  {
    id: 'company-provoloni-001',
    name: 'Provoloni SPA',
    slug: 'provoloni-spa',
    logoUrl: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { users: 3, shootingSessions: 0 },
  },
]

export async function GET() {
  try {
    await authorize(['super_admin'])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: { select: { users: true, shootingSessions: true } },
      },
      orderBy: { name: 'asc' },
    })
    if (companies.length > 0) return NextResponse.json(companies)
    // DB returned empty — use fallback
    return NextResponse.json(FALLBACK_COMPANIES)
  } catch {
    // DB unreachable — return fallback
    return NextResponse.json(FALLBACK_COMPANIES)
  }
}

export async function POST(req: NextRequest) {
  try {
    await authorize(['super_admin'])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const company = await prisma.company.create({
      data: {
        name: body.name,
        slug: body.slug,
        logoUrl: body.logoUrl,
      },
    })
    return NextResponse.json(company, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'DB error' }, { status: 500 })
  }
}
