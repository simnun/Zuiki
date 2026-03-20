'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type ItemPhoto = { id: string; storageKey: string; originalName: string | null; shotType: string | null }
type CatalogItem = {
  id: string; sku: string; productName: string | null; productType: string | null
  color: string | null; status: string; shortDesc: string | null; license: string | null
  photos: ItemPhoto[]
}
type SessionData = {
  id: string; brand: string; season: string; year: string; shootType: string; status: string
  totalItems: number; processedItems: number; failedItems: number
  createdAt: string; completedAt: string | null
  createdBy: { firstName: string; lastName: string }
  catalogItems: CatalogItem[]
  sessionModels: { model: { name: string } }[]
}

export default function SessionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sessions/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setSession(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>
  if (!session) return <div className="card" style={{ padding: 40, textAlign: 'center' }}>Sessione non trovata</div>

  const statusLabel: Record<string, string> = { draft: 'Bozza', processing: 'In corso', completed: 'Completata', failed: 'Errore' }
  const statusColor: Record<string, string> = { draft: 'var(--muted)', processing: 'var(--warn)', completed: 'var(--ok)', failed: 'var(--err)' }
  const progress = session.totalItems > 0 ? Math.round((session.processedItems / session.totalItems) * 100) : 0

  return (
    <div className="animate-fadeUp">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button className="btn btn-s" onClick={() => router.push('/dashboard')} style={{ padding: '6px 12px', fontSize: 12 }}>
          ← Indietro
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>
          {session.brand.charAt(0).toUpperCase() + session.brand.slice(1)} — {session.season} {session.year}
        </h1>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 6,
          background: statusColor[session.status] + '18', color: statusColor[session.status],
        }}>
          {statusLabel[session.status] || session.status}
        </span>
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        Tipo: {session.shootType} • Creata il {new Date(session.createdAt).toLocaleDateString('it-IT')} da {session.createdBy.firstName} {session.createdBy.lastName}
        {session.sessionModels.length > 0 && ` • Modelle: ${session.sessionModels.map(m => m.model.name).join(', ')}`}
      </p>

      {/* Progress bar */}
      {session.totalItems > 0 && (
        <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Progresso elaborazione</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent2)' }}>
              {session.processedItems}/{session.totalItems} ({progress}%)
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--subtle)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--ok)', borderRadius: 4, transition: 'width .3s' }} />
          </div>
          {session.failedItems > 0 && (
            <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 8 }}>{session.failedItems} prodotti con errore</div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Totale</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>{session.totalItems}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Elaborati</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ok)' }}>{session.processedItems}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Errori</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--err)' }}>{session.failedItems}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Link href={`/sessions/${session.id}/export`} className="btn btn-g" style={{ textDecoration: 'none' }}>
          Esporta Catalogo
        </Link>
      </div>

      {/* Items list */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Prodotti ({session.catalogItems.length})</h2>

      {session.catalogItems.length === 0 ? (
        <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nessun prodotto ancora. Usa il Catalogo Rapido (/) per elaborare le foto.</p>
        </div>
      ) : (
        <div>
          {session.catalogItems.map(item => (
            <div key={item.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--subtle)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--muted)' }}>
                {item.photos.length > 0 ? `${item.photos.length}📷` : '—'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="sku">{item.sku}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: item.status === 'done' ? '#e8f5e9' : item.status === 'error' ? '#fff5f5' : '#fff3dc',
                    color: item.status === 'done' ? 'var(--ok)' : item.status === 'error' ? 'var(--err)' : 'var(--warn)',
                  }}>
                    {item.status === 'done' ? 'OK' : item.status === 'error' ? 'ERR' : item.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 13, marginTop: 2 }}>{item.productName || '—'}</div>
                {item.color && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.color}</span>}
              </div>
              {item.license && <span className="tag-t">{item.license}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
