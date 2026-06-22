import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  migrationRan: boolean
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  // max:1 for serverless — pgbouncer manages the real pool
  // No ssl override — let pg use default SSL (Supabase requires SSL)
  const adapter = new PrismaPg({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10000,
  } as any)
  return new PrismaClient({ adapter })
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient()
    }
    return (globalForPrisma.prisma as any)[prop]
  },
})

/**
 * Retry a database operation with exponential backoff.
 * Useful for transient connection failures on serverless.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 500,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err
      const msg = err instanceof Error ? err.message : ''
      // Only retry on connection/timeout errors, not on validation/constraint errors
      const isRetryable =
        msg.includes('connect') ||
        msg.includes('timeout') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('Connection terminated') ||
        msg.includes('P1001') ||
        msg.includes('P1002') ||
        msg.includes('socket')
      if (!isRetryable || attempt === maxRetries) throw lastError
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)))
    }
  }
  throw lastError
}

/**
 * Applies pending schema changes directly via SQL.
 * Uses IF NOT EXISTS so it's safe to call multiple times.
 * Non-blocking: fails silently during build or if DB is unreachable.
 */
let migrationPromise: Promise<void> | null = null

export async function ensureSchema() {
  if (globalForPrisma.migrationRan) return
  if (migrationPromise) return migrationPromise

  migrationPromise = (async () => {
    try {
      // Race with a 5s timeout so we never block the build
      await Promise.race([
        (async () => {
          const statements = [
            // Migration: 20260321000000_add_company_billing_apikey
            `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "apiKey" TEXT`,
            `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "vatNumber" TEXT`,
            `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "billingEmail" TEXT`,
            `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT`,
            `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "pricingPlan" TEXT DEFAULT 'base'`,
            `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "walletCredits" DECIMAL(10,2) NOT NULL DEFAULT 0`,
            `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "usedCredits" DECIMAL(10,2) NOT NULL DEFAULT 0`,
            `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "creditRenewalDate" TIMESTAMP(3)`,
            // Migration: 20260322000000_add_ticket_features_and_notifications
            `ALTER TABLE "ticket_messages" ADD COLUMN IF NOT EXISTS "replyToId" TEXT`,
            `ALTER TABLE "ticket_attachments" ADD COLUMN IF NOT EXISTS "messageId" TEXT`,
            `ALTER TABLE "ticket_attachments" ADD COLUMN IF NOT EXISTS "mimeType" TEXT`,
            // Migration: 20260323000000_add_photos_expires_at
            `ALTER TABLE "shooting_sessions" ADD COLUMN IF NOT EXISTS "photosExpiresAt" TIMESTAMP(3)`,
            // Migration: 20260327000000_add_bra_shoe_sizes
            `ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "sizeBra" TEXT`,
            `ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "sizeShoe" TEXT`,
          ]
          for (const sql of statements) {
            try { await prisma.$executeRawUnsafe(sql) } catch { /* column may exist */ }
          }
          globalForPrisma.migrationRan = true
          console.log('[DB] Schema migration applied successfully')
        })(),
        new Promise<void>((resolve) => setTimeout(() => {
          console.log('[DB] Schema migration skipped (timeout)')
          resolve()
        }, 10000)),
      ])
    } catch {
      // DB unreachable — skip silently, will retry on next request
      migrationPromise = null
    }
  })()

  return migrationPromise
}

/**
 * Ensures a company exists in the DB before creating related records.
 */
export async function ensureCompanyExists(companyId: string) {
  await ensureSchema()
  await prisma.company.upsert({
    where: { id: companyId },
    update: {},
    create: { id: companyId, name: 'Azienda', slug: companyId },
  })
}

/**
 * Ensures a fallback user exists in the DB before updating their record.
 * Creates the user (and their company if needed) when they only exist in fallback auth.
 */
export async function ensureUserExists(user: {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  companyId: string | null
}) {
  if (user.companyId) {
    await ensureCompanyExists(user.companyId)
  }
  await prisma.user.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as any,
      companyId: user.companyId,
      passwordHash: '',
    },
  })
}
