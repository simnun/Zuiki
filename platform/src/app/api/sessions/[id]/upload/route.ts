import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import { uploadFile } from '@/lib/storage'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Verify session ownership
  const session = await prisma.shootingSession.findUnique({ where: { id }, select: { companyId: true } })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.companyId !== user.companyId && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const itemId = formData.get('itemId') as string
    const files = formData.getAll('photos') as File[]

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const uploaded = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.name.split('.').pop() || 'jpg'
      const storagePath = `sessions/${id}/items/${itemId}/${Date.now()}_${i}.${ext}`

      const path = await uploadFile('catalog-photos', storagePath, buffer, file.type)

      const photo = await prisma.itemPhoto.create({
        data: {
          itemId,
          storageKey: path,
          originalName: file.name,
          sortOrder: i,
          mimeType: file.type,
          sizeBytes: buffer.length,
        },
      })

      uploaded.push(photo)
    }

    return NextResponse.json(uploaded, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
