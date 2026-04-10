import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const maxDuration = 60

// POST — Save all catalog items + correlations and mark session as completed
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let session
  try {
    session = await withRetry(() => prisma.shootingSession.findUnique({ where: { id }, select: { companyId: true } }))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown'
    console.error('[Complete] DB error finding session:', msg)
    return NextResponse.json({ error: 'Database non raggiungibile. Riprova.' }, { status: 503 })
  }

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.companyId !== user.companyId && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { items, correlations } = body as {
    items: Array<{
      sku: string; productName: string; productType: string; suffix: string;
      color: string; composition: string; shortDesc: string; longDesc: string;
      seoTags: string; metaTitle: string; metaDesc: string; metaKeywords: string;
      altImage: string; aiResponse: any; license: string; recognizedModel: string;
      status: string; photoDataUrls?: string[];
    }>;
    correlations: Array<{ outfit_name: string; skus: string[]; motivo: string }>;
  }

  try {
    const result = await withRetry(() => prisma.$transaction(async (tx) => {
      // Delete existing items & correlations (idempotent re-save)
      await tx.catalogItem.deleteMany({ where: { sessionId: id } })
      await tx.correlation.deleteMany({ where: { sessionId: id } })

      // Create all catalog items
      const createdItems: Array<{ id: string; sku: string }> = []
      let doneCount = 0
      let failCount = 0

      for (const it of items) {
        const status = it.status === 'done' ? 'done' : it.status === 'error' ? 'error' : 'pending'
        if (status === 'done') doneCount++
        if (status === 'error') failCount++

        const item = await tx.catalogItem.create({
          data: {
            sessionId: id,
            sku: it.sku,
            productName: it.productName || null,
            productType: it.productType || null,
            suffix: it.suffix || null,
            color: it.color || null,
            composition: it.composition || null,
            shortDesc: it.shortDesc || null,
            longDesc: it.longDesc || null,
            seoTags: it.seoTags || null,
            metaTitle: it.metaTitle || null,
            metaDesc: it.metaDesc || null,
            metaKeywords: it.metaKeywords || null,
            altImage: it.altImage || null,
            aiResponse: it.aiResponse || undefined,
            license: it.license || null,
            recognizedModel: it.recognizedModel || null,
            status: status as any,
          },
        })

        // Store photo data URLs as ItemPhoto records
        if (it.photoDataUrls?.length) {
          for (let pi = 0; pi < it.photoDataUrls.length; pi++) {
            await tx.itemPhoto.create({
              data: {
                itemId: item.id,
                storageKey: it.photoDataUrls[pi],
                sortOrder: pi,
              },
            })
          }
        }

        createdItems.push({ id: item.id, sku: it.sku })
      }

      // Create correlations
      const skuToItemId: Record<string, string> = {}
      createdItems.forEach(ci => { skuToItemId[ci.sku] = ci.id })

      let corrCount = 0
      for (const corr of (correlations || [])) {
        const validSkus = (corr.skus || []).filter(s => skuToItemId[s])
        if (validSkus.length < 2) continue

        await tx.correlation.create({
          data: {
            sessionId: id,
            outfitName: corr.outfit_name || null,
            reason: corr.motivo || null,
            items: {
              create: validSkus.map(sku => ({ itemId: skuToItemId[sku] })),
            },
          },
        })
        corrCount++
      }

      // Update session status
      const photosExpiresAt = new Date()
      photosExpiresAt.setDate(photosExpiresAt.getDate() + 7)

      await tx.shootingSession.update({
        where: { id },
        data: {
          status: 'completed',
          totalItems: items.length,
          processedItems: doneCount,
          failedItems: failCount,
          completedAt: new Date(),
          photosExpiresAt,
        },
      })

      return { itemsCreated: createdItems.length, correlationsCreated: corrCount }
    }, { timeout: 50000 }), 2, 1000)

    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Complete] Error saving session data:', message)
    const isConnectionError = message.includes('connect') || message.includes('timeout') || message.includes('ECONNREFUSED') || message.includes('P1001')
    return NextResponse.json(
      { error: isConnectionError ? 'Database non raggiungibile. Riprova tra qualche secondo.' : message },
      { status: isConnectionError ? 503 : 500 },
    )
  }
}
