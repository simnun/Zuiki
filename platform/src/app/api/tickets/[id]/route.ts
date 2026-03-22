import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureUserExists } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

// Full include with new fields (replyTo, message attachments)
const FULL_INCLUDE = {
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

// Fallback include (works before migration)
const BASIC_INCLUDE = {
  messages: {
    include: { sender: { select: { firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  attachments: true,
  createdBy: { select: { firstName: true, lastName: true } },
  company: { select: { name: true } },
}

async function getTicket(id: string) {
  try {
    return await prisma.supportTicket.findUnique({ where: { id }, include: FULL_INCLUDE })
  } catch {
    // Fallback if migration not yet applied
    const ticket = await prisma.supportTicket.findUnique({ where: { id }, include: BASIC_INCLUDE })
    if (!ticket) return null
    // Normalize messages to have empty attachments and null replyTo
    return {
      ...ticket,
      messages: ticket.messages.map((m: any) => ({
        ...m,
        attachments: m.attachments || [],
        replyTo: m.replyTo || null,
      })),
    }
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ticket = await getTicket(id)

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
    try {
      const msg = await prisma.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: user.id,
          message: body.message,
          replyToId: body.replyToId || null,
        },
      })
      newMessageId = msg.id
    } catch {
      // Fallback without replyToId
      const msg = await prisma.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: user.id,
          message: body.message,
        },
      })
      newMessageId = msg.id
    }

    // Create notifications (non-blocking, ignore errors if table doesn't exist yet)
    try {
      const ticket = await prisma.supportTicket.findUnique({ where: { id } })
      if (ticket) {
        if (user.role === 'super_admin') {
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
    } catch {
      // Notifications table may not exist yet - ignore
    }
  }

  // Update status if provided
  if (body.status) {
    await prisma.supportTicket.update({
      where: { id },
      data: { status: body.status },
    })

    if (body.status === 'resolved') {
      try {
        const ticket = await prisma.supportTicket.findUnique({ where: { id } })
        if (ticket) {
          await prisma.notification.create({
            data: {
              userId: ticket.createdById,
              type: 'ticket_resolved',
              title: 'Ticket risolto',
              message: 'Il tuo ticket è stato contrassegnato come risolto',
              link: `/support/${id}`,
            },
          })
        }
      } catch {
        // Ignore if notifications table doesn't exist
      }
    }
  }

  const ticket = await getTicket(id)
  return NextResponse.json({ ...ticket, newMessageId })
}
