'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ExportPage() {
  const { id } = useParams()
  const router = useRouter()
  const [downloading, setDownloading] = useState('')

  const handleExport = async (type: string) => {
    setDownloading(type)
    try {
      const res = await fetch(`/api/sessions/${id}/export/${type}`)
      if (type === 'csv') {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `catalogo_${id}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `catalogo_${id}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      alert('Errore durante l\'export')
    }
    setDownloading('')
  }

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 500 }}>
      <button className="btn btn-s" onClick={() => router.push(`/sessions/${id}`)} style={{ marginBottom: 16, padding: '6px 12px', fontSize: 12 }}>
        ← Indietro
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Esporta Catalogo</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>Scarica i dati della sessione nel formato preferito</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { type: 'csv', label: 'CSV', desc: 'Tabella con tutti i dati catalogati, importabile in Excel' },
          { type: 'json', label: 'JSON', desc: 'Dati strutturati con correlazioni outfit' },
        ].map(exp => (
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
