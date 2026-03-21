import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where = user.role === 'super_admin'
    ? {}
    : user.companyId
      ? { companyId: user.companyId }
      : { createdById: user.id }

  try {
    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { messages: true } },
      },
    })
    return NextResponse.json(tickets)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const body = await req.json()

  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        companyId: user.companyId,
        createdById: user.id,
        subject: body.subject,
        description: body.description,
      },
    })
    return NextResponse.json(ticket, { status: 201 })
  } catch (e: any) {
    console.error('[API] Ticket create error:', e)
    return NextResponse.json({ error: e.message || 'DB error' }, { status: 500 })
  }
}
