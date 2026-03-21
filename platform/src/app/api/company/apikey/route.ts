import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

// GET — retrieve company API key
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { apiKey: true },
  })

  return NextResponse.json({ apiKey: company?.apiKey || '' })
}

// PUT — update company API key
export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { apiKey } = await req.json()

  await prisma.company.update({
    where: { id: user.companyId },
    data: { apiKey: apiKey || null },
  })

  return NextResponse.json({ ok: true })
}
