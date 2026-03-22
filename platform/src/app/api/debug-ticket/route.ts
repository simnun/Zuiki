import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Temporary debug - DELETE after fixing
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'need id' })

  try {
    // 1. Check raw attachments for this ticket
    const attachments = await prisma.ticketAttachment.findMany({
      where: { ticketId: id },
    })

    // 2. Check messages
    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId: id },
      include: { attachments: true },
    })

    // 3. Full query
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: {
          include: {
            sender: { select: { firstName: true, lastName: true, role: true } },
            replyTo: {
              include: { sender: { select: { firstName: true, lastName: true, role: true } } },
            },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: { where: { messageId: null } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({
      rawAttachments: attachments,
      messagesWithAttachments: messages.map(m => ({
        id: m.id,
        message: m.message.slice(0, 30),
        attachmentCount: (m as any).attachments?.length ?? 'NO_FIELD',
      })),
      ticketMessages: ticket?.messages.map(m => ({
        id: m.id,
        message: m.message.slice(0, 30),
        attachments: (m as any).attachments,
      })),
      ticketTopAttachments: ticket?.attachments,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.split('\n').slice(0, 5) })
  }
}
