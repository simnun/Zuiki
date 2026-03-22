import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureUserExists } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureUserExists(user)
    const { firstName, lastName, phone } = await req.json()

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
      },
      select: { id: true, firstName: true, lastName: true, phone: true },
    })

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
