import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

// GET — company profile (billing info, plan, credits)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: {
      id: true, name: true, slug: true, logoUrl: true,
      vatNumber: true, billingEmail: true, billingAddress: true,
      pricingPlan: true, walletCredits: true, usedCredits: true, creditRenewalDate: true,
    },
  })

  return NextResponse.json(company)
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

  await prisma.company.update({
    where: { id: user.companyId },
    data,
  })

  return NextResponse.json({ ok: true })
}
