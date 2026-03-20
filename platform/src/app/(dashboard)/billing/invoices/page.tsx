'use client'
import { useState, useEffect } from 'react'

type BillingRecord = {
  id: string; month: string; totalImages: number; totalAiCalls: number
  totalCost: string; paymentStatus: string; company: { name: string }
}

export default function InvoicesPage() {
  const [records, setRecords] = useState<BillingRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/billing').then(r => r.json()).then(d => { setRecords(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const statusLabel: Record<string, string> = { unpaid: 'Da pagare', paid: 'Pagata', overdue: 'Scaduta' }
  const statusColor: Record<string, string> = { unpaid: 'var(--warn)', paid: 'var(--ok)', overdue: 'var(--err)' }

  return (
    <div className="animate-fadeUp">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Fatturazione</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>Storico consumi e fatture mensili</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : records.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nessuna fattura ancora</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr><th>Mese</th><th>Immagini</th><th>Chiamate AI</th><th>Costo</th><th>Stato</th></tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.month).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</td>
                  <td>{r.totalImages}</td>
                  <td>{r.totalAiCalls}</td>
                  <td style={{ fontWeight: 700 }}>€{parseFloat(r.totalCost).toFixed(2)}</td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                      background: (statusColor[r.paymentStatus] || 'var(--muted)') + '18',
                      color: statusColor[r.paymentStatus] || 'var(--muted)',
                    }}>
                      {statusLabel[r.paymentStatus] || r.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
