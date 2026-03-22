import { NextRequest, NextResponse } from 'next/server'
import { authorize } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

// PATCH — toggle active status (super_admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  try {
    await authorize(['super_admin'])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, userId } = await params
    const body = await req.json()

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target || target.companyId !== id) {
      return NextResponse.json({ error: 'User not found in this company' }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: body.isActive },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    })

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE — remove user (super_admin only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  try {
    await authorize(['super_admin'])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, userId } = await params

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target || target.companyId !== id) {
      return NextResponse.json({ error: 'User not found in this company' }, { status: 404 })
    }

    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
