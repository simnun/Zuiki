import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import { uploadFile, deleteFile } from '@/lib/storage'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const formData = await req.formData()
  const files = formData.getAll('photos') as File[]

  if (!files.length) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const uploaded = []

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() || 'jpg'
    const storagePath = `models/${id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

    const path = await uploadFile('catalog-photos', storagePath, buffer, file.type)

    const photo = await prisma.modelFacePhoto.create({
      data: {
        modelId: id,
        photoUrl: path,
      },
    })

    uploaded.push(photo)
  }

  return NextResponse.json(uploaded, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const photoId = req.nextUrl.searchParams.get('photoId')
  if (!photoId) return NextResponse.json({ error: 'photoId required' }, { status: 400 })

  const photo = await prisma.modelFacePhoto.findUnique({ where: { id: photoId } })
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await deleteFile('catalog-photos', photo.photoUrl)
  } catch {
    // File might not exist in storage, continue with DB deletion
  }

  await prisma.modelFacePhoto.delete({ where: { id: photoId } })
  return NextResponse.json({ success: true })
}
