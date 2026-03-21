import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  const hash = (pw: string) => bcrypt.hashSync(pw, 10)

  // ─── COMPANIES ─────────────────────────────────────
  const provoloni = await prisma.company.upsert({
    where: { slug: 'provoloni-spa' },
    update: {},
    create: {
      id: 'company-provoloni-001',
      name: 'Provoloni SPA',
      slug: 'provoloni-spa',
      pricingPlan: 'professional',
      walletCredits: 85.50,
      usedCredits: 14.50,
      vatNumber: 'IT02345678901',
      billingAddress: 'Via della Moda 42, 20121 Milano',
      billingEmail: 'fatture@provoloni.it',
      creditRenewalDate: new Date('2026-04-01'),
    },
  })
  console.log('Company:', provoloni.name)

  const fashionHouse = await prisma.company.upsert({
    where: { slug: 'fashion-house-srl' },
    update: {},
    create: {
      id: 'company-fashionhouse-001',
      name: 'Fashion House SRL',
      slug: 'fashion-house-srl',
      pricingPlan: 'base',
      walletCredits: 45.00,
      usedCredits: 5.00,
      vatNumber: 'IT09876543210',
      billingAddress: 'Corso Buenos Aires 15, 20124 Milano',
      billingEmail: 'admin@fashionhouse.it',
      creditRenewalDate: new Date('2026-05-01'),
    },
  })
  console.log('Company:', fashionHouse.name)

  // ─── USERS ──────────────────────────────────────────

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

  // Provoloni team
  const ownerProv = await prisma.user.upsert({
    where: { email: 'owner@provoloni.it' },
    update: { passwordHash: hash('1'), role: 'owner' },
    create: {
      email: 'owner@provoloni.it',
      passwordHash: hash('1'),
      firstName: 'Marco',
      lastName: 'Provoloni',
      role: 'owner',
      companyId: provoloni.id,
      phone: '+39 333 1234567',
    },
  })
  console.log('User: owner@provoloni.it (owner)')

  await prisma.user.upsert({
    where: { email: 'admin@provoloni.it' },
    update: { passwordHash: hash('1'), role: 'admin' },
    create: {
      email: 'admin@provoloni.it',
      passwordHash: hash('1'),
      firstName: 'Giulia',
      lastName: 'Provoloni',
      role: 'admin',
      companyId: provoloni.id,
      phone: '+39 333 7654321',
    },
  })
  console.log('User: admin@provoloni.it (admin)')

  const userProv = await prisma.user.upsert({
    where: { email: 'user@provoloni.it' },
    update: { passwordHash: hash('1'), role: 'user' },
    create: {
      email: 'user@provoloni.it',
      passwordHash: hash('1'),
      firstName: 'Laura',
      lastName: 'Bianchi',
      role: 'user',
      companyId: provoloni.id,
      phone: '+39 340 9876543',
    },
  })
  console.log('User: user@provoloni.it (user)')

  // Fashion House team
  const ownerFH = await prisma.user.upsert({
    where: { email: 'owner@fashionhouse.it' },
    update: { passwordHash: hash('1'), role: 'owner' },
    create: {
      email: 'owner@fashionhouse.it',
      passwordHash: hash('1'),
      firstName: 'Alessandro',
      lastName: 'Verdi',
      role: 'owner',
      companyId: fashionHouse.id,
    },
  })
  console.log('User: owner@fashionhouse.it (owner)')

  // ─── MODELS (Provoloni) ─────────────────────────────

  const modelSofia = await prisma.model.upsert({
    where: { id: 'model-sofia-001' },
    update: {},
    create: {
      id: 'model-sofia-001',
      companyId: provoloni.id,
      name: 'Sofia Rinaldi',
      heightCm: 175,
      sizeTop: '42',
      sizeBottom: '42',
    },
  })

  const modelChiara = await prisma.model.upsert({
    where: { id: 'model-chiara-001' },
    update: {},
    create: {
      id: 'model-chiara-001',
      companyId: provoloni.id,
      name: 'Chiara Moretti',
      heightCm: 178,
      sizeTop: '40',
      sizeBottom: '40',
    },
  })

  const modelElena = await prisma.model.upsert({
    where: { id: 'model-elena-001' },
    update: {},
    create: {
      id: 'model-elena-001',
      companyId: provoloni.id,
      name: 'Elena Conti',
      heightCm: 172,
      sizeTop: '44',
      sizeBottom: '44',
    },
  })
  console.log('Models: Sofia, Chiara, Elena')

  // ─── SHOOTING SESSIONS (Provoloni) ──────────────────

  const sessionPE26 = await prisma.shootingSession.upsert({
    where: { id: 'session-pe26-001' },
    update: {},
    create: {
      id: 'session-pe26-001',
      companyId: provoloni.id,
      createdById: ownerProv.id,
      brand: 'zuiki',
      season: 'Primavera/Estate',
      year: '2026',
      shootingDate: new Date('2026-02-15'),
      shootType: 'model',
      status: 'completed',
      totalItems: 12,
      processedItems: 12,
      failedItems: 0,
      completedAt: new Date('2026-02-15T18:30:00'),
    },
  })

  const sessionAI26 = await prisma.shootingSession.upsert({
    where: { id: 'session-ai26-001' },
    update: {},
    create: {
      id: 'session-ai26-001',
      companyId: provoloni.id,
      createdById: userProv.id,
      brand: 'zuiki',
      season: 'Autunno/Inverno',
      year: '2026',
      shootingDate: new Date('2026-03-10'),
      shootType: 'mixed',
      status: 'completed',
      totalItems: 8,
      processedItems: 8,
      failedItems: 1,
      completedAt: new Date('2026-03-10T16:00:00'),
    },
  })

  const sessionDraft = await prisma.shootingSession.upsert({
    where: { id: 'session-draft-001' },
    update: {},
    create: {
      id: 'session-draft-001',
      companyId: provoloni.id,
      createdById: ownerProv.id,
      brand: 'loveskin',
      season: 'Primavera/Estate',
      year: '2026',
      shootingDate: new Date('2026-03-25'),
      shootType: 'model',
      status: 'draft',
      totalItems: 0,
      processedItems: 0,
      failedItems: 0,
    },
  })
  console.log('Sessions: PE26 (completed), AI26 (completed), Draft (loveskin)')

  // Link models to sessions
  await prisma.sessionModel.upsert({
    where: { id: 'sm-pe26-sofia' },
    update: {},
    create: { id: 'sm-pe26-sofia', sessionId: sessionPE26.id, modelId: modelSofia.id },
  })
  await prisma.sessionModel.upsert({
    where: { id: 'sm-pe26-chiara' },
    update: {},
    create: { id: 'sm-pe26-chiara', sessionId: sessionPE26.id, modelId: modelChiara.id },
  })
  await prisma.sessionModel.upsert({
    where: { id: 'sm-ai26-elena' },
    update: {},
    create: { id: 'sm-ai26-elena', sessionId: sessionAI26.id, modelId: modelElena.id },
  })

  // ─── CATALOG ITEMS (PE26 session) ───────────────────

  const catalogItemsData = [
    { sku: 'ZK-TS-0101', type: 'T-shirt', suffix: 'TS', color: 'Bianco', name: 'T-shirt Oversize In Cotone', desc: 'T-shirt dal taglio oversize con scollo rotondo e maniche corte. Cuciture a vista sui bordi per un look casual e rilassato.', license: null, model: 'Sofia Rinaldi', tags: 'maglietteet-shirtdonnape26; donnape26;' },
    { sku: 'ZK-AB-0204', type: 'Abito', suffix: 'AB', color: 'Nero', name: 'Abito Lungo Plissettato', desc: 'Abito lungo in tessuto plissettato con cintura in vita. Scollo a V profondo, maniche a 3/4 con polsini elastici.', license: null, model: 'Sofia Rinaldi', tags: 'abitidonnape26; donnape26; elegante;' },
    { sku: 'ZK-PJ-0312', type: 'Jeans', suffix: 'PJ', color: 'Blu', name: 'Jeans Wide Leg A Vita Alta', desc: 'Jeans a gamba larga con vita alta e chiusura a bottone. Cinque tasche classiche, lavaggio medio.', license: null, model: 'Chiara Moretti', tags: 'jeansdonnape26; donnape26; widefitjeans;' },
    { sku: 'ZK-FE-0415', type: 'Felpa', suffix: 'FE', color: 'Rosa', name: 'Felpa Cropped Con Cappuccio Snoopy', desc: 'Felpa cropped con cappuccio e stampa Snoopy sul petto. Coulisse regolabile, polsini e orlo a costine.', license: 'Snoopy', model: 'Chiara Moretti', tags: 'felpedonnape26; donnape26; snoopy; licenza;' },
    { sku: 'ZK-GO-0503', type: 'Gonna', suffix: 'GN', color: 'Beige', name: 'Gonna Midi In Lino', desc: 'Gonna midi in misto lino con elastico in vita. Leggera e fresca, perfetta per la stagione calda.', license: null, model: 'Sofia Rinaldi', tags: 'gonnedonnape26; donnape26;' },
    { sku: 'ZK-GB-0621', type: 'Giubbino', suffix: 'GB', color: 'Verde', name: 'Giubbino Bomber Leggero', desc: 'Giubbino bomber con zip frontale e collo alla coreana. Tessuto leggero impermeabile, tasche laterali con zip.', license: null, model: 'Sofia Rinaldi', tags: 'giubbinidonnape26; donnape26;' },
    { sku: 'ZK-TO-0718', type: 'Top', suffix: 'TO', color: 'Corallo', name: 'Top A Fascia Con Ruches', desc: 'Top a fascia con dettaglio ruches sul fronte. Spalline sottili regolabili, chiusura zip posteriore invisibile.', license: null, model: 'Chiara Moretti', tags: 'topecanoттеdonnape26; donnape26;' },
    { sku: 'ZK-PA-0830', type: 'Pantaloni', suffix: 'PA', color: 'Nero', name: 'Pantaloni Palazzo In Viscosa', desc: 'Pantaloni palazzo a gamba larga in viscosa. Elastico in vita coperto, tessuto fluido e leggero.', license: null, model: 'Sofia Rinaldi', tags: 'pantalonidonnape26; donnape26;' },
    { sku: 'ZK-MA-0944', type: 'Maglia', suffix: 'MA', color: 'Lilla', name: 'Maglia A Coste Con Scollo A V', desc: 'Maglia a coste con scollo a V profondo e maniche lunghe. Tessuto morbido elasticizzato, fit aderente.', license: null, model: 'Chiara Moretti', tags: 'magliedonnape26; donnape26;' },
    { sku: 'ZK-SH-1001', type: 'Shorts', suffix: 'SH', color: 'Bianco', name: 'Shorts In Jeans Con Risvolto', desc: 'Shorts in denim con risvolto al fondo. Vita alta, cinque tasche, chiusura bottone e zip.', license: null, model: 'Sofia Rinaldi', tags: 'shortsdonnape26; donnape26;' },
    { sku: 'ZK-CD-1102', type: 'Cardigan', suffix: 'CD', color: 'Panna', name: 'Cardigan Lungo Traforato', desc: 'Cardigan lungo con lavorazione traforata e maniche a 3/4. Bottoni gioiello, orlo asimmetrico.', license: null, model: 'Chiara Moretti', tags: 'cardigandonnape26; donnape26;' },
    { sku: 'ZK-TS-1215', type: 'T-shirt', suffix: 'TS', color: 'Giallo', name: 'T-shirt Slim Fit Mickey Mouse', desc: 'T-shirt slim fit con stampa frontale Mickey Mouse vintage. Scollo rotondo, maniche corte con orlo arrotolato.', license: 'Mickey Mouse', model: 'Sofia Rinaldi', tags: 'maglietteet-shirtdonnape26; donnape26; mickeymouse; licenza;' },
  ]

  for (const item of catalogItemsData) {
    await prisma.catalogItem.upsert({
      where: { id: `item-pe26-${item.sku}` },
      update: {},
      create: {
        id: `item-pe26-${item.sku}`,
        sessionId: sessionPE26.id,
        sku: item.sku,
        productName: item.name,
        productType: item.type,
        suffix: item.suffix,
        color: item.color,
        shortDesc: item.desc,
        longDesc: `Scopri ${item.name.toLowerCase()} della collezione Primavera/Estate 2026 di Zuiki. ${item.desc} Un capo versatile e di tendenza, ideale per creare look sia casual che pi\u00f9 ricercati. Perfetto per le giornate primaverili e le serate estive, si abbina facilmente con altri capi della collezione.`,
        seoTags: item.tags,
        metaTitle: `${item.name} | Zuiki`,
        metaDesc: `Acquista ${item.name} Zuiki. ${item.desc.slice(0, 100)}`,
        metaKeywords: `zuiki, ${item.type.toLowerCase()}, donna, pe26`,
        altImage: `${item.name} colore ${item.color} indossato da modella su sfondo neutro`,
        aiResponse: {
          modello_dettaglio: item.name.replace(item.type + ' ', ''),
          dettagli_descrizione: item.desc,
          colore_madre: item.color,
          licenza: item.license,
          dubbio_licenza: false,
          categoria_seo: item.type.toLowerCase().replace(/\s/g, ''),
          modella_riconosciuta: item.model,
        },
        license: item.license,
        recognizedModel: item.model,
        status: 'done',
        processingTimeMs: 2500 + Math.floor(Math.random() * 3000),
      },
    })
  }
  console.log(`Catalog items: ${catalogItemsData.length} items for PE26`)

  // ─── SUFFIX MAPPINGS (Provoloni learned data) ───────

  const sfxMappings = [
    { code: 'TS', type: 'T-shirt' }, { code: 'AB', type: 'Abito' }, { code: 'PJ', type: 'Jeans' },
    { code: 'FE', type: 'Felpa' }, { code: 'GN', type: 'Gonna' }, { code: 'GB', type: 'Giubbino' },
    { code: 'TO', type: 'Top' }, { code: 'PA', type: 'Pantaloni' }, { code: 'MA', type: 'Maglia' },
    { code: 'SH', type: 'Shorts' }, { code: 'CD', type: 'Cardigan' },
  ]

  for (const sfx of sfxMappings) {
    await prisma.suffixMapping.upsert({
      where: { companyId_suffixCode: { companyId: provoloni.id, suffixCode: sfx.code } },
      update: {},
      create: { companyId: provoloni.id, suffixCode: sfx.code, articleType: sfx.type },
    })
  }
  console.log('Suffix mappings: 11 codes')

  // ─── LICENSE MEMORY ──────────────────────────────────

  await prisma.licenseMemory.create({
    data: { companyId: provoloni.id, descriptionKey: 'cane bianco con orecchie nere fumetto', licenseValue: 'Snoopy' },
  }).catch(() => {}) // ignore if already exists

  await prisma.licenseMemory.create({
    data: { companyId: provoloni.id, descriptionKey: 'topo con orecchie rotonde pantaloni rossi', licenseValue: 'Mickey Mouse' },
  }).catch(() => {})

  console.log('License memory: 2 entries')

  // ─── BILLING (Provoloni) ────────────────────────────

  const billingMonths = [
    { month: new Date('2026-01-01'), images: 156, aiCalls: 624, cost: 4.80, status: 'paid' as const, paidAt: new Date('2026-01-28') },
    { month: new Date('2026-02-01'), images: 243, aiCalls: 972, cost: 7.20, status: 'paid' as const, paidAt: new Date('2026-02-25') },
    { month: new Date('2026-03-01'), images: 89, aiCalls: 356, cost: 2.50, status: 'unpaid' as const, paidAt: null },
  ]

  for (const b of billingMonths) {
    await prisma.monthlyBilling.upsert({
      where: { companyId_month: { companyId: provoloni.id, month: b.month } },
      update: {},
      create: {
        companyId: provoloni.id,
        month: b.month,
        totalImages: b.images,
        totalAiCalls: b.aiCalls,
        totalCost: b.cost,
        paymentStatus: b.status,
        paidAt: b.paidAt,
      },
    })
  }
  console.log('Billing: 3 months')

  // ─── USAGE RECORDS ──────────────────────────────────

  await prisma.usageRecord.upsert({
    where: { id: 'usage-pe26-001' },
    update: {},
    create: {
      id: 'usage-pe26-001',
      companyId: provoloni.id,
      sessionId: sessionPE26.id,
      userId: ownerProv.id,
      imagesProcessed: 48,
      aiCallsMade: 192,
      processingTimeMs: BigInt(145000),
      estimatedCost: 3.60,
    },
  })

  await prisma.usageRecord.upsert({
    where: { id: 'usage-ai26-001' },
    update: {},
    create: {
      id: 'usage-ai26-001',
      companyId: provoloni.id,
      sessionId: sessionAI26.id,
      userId: userProv.id,
      imagesProcessed: 32,
      aiCallsMade: 128,
      processingTimeMs: BigInt(98000),
      estimatedCost: 2.40,
    },
  })
  console.log('Usage records: 2 sessions')

  // ─── CORRELATIONS ───────────────────────────────────

  const corr = await prisma.correlation.upsert({
    where: { id: 'corr-pe26-outfit1' },
    update: {},
    create: {
      id: 'corr-pe26-outfit1',
      sessionId: sessionPE26.id,
      outfitName: 'Look Casual Primaverile',
      reason: 'T-shirt bianca abbinata a jeans wide leg e bomber verde per un look casual e versatile.',
    },
  })

  const corrItems = ['item-pe26-ZK-TS-0101', 'item-pe26-ZK-PJ-0312', 'item-pe26-ZK-GB-0621']
  for (const itemId of corrItems) {
    await prisma.correlationItem.create({
      data: { correlationId: corr.id, itemId },
    }).catch(() => {})
  }
  console.log('Correlations: 1 outfit (3 items)')

  // ─── SUPPORT TICKETS ────────────────────────────────

  const ticket = await prisma.supportTicket.upsert({
    where: { id: 'ticket-001' },
    update: {},
    create: {
      id: 'ticket-001',
      companyId: provoloni.id,
      createdById: ownerProv.id,
      subject: 'Errore export CSV con caratteri speciali',
      description: "Quando esporto il catalogo in CSV, le lettere accentate (è, à, ù) vengono sostituite da caratteri strani. Sembra un problema di encoding UTF-8.",
      status: 'in_progress',
    },
  })

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: ownerProv.id,
      message: 'Ho provato sia con Chrome che Firefox, stesso problema su entrambi.',
    },
  }).catch(() => {})

  console.log('Support tickets: 1 ticket')

  // ─── NOTIFICATION PREFERENCES ───────────────────────

  await prisma.notificationPreference.upsert({
    where: { userId: ownerProv.id },
    update: {},
    create: {
      userId: ownerProv.id,
      emailEnabled: true,
      whatsappEnabled: false,
      notifyUserActivity: true,
      notifyMonthlyReports: true,
      notifyProcessingComplete: true,
    },
  })
  console.log('Notification preferences: owner')

  console.log('\n✓ Seed completed!')
  console.log('\nTest accounts:')
  console.log('  admin@zuiki.it    / S99  (super_admin)')
  console.log('  owner@provoloni.it / 1   (owner - Provoloni SPA)')
  console.log('  admin@provoloni.it / 1   (admin - Provoloni SPA)')
  console.log('  user@provoloni.it  / 1   (user  - Provoloni SPA)')
  console.log('  owner@fashionhouse.it / 1 (owner - Fashion House SRL)')

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
