import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

function buildCorrMap(correlations: Array<{ items: Array<{ item: { sku: string } }>; outfitName: string | null }>) {
  const map: Record<string, string> = {}
  for (const corr of correlations) {
    const name = corr.outfitName || ''
    for (const ci of corr.items) map[ci.item.sku] = name
  }
  return map
}

function escCsv(v: unknown): string {
  return '"' + String(v ?? '').replace(/"/g, '""') + '"'
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'user', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id, type } = await params

    const session = await prisma.shootingSession.findUnique({
      where: { id },
      include: {
        catalogItems: {
          where: { status: 'done' },
          include: { photos: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sku: 'asc' },
        },
        correlations: { include: { items: { include: { item: true } } } },
      },
    })

    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (session.companyId !== user.companyId && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const corrMap = buildCorrMap(session.correlations as any)

    // Build enriched rows combining original Excel data (_excel) with AI fields
    const rows = session.catalogItems.map((item) => {
      const ai = (item.aiResponse ?? {}) as Record<string, any>
      const ex = (ai._excel ?? {}) as Record<string, string>

      const sku = item.sku
      const rewriteUrl = [sku, item.productName || '', item.altImage || '']
        .filter(Boolean).join('_').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/, '').slice(0, 100)

      return {
        // Original Excel columns (from saved _excel data, or DB fields as fallback)
        sku,
        colori:          ex.colori        || item.color        || '',
        taglie:          ex.taglie        || '',
        // AI-filled columns
        productName:     item.productName || '',
        shortDesc:       item.shortDesc   || '',
        longDesc:        item.longDesc    || '',
        isActive:        '1',
        metaTitle:       item.metaTitle   || '',
        metaDesc:        item.metaDesc    || '',
        metaKeywords:    item.metaKeywords || '',
        rewriteUrl,
        seoTags:         item.seoTags     || '',
        altImage:        item.altImage    || '',
        correlati:       corrMap[sku]     || '',
        // More original Excel columns
        anno:            ex.anno          || session.year       || '',
        stagione:        ex.stagione      || session.season     || '',
        tipoArticolo:    ex.tipoArticolo  || item.productType  || '',
        brand:           ex.brand         || session.brand      || '',
        caratteristica:  ex.caratteristica || '',
        composizione:    ex.composizione  || item.composition  || '',
        // Extra AI metadata
        licenza:         item.license     || '',
        modellaRiconosciuta: item.recognizedModel || '',
      }
    })

    if (type === 'csv') {
      const headers = Object.keys(rows[0] ?? {})
      const csvContent = '﻿' + [
        headers.map(escCsv).join(';'),
        ...rows.map(row => headers.map(h => escCsv((row as Record<string, string>)[h])).join(';')),
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="catalogo_${id}.csv"`,
        },
      })
    }

    // For excel: return enriched rows as JSON — client generates .xlsx
    return NextResponse.json({ rows, sessionId: id })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
