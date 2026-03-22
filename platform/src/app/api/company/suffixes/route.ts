import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma, ensureCompanyExists } from '@/lib/db'

// GET — retrieve all suffix mappings as Record<suffixCode, articleType>
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user', 'super_admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({})

  try {
    const mappings = await prisma.suffixMapping.findMany({
      where: { companyId: user.companyId },
    })
    const result: Record<string, string> = {}
    for (const m of mappings) {
      result[m.suffixCode] = m.articleType
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({})
  }
}

// PUT — bulk upsert suffix mappings from Record<suffixCode, articleType>
export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user', 'super_admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const data = await req.json()
  if (!data || typeof data !== 'object') return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  try {
    await ensureCompanyExists(user.companyId)
    const entries = Object.entries(data) as [string, string][]
    for (const [suffixCode, articleType] of entries) {
      if (!suffixCode || !articleType) continue
      await prisma.suffixMapping.upsert({
        where: { companyId_suffixCode: { companyId: user.companyId, suffixCode } },
        update: { articleType },
        create: { companyId: user.companyId, suffixCode, articleType },
      })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
