import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

async function verifyModelAccess(modelId: string, user: { companyId: string | null; role: string }) {
  const model = await prisma.model.findUnique({ where: { id: modelId }, select: { companyId: true } })
  if (!model) return { error: 'Model not found', status: 404 }
  if (model.companyId !== user.companyId && user.role !== 'super_admin') {
    return { error: 'Forbidden', status: 403 }
  }
  return null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const denied = await verifyModelAccess(id, user)
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

  const formData = await req.formData()
  const files = formData.getAll('photos') as File[]

  if (!files.length) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const uploaded = []

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    const photo = await prisma.modelFacePhoto.create({
      data: {
        modelId: id,
        photoUrl: dataUrl,
      },
    })

    uploaded.push(photo)
  }

  return NextResponse.json(uploaded, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const denied = await verifyModelAccess(id, user)
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

  const photoId = req.nextUrl.searchParams.get('photoId')
  if (!photoId) return NextResponse.json({ error: 'photoId required' }, { status: 400 })

  await prisma.modelFacePhoto.delete({ where: { id: photoId } })
  return NextResponse.json({ success: true })
}
