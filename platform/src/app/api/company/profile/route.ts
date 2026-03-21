import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

const FALLBACK_PROFILES: Record<string, any> = {
  'company-provoloni-001': {
    id: 'company-provoloni-001', name: 'Provoloni SPA', slug: 'provoloni-spa', logoUrl: null,
    vatNumber: null, billingEmail: null, billingAddress: null,
    pricingPlan: 'base', walletCredits: 100, usedCredits: 0, creditRenewalDate: null,
  },
}

// GET — company profile
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  try {
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        id: true, name: true, slug: true, logoUrl: true,
        vatNumber: true, billingEmail: true, billingAddress: true,
        pricingPlan: true, walletCredits: true, usedCredits: true, creditRenewalDate: true,
      },
    })
    if (company) return NextResponse.json(company)
    // Not found in DB — use fallback
    return NextResponse.json(FALLBACK_PROFILES[user.companyId] || { error: 'Company not found' })
  } catch {
    return NextResponse.json(FALLBACK_PROFILES[user.companyId] || { error: 'DB unreachable' })
  }
}

// PATCH — update company billing info
export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const body = await req.json()
  const allowed = ['name', 'vatNumber', 'billingEmail', 'billingAddress']
  const data: any = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  try {
    await prisma.company.update({ where: { id: user.companyId }, data })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'DB unreachable, changes not saved' }, { status: 503 })
  }
}
