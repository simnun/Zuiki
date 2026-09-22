import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { authorize } from '@/lib/auth-helpers'

export async function GET() {
  try {
    await authorize(['super_admin'])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const companies = await withRetry(() => prisma.company.findMany({
      include: {
        _count: { select: { users: true, shootingSessions: true } },
      },
      orderBy: { name: 'asc' },
    }))
    // An empty list means the DB really has no companies — report that
    // honestly instead of inventing one.
    return NextResponse.json(companies)
  } catch (e: unknown) {
    // Never substitute demo data for a real outage: a hardcoded "Provoloni SPA"
    // made a dead database look like ordinary (wrong) content for days.
    const message = e instanceof Error ? e.message : 'Errore sconosciuto'
    console.error('[API] Companies GET error:', message)
    return NextResponse.json(
      { error: 'Database non raggiungibile. Riprova tra qualche secondo.', detail: message.slice(0, 300) },
      { status: 503 },
    )
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
