import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

// Columns overwritten by AI (0-based indices, matching StepExport expCSV/exportExcel)
const AI_COLS = {
  productName:  4,   // E
  shortDesc:    5,   // F
  longDesc:     6,   // G
  isActive:     7,   // H
  metaTitle:    9,   // J
  metaDesc:     10,  // K
  metaKeywords: 11,  // L
  rewriteUrl:   12,  // M
  seoTags:      13,  // N
  altImage:     14,  // O
  correlati:    15,  // P
}

function buildCorrMap(correlations: Array<{ items: Array<{ item: { sku: string } }>; outfitName: string | null }>) {
  const map: Record<string, string> = {}
  for (const corr of correlations) {
    const name = corr.outfitName || ''
    for (const ci of corr.items) map[ci.item.sku] = name
  }
  return map
}

function buildRow(
  item: { sku: string; productName: string | null; shortDesc: string | null; longDesc: string | null; metaTitle: string | null; metaDesc: string | null; metaKeywords: string | null; seoTags: string | null; altImage: string | null; aiResponse: any },
  corrMap: Record<string, string>,
  ex: Record<string, any>,
): any[] {
  // Start from the full original row data if available, otherwise empty array
  const row: any[] = ex.rowData ? [...ex.rowData] : []

  const rewriteUrl = [item.sku, item.productName || '', item.altImage || '']
    .filter(Boolean).join('_').toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 100)

  // Ensure row is long enough
  const maxIdx = Math.max(...Object.values(AI_COLS)) + 1
  while (row.length < maxIdx) row.push('')

  // Overwrite AI-filled columns exactly as StepExport does
  row[AI_COLS.productName]  = item.productName  || ''
  row[AI_COLS.shortDesc]    = item.shortDesc    || ''
  row[AI_COLS.longDesc]     = item.longDesc     || ''
  row[AI_COLS.isActive]     = 1
  row[AI_COLS.metaTitle]    = item.metaTitle    || ''
  row[AI_COLS.metaDesc]     = item.metaDesc     || ''
  row[AI_COLS.metaKeywords] = item.metaKeywords || ''
  row[AI_COLS.rewriteUrl]   = rewriteUrl
  row[AI_COLS.seoTags]      = item.seoTags      || ''
  row[AI_COLS.altImage]     = item.altImage     || ''
  row[AI_COLS.correlati]    = corrMap[item.sku] || ''

  return row
}

function rowToCsvLine(row: any[], maxCol: number): string {
  const cells: string[] = []
  for (let c = 0; c <= maxCol; c++) {
    const v = row[c] ?? ''
    cells.push('"' + String(v).replace(/"/g, '""') + '"')
  }
  return cells.join(';')
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

    // Extract header rows from first item's stored _excel data
    const firstEx = ((session.catalogItems[0]?.aiResponse ?? {}) as any)?._excel ?? {}
    const h0: any[] = firstEx.h0 || []
    const h1: any[] = firstEx.h1 || []

    // Build all data rows
    const dataRows = session.catalogItems.map(item => {
      const ex = ((item.aiResponse ?? {}) as any)?._excel ?? {}
      return buildRow(item as any, corrMap, ex)
    })

    const maxCol = Math.max(
      h0.length - 1,
      h1.length - 1,
      ...dataRows.map(r => r.length - 1),
      AI_COLS.correlati,
    )

    if (type === 'csv') {
      const lines = [
        rowToCsvLine(h0, maxCol),
        rowToCsvLine(h1, maxCol),
        ...dataRows.map(r => rowToCsvLine(r, maxCol)),
      ]
      // Skip empty header lines if no original Excel data was stored
      const csvContent = '﻿' + (h0.length ? lines : lines.slice(2)).join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="catalogo_${id}.csv"`,
        },
      })
    }

    // For excel: return rows as arrays → client builds .xlsx with XLSX.utils.aoa_to_sheet
    const allRows = [
      ...(h0.length ? [h0, h1] : []),
      ...dataRows,
    ]
    return NextResponse.json({ rows: allRows, sessionId: id })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
