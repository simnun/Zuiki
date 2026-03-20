import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      messages: {
        include: { sender: { select: { firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      attachments: true,
      createdBy: { select: { firstName: true, lastName: true } },
    },
  })

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(ticket)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Add message if provided
  if (body.message) {
    await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: user.id,
        message: body.message,
      },
    })
  }

  // Update status if provided
  if (body.status) {
    await prisma.supportTicket.update({
      where: { id },
      data: { status: body.status },
    })
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      messages: {
        include: { sender: { select: { firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return NextResponse.json(ticket)
}
