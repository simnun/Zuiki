'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type ItemPhoto = { id: string; storageKey: string; originalName: string | null; shotType: string | null }
type CatalogItem = {
  id: string; sku: string; productName: string | null; productType: string | null
  color: string | null; status: string; shortDesc: string | null; longDesc: string | null
  seoTags: string | null; license: string | null; metaTitle: string | null
  photos: ItemPhoto[]
  correlationItems: { correlation: { outfitName: string | null; reason: string | null; items: { item: { sku: string } }[] } }[]
}
type CorrelationData = {
  id: string; outfitName: string | null; reason: string | null
  items: { item: { id: string; sku: string; productName: string | null; photos: ItemPhoto[] } }[]
}
type SessionData = {
  id: string; brand: string; season: string; year: string; shootType: string; status: string
  totalItems: number; processedItems: number; failedItems: number
  createdAt: string; completedAt: string | null; photosExpiresAt: string | null
  createdBy: { firstName: string; lastName: string }
  catalogItems: CatalogItem[]
  correlations: CorrelationData[]
  sessionModels: { model: { name: string } }[]
}

export default function SessionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'items' | 'correlations'>('items')

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

  const photoDaysLeft = session.photosExpiresAt
    ? Math.max(0, Math.ceil((new Date(session.photosExpiresAt).getTime() - Date.now()) / 86400000))
    : null

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Totale</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>{session.totalItems}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Elaborati</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ok)' }}>{session.processedItems}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Correlati</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent2)' }}>{session.correlations.length}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Foto</div>
          {photoDaysLeft !== null ? (
            <div style={{
              fontSize: 28, fontWeight: 700,
              color: photoDaysLeft <= 2 ? 'var(--err)' : photoDaysLeft <= 4 ? 'var(--warn)' : 'var(--ok)',
            }}>
              {photoDaysLeft > 0 ? `${photoDaysLeft}g` : 'Scadute'}
            </div>
          ) : (
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--muted)' }}>—</div>
          )}
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
            {photoDaysLeft !== null && photoDaysLeft > 0 ? 'alla scadenza' : photoDaysLeft === 0 ? 'foto rimosse' : ''}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Link href={`/sessions/${session.id}/export`} className="btn btn-g" style={{ textDecoration: 'none' }}>
          Esporta Catalogo
        </Link>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button className={`btn ${tab === 'items' ? 'btn-p' : 'btn-s'}`} style={{ padding: '8px 20px', fontSize: 13 }}
          onClick={() => setTab('items')}>
          Prodotti ({session.catalogItems.length})
        </button>
        <button className={`btn ${tab === 'correlations' ? 'btn-p' : 'btn-s'}`} style={{ padding: '8px 20px', fontSize: 13 }}
          onClick={() => setTab('correlations')}>
          Correlazioni ({session.correlations.length})
        </button>
      </div>

      {/* Items tab */}
      {tab === 'items' && (
        session.catalogItems.length === 0 ? (
          <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nessun prodotto ancora.</p>
          </div>
        ) : (
          <div>
            {session.catalogItems.map(item => (
              <div key={item.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--subtle)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {item.photos.length > 0 && (item.photos[0].storageKey.startsWith('data:') || item.photos[0].storageKey.startsWith('http')) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photos[0].storageKey} alt="" style={{ width: 48, height: 48, objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.photos.length > 0 ? `${item.photos.length}📷` : '—'}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="sku">{item.sku}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: item.status === 'done' ? '#e8f5e9' : item.status === 'error' ? '#fff5f5' : '#fff3dc',
                      color: item.status === 'done' ? 'var(--ok)' : item.status === 'error' ? 'var(--err)' : 'var(--warn)',
                    }}>
                      {item.status === 'done' ? 'OK' : item.status === 'error' ? 'ERR' : item.status.toUpperCase()}
                    </span>
                    {item.productType && <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--subtle)', padding: '2px 6px', borderRadius: 4 }}>{item.productType}</span>}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{item.productName || '—'}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    {item.color && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.color}</span>}
                    {item.shortDesc && <span style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.shortDesc}</span>}
                  </div>
                </div>
                {item.license && <span className="tag-t">{item.license}</span>}
              </div>
            ))}
          </div>
        )
      )}

      {/* Correlations tab */}
      {tab === 'correlations' && (
        session.correlations.length === 0 ? (
          <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nessuna correlazione trovata.</p>
          </div>
        ) : (
          <div>
            {session.correlations.map(corr => (
              <div key={corr.id} className="card" style={{ padding: '20px 24px', marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{corr.outfitName || 'Outfit'}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                  {corr.items.map(ci => (
                    <div key={ci.item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 8, background: 'var(--subtle)', borderRadius: 8, border: '1px solid var(--border)', minWidth: 90 }}>
                      {ci.item.photos?.[0]?.storageKey && (ci.item.photos[0].storageKey.startsWith('data:') || ci.item.photos[0].storageKey.startsWith('http')) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ci.item.photos[0].storageKey} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />
                      ) : (
                        <div style={{ width: 56, height: 56, background: 'var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--muted)' }}>📷</div>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{ci.item.sku}</span>
                      {ci.item.productName && <span style={{ fontSize: 10, color: 'var(--muted)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ci.item.productName}</span>}
                    </div>
                  ))}
                </div>
                {corr.reason && <p style={{ fontSize: 12, color: 'var(--muted)' }}>{corr.reason}</p>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
