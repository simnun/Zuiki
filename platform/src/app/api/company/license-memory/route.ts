import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma, ensureCompanyExists } from '@/lib/db'

// GET — retrieve all license memory as Record<descriptionKey, licenseValue>
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user', 'super_admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({})

  try {
    const entries = await prisma.licenseMemory.findMany({
      where: { companyId: user.companyId },
    })
    const result: Record<string, string> = {}
    for (const e of entries) {
      result[e.descriptionKey] = e.licenseValue
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({})
  }
}

// PUT — upsert a license memory entry { key, value }
export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user', 'super_admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { key, value } = await req.json()
  if (!key || !value) return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })

  try {
    await ensureCompanyExists(user.companyId)
    await prisma.licenseMemory.upsert({
      where: {
        companyId_descriptionKey: { companyId: user.companyId, descriptionKey: key },
      },
      update: { licenseValue: value },
      create: { companyId: user.companyId, descriptionKey: key, licenseValue: value },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
