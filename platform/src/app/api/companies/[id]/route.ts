import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authorize } from '@/lib/auth-helpers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await authorize(['super_admin'])

  const { id } = await params

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true } },
      _count: { select: { shootingSessions: true } },
    },
  })

  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(company)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await authorize(['super_admin'])

  const { id } = await params
  const body = await req.json()

  const company = await prisma.company.update({
    where: { id },
    data: { name: body.name, slug: body.slug, logoUrl: body.logoUrl, isActive: body.isActive },
  })

  return NextResponse.json(company)
}
