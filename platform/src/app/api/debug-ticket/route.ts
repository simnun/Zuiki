import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSignedUrl } from '@/lib/storage'

// Temporary debug - DELETE after fixing
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'need id' })

  try {
    const attachments = await prisma.ticketAttachment.findMany({
      where: { ticketId: id },
    })

    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId: id },
      include: { attachments: true },
    })

    return NextResponse.json({
      rawAttachments: attachments,
      messagesWithAttachments: messages.map(m => ({
        id: m.id,
        message: m.message.slice(0, 50),
        attachmentCount: (m as any).attachments?.length ?? 'NO_FIELD',
        attachments: (m as any).attachments,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.split('\n').slice(0, 5) })
  }
}

// Test upload directly
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const ticketId = formData.get('ticketId') as string
    const messageId = formData.get('messageId') as string | null
    const files = formData.getAll('photos') as File[]

    const results: any[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      results.push({
        name: file.name,
        type: file.type,
        size: file.size,
      })

      // Try creating attachment without actual Supabase upload
      const att = await prisma.ticketAttachment.create({
        data: {
          ticketId,
          messageId,
          storageKey: `test/debug_${Date.now()}_${i}.jpg`,
          fileName: file.name,
          mimeType: file.type,
        },
      })
      results.push({ dbRecord: att })
    }

    return NextResponse.json({ filesReceived: files.length, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
