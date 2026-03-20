import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authorize } from '@/lib/auth-helpers'

export async function GET() {
  await authorize(['super_admin'])

  const companies = await prisma.company.findMany({
    include: {
      _count: { select: { users: true, shootingSessions: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(companies)
}

export async function POST(req: NextRequest) {
  await authorize(['super_admin'])

  const body = await req.json()

  const company = await prisma.company.create({
    data: {
      name: body.name,
      slug: body.slug,
      logoUrl: body.logoUrl,
    },
  })

  return NextResponse.json(company, { status: 201 })
}
