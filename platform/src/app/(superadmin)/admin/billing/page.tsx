'use client'
import { useState, useEffect } from 'react'

type BillingRecord = {
  id: string; month: string; totalImages: number; totalAiCalls: number
  totalCost: string; paymentStatus: string; company: { name: string }
}

export default function AdminBillingPage() {
  const [records, setRecords] = useState<BillingRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/billing').then(r => r.json()).then(d => { setRecords(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  return (
    <div className="animate-fadeUp">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 32 }}>Fatturazione Globale</h1>
      {loading ? <div className="spinner" /> : records.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>Nessun record di fatturazione</div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="tbl">
            <thead><tr><th>Azienda</th><th>Mese</th><th>Immagini</th><th>AI Calls</th><th>Costo</th><th>Stato</th></tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{r.company.name}</td>
                  <td>{new Date(r.month).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</td>
                  <td>{r.totalImages}</td>
                  <td>{r.totalAiCalls}</td>
                  <td style={{ fontWeight: 700 }}>€{parseFloat(r.totalCost).toFixed(2)}</td>
                  <td><span className="tag-t">{r.paymentStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
