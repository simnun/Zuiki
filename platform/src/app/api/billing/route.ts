import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where = user.role === 'super_admin'
    ? {}
    : user.companyId
      ? { companyId: user.companyId }
      : undefined

  if (!where) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const billing = await prisma.monthlyBilling.findMany({
    where,
    orderBy: { month: 'desc' },
    include: {
      company: { select: { name: true } },
    },
  })

  return NextResponse.json(billing)
}
