import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

// GET — list company users (owner only)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const users = await prisma.user.findMany({
    where: { companyId: user.companyId },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, isActive: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(users)
}

// POST — create user in company (owner only)
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { email, password, firstName, lastName, role } = await req.json()

  if (!email || !password || !firstName || !lastName || !role) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Owner can only create admin or user roles
  if (!['admin', 'user'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const newUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      companyId: user.companyId,
    },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, isActive: true, createdAt: true,
    },
  })

  return NextResponse.json(newUser, { status: 201 })
}
