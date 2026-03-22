import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureUserExists } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

const TICKET_INCLUDE = {
  messages: {
    include: {
      sender: { select: { firstName: true, lastName: true, role: true } },
      replyTo: {
        include: { sender: { select: { firstName: true, lastName: true, role: true } } },
      },
      attachments: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  attachments: { where: { messageId: null } },
  createdBy: { select: { firstName: true, lastName: true } },
  company: { select: { name: true } },
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: TICKET_INCLUDE,
  })

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(ticket)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  await ensureUserExists(user)

  let newMessageId: string | null = null

  // Add message if provided
  if (body.message) {
    const msg = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: user.id,
        message: body.message,
        replyToId: body.replyToId || null,
      },
    })
    newMessageId = msg.id

    // Create notification for the other party
    const ticket = await prisma.supportTicket.findUnique({ where: { id } })
    if (ticket) {
      if (user.role === 'super_admin') {
        // Admin replied -> notify ticket creator
        await prisma.notification.create({
          data: {
            userId: ticket.createdById,
            type: 'ticket_reply',
            title: 'Nuova risposta dal supporto',
            message: body.message.slice(0, 100),
            link: `/support/${id}`,
          },
        })
      } else {
        // Client replied -> notify all super admins
        const admins = await prisma.user.findMany({ where: { role: 'super_admin' } })
        await prisma.notification.createMany({
          data: admins.map(a => ({
            userId: a.id,
            type: 'ticket_reply' as const,
            title: `Risposta da ${user.firstName} ${user.lastName}`,
            message: body.message.slice(0, 100),
            link: `/admin/tickets/${id}`,
          })),
        })
      }
    }
  }

  // Update status if provided
  if (body.status) {
    await prisma.supportTicket.update({
      where: { id },
      data: { status: body.status },
    })

    // Notify ticket creator on resolve
    if (body.status === 'resolved') {
      const ticket = await prisma.supportTicket.findUnique({ where: { id } })
      if (ticket) {
        await prisma.notification.create({
          data: {
            userId: ticket.createdById,
            type: 'ticket_resolved',
            title: 'Ticket risolto',
            message: `Il tuo ticket è stato contrassegnato come risolto`,
            link: `/support/${id}`,
          },
        })
      }
    }
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: TICKET_INCLUDE,
  })

  return NextResponse.json({ ...ticket, newMessageId })
}
