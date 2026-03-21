import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

// In-memory fallback store for API keys when DB is unreachable
const memoryApiKeys: Record<string, string> = {}

// GET — retrieve company API key
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  try {
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { apiKey: true },
    })
    return NextResponse.json({ apiKey: company?.apiKey || '' })
  } catch {
    return NextResponse.json({ apiKey: memoryApiKeys[user.companyId] || '' })
  }
}

// PUT — update company API key
export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { apiKey } = await req.json()

  try {
    await prisma.company.update({
      where: { id: user.companyId },
      data: { apiKey: apiKey || null },
    })
  } catch {
    // DB unreachable — store in memory as fallback
    if (apiKey) {
      memoryApiKeys[user.companyId] = apiKey
    } else {
      delete memoryApiKeys[user.companyId]
    }
  }

  return NextResponse.json({ ok: true })
}
