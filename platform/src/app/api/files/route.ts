import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { getSignedUrl, deleteFile } from '@/lib/storage'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bucket = req.nextUrl.searchParams.get('bucket') || 'catalog-photos'
  const path = req.nextUrl.searchParams.get('path')
  const expiresIn = parseInt(req.nextUrl.searchParams.get('expiresIn') || '3600')

  if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 })

  const url = await getSignedUrl(bucket, path, expiresIn)
  return NextResponse.json({ url })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bucket = req.nextUrl.searchParams.get('bucket') || 'catalog-photos'
  const path = req.nextUrl.searchParams.get('path')

  if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 })

  await deleteFile(bucket, path)
  return NextResponse.json({ success: true })
}
