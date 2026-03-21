import { NextResponse } from 'next/server'
import { authorize } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

// GET — list users for a company (super_admin only)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await authorize(['super_admin'])
  const { id } = await params

  const users = await prisma.user.findMany({
    where: { companyId: id },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, isActive: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(users)
}

// POST — create user for a company (super_admin only)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await authorize(['super_admin'])
  const { id } = await params
  const { email, password, firstName, lastName, role } = await req.json()

  if (!email || !password || !firstName || !lastName || !role) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (!['owner', 'admin', 'user'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const newUser = await prisma.user.create({
    data: {
      email, passwordHash, firstName, lastName, role,
      companyId: id,
    },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, isActive: true, createdAt: true,
    },
  })

  return NextResponse.json(newUser, { status: 201 })
}
