'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Ticket = {
  id: string; subject: string; status: string; createdAt: string
  createdBy: { firstName: string; lastName: string }
  _count: { messages: number }
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tickets').then(r => r.json()).then(d => { setTickets(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const statusColor: Record<string, string> = { open: 'var(--warn)', in_progress: 'var(--accent2)', resolved: 'var(--ok)', closed: 'var(--muted)' }

  return (
    <div className="animate-fadeUp">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 32 }}>Ticket Supporto</h1>
      {loading ? <div className="spinner" /> : tickets.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>Nessun ticket</div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="tbl">
            <thead><tr><th>Oggetto</th><th>Da</th><th>Stato</th><th>Messaggi</th><th>Data</th><th></th></tr></thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.subject}</td>
                  <td>{t.createdBy.firstName} {t.createdBy.lastName}</td>
                  <td><span style={{ fontSize: 11, fontWeight: 700, color: statusColor[t.status] || 'var(--muted)' }}>{t.status}</span></td>
                  <td>{t._count.messages}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(t.createdAt).toLocaleDateString('it-IT')}</td>
                  <td><Link href={`/admin/tickets/${t.id}`} className="btn btn-s" style={{ textDecoration: 'none', padding: '4px 12px', fontSize: 11 }}>Apri</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
