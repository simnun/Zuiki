import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

const clients: Record<string, Anthropic> = {}

function getClient(apiKey: string): Anthropic {
  if (!clients[apiKey]) {
    clients[apiKey] = new Anthropic({ apiKey })
  }
  return clients[apiKey]
}

async function resolveApiKey(companyId: string | null): Promise<string | null> {
  // 1. Try env var first
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  // 2. Try company DB record
  if (companyId) {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { apiKey: true },
      })
      if (company?.apiKey) return company.apiKey
    } catch { /* DB unreachable */ }
  }
  return null
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, max_tokens } = await req.json()

  const apiKey = await resolveApiKey(user.companyId || null)
  if (!apiKey) {
    return NextResponse.json({ error: 'API key non configurata. Vai in Impostazioni > API Key per inserirla.' }, { status: 500 })
  }

  try {
    const anthropic = getClient(apiKey)
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 4096,
      messages: [{ role: 'user', content }],
    })

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('')

    return NextResponse.json({ text, content: response.content })
  } catch (e: any) {
    const status = e?.status || 500
    const message = e?.message || 'AI call failed'
    return NextResponse.json({ error: message }, { status })
  }
}
