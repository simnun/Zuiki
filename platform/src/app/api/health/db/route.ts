import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Diagnostics for the database connection.
 *
 * Every list endpoint in the app silently falls back to hardcoded demo data
 * when the DB is unreachable, which makes an outage look like normal (but
 * wrong) content. This endpoint never falls back: it reports exactly what the
 * database does, so an outage can be told apart from an empty database.
 *
 * super_admin only. Connection secrets are never returned — only whether the
 * env var is set, plus host/port/database parsed from the URL.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const raw = process.env.DATABASE_URL || ''
  const connection: Record<string, unknown> = {
    databaseUrlFromEnv: Boolean(process.env.DATABASE_URL),
  }
  try {
    // Never expose user/password.
    const u = new URL(raw)
    connection.host = u.hostname
    connection.port = u.port
    connection.database = u.pathname.replace(/^\//, '')
    connection.usesPgbouncerPort = u.port === '6543'
  } catch {
    connection.parseError = 'DATABASE_URL non interpretabile come URL'
  }

  const checks: Array<Record<string, unknown>> = []

  const run = async (name: string, fn: () => Promise<unknown>) => {
    const t0 = Date.now()
    try {
      const value = await fn()
      checks.push({ name, ok: true, ms: Date.now() - t0, value })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      checks.push({
        name,
        ok: false,
        ms: Date.now() - t0,
        error: message.slice(0, 500),
        code: (err as { code?: string })?.code ?? null,
      })
    }
  }

  await run('SELECT 1', async () => {
    const r = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>('SELECT 1 as ok')
    return r?.[0] ?? null
  })
  await run('count companies', () => prisma.company.count())
  await run('count users', () => prisma.user.count())
  await run('count models', () => prisma.model.count())
  await run('count sessions', () => prisma.shootingSession.count())
  await run('list companies', async () =>
    (await prisma.company.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } })),
  )

  const reachable = checks.some(c => c.ok)
  const allOk = checks.every(c => c.ok)

  return NextResponse.json({
    reachable,
    verdict: !reachable
      ? 'DATABASE NON RAGGIUNGIBILE — le pagine mostrano i dati finti di ripiego'
      : allOk
        ? 'Database raggiungibile: i conteggi qui sotto sono i dati reali'
        : 'Database raggiungibile ma alcune query falliscono (vedi errori)',
    connection,
    checks,
  })
}
