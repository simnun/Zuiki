import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

// PATCH — toggle active status (owner only)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { id } = await params
  const body = await req.json()

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.companyId !== user.companyId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: body.isActive },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'DB error' }, { status: 500 })
  }
}

// DELETE — remove user from company (owner only)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { id } = await params

  // Cannot delete yourself
  if (id === user.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  // Verify user belongs to same company
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.companyId !== user.companyId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
