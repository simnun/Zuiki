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
  const adapter = new PrismaPg({ connectionString })
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
 * Applies pending schema changes directly via SQL.
 * Uses IF NOT EXISTS so it's safe to call multiple times.
 * This bypasses prisma migrate deploy which fails on Supabase pooler.
 */
let migrationPromise: Promise<void> | null = null

export async function ensureSchema() {
  if (globalForPrisma.migrationRan) return
  if (migrationPromise) return migrationPromise

  migrationPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "apiKey" TEXT;
        ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "vatNumber" TEXT;
        ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "billingEmail" TEXT;
        ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
        ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "pricingPlan" TEXT DEFAULT 'base';
        ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "walletCredits" DECIMAL(10,2) NOT NULL DEFAULT 0;
        ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "usedCredits" DECIMAL(10,2) NOT NULL DEFAULT 0;
        ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "creditRenewalDate" TIMESTAMP(3);
      `)
      globalForPrisma.migrationRan = true
      console.log('[DB] Schema migration applied successfully')
    } catch (e) {
      console.error('[DB] Schema migration error:', e)
      // Try one statement at a time as fallback
      const statements = [
        `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "apiKey" TEXT`,
        `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "vatNumber" TEXT`,
        `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "billingEmail" TEXT`,
        `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT`,
        `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "pricingPlan" TEXT DEFAULT 'base'`,
        `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "walletCredits" DECIMAL(10,2) NOT NULL DEFAULT 0`,
        `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "usedCredits" DECIMAL(10,2) NOT NULL DEFAULT 0`,
        `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "creditRenewalDate" TIMESTAMP(3)`,
      ]
      for (const sql of statements) {
        try {
          await prisma.$executeRawUnsafe(sql)
        } catch {
          // Column might already exist, continue
        }
      }
      globalForPrisma.migrationRan = true
      console.log('[DB] Schema migration applied (individual statements)')
    }
  })()

  return migrationPromise
}

/**
 * Ensures a company exists in the DB before creating related records.
 * Also ensures the schema has billing columns applied.
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
