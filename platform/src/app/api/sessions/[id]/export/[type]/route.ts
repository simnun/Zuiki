import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    if (type === 'csv') {
      const rows = session.catalogItems.map((item) => ({
        sku: item.sku,
        productName: item.productName || '',
        productType: item.productType || '',
        color: item.color || '',
        composition: item.composition || '',
        shortDesc: item.shortDesc || '',
        longDesc: item.longDesc || '',
        seoTags: item.seoTags || '',
        metaTitle: item.metaTitle || '',
        metaDesc: item.metaDesc || '',
        metaKeywords: item.metaKeywords || '',
        altImage: item.altImage || '',
        license: item.license || '',
        recognizedModel: item.recognizedModel || '',
      }))

      const headers = Object.keys(rows[0] || {})
      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          headers.map((h) => `"${String((row as Record<string, string>)[h]).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="export_${id}.csv"`,
        },
      })
    }

    // For excel/photos_zip, return the data as JSON (client-side generation)
    return NextResponse.json({
      items: session.catalogItems,
      correlations: session.correlations,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
