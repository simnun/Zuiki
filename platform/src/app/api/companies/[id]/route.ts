import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureCompanyExists, withRetry } from '@/lib/db'
import { authorize } from '@/lib/auth-helpers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authorize(['super_admin'])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const company = await withRetry(() => prisma.company.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true } },
        _count: { select: { shootingSessions: true } },
      },
    }))

    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(company)
  } catch (e: unknown) {
    // No demo-data substitution: an outage must look like an outage.
    const message = e instanceof Error ? e.message : 'Errore sconosciuto'
    console.error('[API] Company GET error:', message)
    return NextResponse.json(
      { error: 'Database non raggiungibile. Riprova tra qualche secondo.', detail: message.slice(0, 300) },
      { status: 503 },
    )
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
