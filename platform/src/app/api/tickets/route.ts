import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureCompanyExists } from '@/lib/db'
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
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { firstName: true, lastName: true, role: true } } },
        },
      },
    })

    const enriched = tickets.map(t => ({
      ...t,
      lastMessage: t.messages[0] || null,
      messages: undefined,
    }))

    return NextResponse.json(enriched)
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
    await ensureCompanyExists(user.companyId)

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
