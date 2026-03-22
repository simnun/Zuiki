import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

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
 * Ensures a company exists in the DB before creating related records.
 * Handles fallback auth where companyId may reference a non-existent company.
 */
export async function ensureCompanyExists(companyId: string) {
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
