'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Session = {
  id: string
  brand: string
  season: string
  year: string
  shootType: string
  status: string
  totalItems: number
  processedItems: number
  failedItems: number
  createdAt: string
  completedAt: string | null
  photosExpiresAt: string | null
  createdBy: { firstName: string; lastName: string }
  _count: { catalogItems: number; correlations: number }
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user?.role) setRole(d.user.role)
    })
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => { setSessions(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const canCreateSession = ['owner', 'user', 'super_admin'].includes(role)

  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.status === 'processing').length,
    completed: sessions.filter(s => s.status === 'completed').length,
    items: sessions.reduce((a, s) => a + s._count.catalogItems, 0),
  }

  const statusLabel: Record<string, string> = {
    draft: 'Bozza',
    processing: 'In corso',
    completed: 'Completata',
    failed: 'Errore',
  }
  const statusColor: Record<string, string> = {
    draft: 'var(--muted)',
    processing: 'var(--warn)',
    completed: 'var(--ok)',
    failed: 'var(--err)',
  }

  return (
    <div className="animate-fadeUp">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Panoramica sessioni di shooting</p>
        </div>
        {canCreateSession && (
          <Link href="/sessions/new" className="btn btn-p" style={{ textDecoration: 'none' }}>
            + Nuova Sessione
          </Link>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Sessioni totali', value: stats.total, color: 'var(--accent)' },
          { label: 'In corso', value: stats.active, color: 'var(--warn)' },
          { label: 'Completate', value: stats.completed, color: 'var(--ok)' },
          { label: 'Prodotti catalogati', value: stats.items, color: 'var(--accent2)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Sessions table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 16 }}>Nessuna sessione ancora</p>
          {canCreateSession && (
            <Link href="/sessions/new" className="btn btn-p" style={{ textDecoration: 'none' }}>
              Crea la prima sessione
            </Link>
          )}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Stagione</th>
                <th>Tipo</th>
                <th>Stato</th>
                <th>Prodotti</th>
                <th>Correlati</th>
                <th>Foto</th>
                <th>Creata</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => {
                const photoDaysLeft = s.photosExpiresAt
                  ? Math.max(0, Math.ceil((new Date(s.photosExpiresAt).getTime() - Date.now()) / 86400000))
                  : null;
                return (
                  <tr key={s.id}>
                    <td><span style={{ fontWeight: 700 }}>{s.brand}</span></td>
                    <td>{s.season} {s.year}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.shootType}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                        background: statusColor[s.status] + '18', color: statusColor[s.status],
                      }}>
                        {statusLabel[s.status] || s.status}
                      </span>
                    </td>
                    <td>{s._count.catalogItems}</td>
                    <td>{s._count.correlations || 0}</td>
                    <td>
                      {photoDaysLeft !== null ? (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: photoDaysLeft <= 2 ? 'var(--err)' : photoDaysLeft <= 4 ? 'var(--warn)' : 'var(--ok)',
                        }}>
                          {photoDaysLeft > 0 ? `${photoDaysLeft}g` : 'Scadute'}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {new Date(s.createdAt).toLocaleDateString('it-IT')}
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <Link href={`/sessions/${s.id}`} className="btn btn-s" style={{ textDecoration: 'none', padding: '6px 14px', fontSize: 12 }}>
                        Apri
                      </Link>
                      <button className="btn btn-d" style={{ padding: '6px 10px', fontSize: 12 }}
                        onClick={async () => {
                          if (!confirm('Eliminare questa sessione?')) return
                          await fetch(`/api/sessions/${s.id}`, { method: 'DELETE' })
                          setSessions(sessions.filter(x => x.id !== s.id))
                        }}>
                        Elimina
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
