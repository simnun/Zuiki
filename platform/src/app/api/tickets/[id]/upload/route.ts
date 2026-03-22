import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: ticketId } = await params

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  if (user.role !== 'super_admin' && ticket.companyId !== user.companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const messageId = formData.get('messageId') as string | null
    const files = formData.getAll('photos') as File[]

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const attachments = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Tipo file non supportato: ${file.type}` }, { status: 400 })
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File troppo grande (max 5MB)' }, { status: 400 })
      }

      // Convert to base64 data URL (same approach as ModelFacePhoto)
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const dataUrl = `data:${file.type};base64,${base64}`

      const attachment = await prisma.ticketAttachment.create({
        data: {
          ticketId,
          messageId,
          // Store the data URL in linkUrl field (already exists in schema)
          linkUrl: dataUrl,
          fileName: file.name,
          mimeType: file.type,
        },
      })

      attachments.push(attachment)
    }

    return NextResponse.json(attachments, { status: 201 })
  } catch (e: any) {
    console.error('[API] Ticket upload error:', e)
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 })
  }
}
