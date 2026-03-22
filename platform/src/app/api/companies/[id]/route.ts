import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureCompanyExists } from '@/lib/db'
import { authorize } from '@/lib/auth-helpers'

// Fallback company data
const FALLBACK_COMPANY = {
  id: 'company-provoloni-001',
  name: 'Provoloni SPA',
  slug: 'provoloni-spa',
  logoUrl: null,
  isActive: true,
  users: [
    { id: 'user-owner-001', email: 'owner@provoloni.it', firstName: 'Proprietario', lastName: 'Provoloni', role: 'owner', isActive: true },
    { id: 'user-admin-prov-001', email: 'admin@provoloni.it', firstName: 'Amministrativo', lastName: 'Provoloni', role: 'admin', isActive: true },
    { id: 'user-user-001', email: 'user@provoloni.it', firstName: 'Utente', lastName: 'Provoloni', role: 'user', isActive: true },
  ],
  _count: { shootingSessions: 0 },
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authorize(['super_admin'])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true } },
        _count: { select: { shootingSessions: true } },
      },
    })

    if (!company) {
      // Not found in DB — try fallback
      if (id === FALLBACK_COMPANY.id) return NextResponse.json(FALLBACK_COMPANY)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(company)
  } catch {
    // DB unreachable — return fallback if matching
    if (id === FALLBACK_COMPANY.id) return NextResponse.json(FALLBACK_COMPANY)
    return NextResponse.json({ error: 'DB unreachable' }, { status: 503 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authorize(['super_admin'])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    await ensureCompanyExists(id)
    const company = await prisma.company.update({
      where: { id },
      data: { name: body.name, slug: body.slug, logoUrl: body.logoUrl, isActive: body.isActive },
    })

    return NextResponse.json(company)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'DB error' }, { status: 500 })
  }
}
