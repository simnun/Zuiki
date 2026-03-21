import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  const hash = (pw: string) => bcrypt.hashSync(pw, 10)

  // Company: Provoloni SPA (client)
  const provoloni = await prisma.company.upsert({
    where: { slug: 'provoloni-spa' },
    update: {},
    create: {
      id: 'company-provoloni-001',
      name: 'Provoloni SPA',
      slug: 'provoloni-spa',
      pricingPlan: 'base',
      walletCredits: 100,
      usedCredits: 0,
    },
  })
  console.log('Company:', provoloni.name)

  // Super admin (platform owner, no company)
  await prisma.user.upsert({
    where: { email: 'admin@zuiki.it' },
    update: { passwordHash: hash('S99'), role: 'super_admin' },
    create: {
      id: 'user-admin-001',
      email: 'admin@zuiki.it',
      passwordHash: hash('S99'),
      firstName: 'Admin',
      lastName: 'Zuiki',
      role: 'super_admin',
      companyId: null,
    },
  })
  console.log('User: admin@zuiki.it (super_admin)')

  // Owner
  await prisma.user.upsert({
    where: { email: 'owner@provoloni.it' },
    update: { passwordHash: hash('1'), role: 'owner' },
    create: {
      email: 'owner@provoloni.it',
      passwordHash: hash('1'),
      firstName: 'Proprietario',
      lastName: 'Provoloni',
      role: 'owner',
      companyId: provoloni.id,
    },
  })
  console.log('User: owner@provoloni.it (owner)')

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@provoloni.it' },
    update: { passwordHash: hash('1'), role: 'admin' },
    create: {
      email: 'admin@provoloni.it',
      passwordHash: hash('1'),
      firstName: 'Amministrativo',
      lastName: 'Provoloni',
      role: 'admin',
      companyId: provoloni.id,
    },
  })
  console.log('User: admin@provoloni.it (admin)')

  // User
  await prisma.user.upsert({
    where: { email: 'user@provoloni.it' },
    update: { passwordHash: hash('1'), role: 'user' },
    create: {
      email: 'user@provoloni.it',
      passwordHash: hash('1'),
      firstName: 'Utente',
      lastName: 'Provoloni',
      role: 'user',
      companyId: provoloni.id,
    },
  })
  console.log('User: user@provoloni.it (user)')

  console.log('\nSeed completed!')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
