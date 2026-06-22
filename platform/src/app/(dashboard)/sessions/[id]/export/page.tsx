'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const COLUMN_LABELS: Record<string, string> = {
  sku:                 'SKU',
  colori:              'Colori',
  taglie:              'Taglie',
  productName:         'Titolo Prodotto',
  shortDesc:           'Descrizione Breve',
  longDesc:            'Descrizione Estesa',
  isActive:            'Abilitato',
  metaTitle:           'Meta Titolo',
  metaDesc:            'Meta Descrizione',
  metaKeywords:        'Meta Keywords',
  rewriteUrl:          'Rewrite URL',
  seoTags:             'SEO Tags',
  altImage:            'Alt Image',
  correlati:           'Correlati',
  anno:                'Anno',
  stagione:            'Stagione',
  tipoArticolo:        'Tipo Articolo',
  brand:               'Brand',
  caratteristica:      'Caratteristica',
  composizione:        'Composizione',
  licenza:             'Licenza',
  modellaRiconosciuta: 'Modella Riconosciuta',
}

export default function ExportPage() {
  const { id } = useParams()
  const router = useRouter()
  const [downloading, setDownloading] = useState('')

  const handleExport = async (type: 'csv' | 'excel') => {
    setDownloading(type)
    try {
      const res = await fetch(`/api/sessions/${id}/export/${type}`)
      if (!res.ok) throw new Error(`Errore ${res.status}`)

      if (type === 'csv') {
        const blob = await res.blob()
        triggerDownload(blob, `catalogo_${id}.csv`)
      } else {
        const { rows } = await res.json() as { rows: Record<string, string>[] }

        // Rename columns to Italian labels
        const labelledRows = rows.map(row =>
          Object.fromEntries(
            Object.entries(row).map(([k, v]) => [COLUMN_LABELS[k] ?? k, v])
          )
        )

        const ws = XLSX.utils.json_to_sheet(labelledRows)
        // Auto-width columns
        const colWidths = Object.keys(labelledRows[0] ?? {}).map(h => ({ wch: Math.max(h.length, 18) }))
        ws['!cols'] = colWidths

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Catalogo')
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        triggerDownload(
          new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
          `catalogo_${id}.xlsx`
        )
      }
    } catch (err: any) {
      alert('Errore durante l\'export: ' + (err?.message || ''))
    }
    setDownloading('')
  }

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 500 }}>
      <button className="btn btn-s" onClick={() => router.push(`/sessions/${id}`)} style={{ marginBottom: 16, padding: '6px 12px', fontSize: 12 }}>
        ← Indietro
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Esporta Catalogo</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>Scarica i dati completi della sessione (colonne originali + dati elaborati dall&apos;AI)</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {([
          { type: 'csv' as const,   label: 'CSV',   desc: 'Tutti i dati (separatore ;) — importabile in Excel' },
          { type: 'excel' as const, label: 'Excel', desc: 'File .xlsx con colonne originali + dati AI' },
        ]).map(exp => (
          <div key={exp.type} className="card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{exp.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{exp.desc}</div>
            </div>
            <button className="btn btn-p" onClick={() => handleExport(exp.type)} disabled={!!downloading}>
              {downloading === exp.type ? 'Download...' : 'Scarica'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
