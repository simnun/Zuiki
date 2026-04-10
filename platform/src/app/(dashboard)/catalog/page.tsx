'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Photo = { id: string; storageKey: string; originalName: string | null; shotType: string | null }
type SessionInfo = { brand: string; season: string; year: string }
type CatalogItemRow = {
  id: string
  sku: string
  productName: string | null
  productType: string | null
  color: string | null
  status: string
  shortDesc: string | null
  metaTitle: string | null
  license: string | null
  composition: string | null
  recognizedModel: string | null
  sessionId: string
  createdAt: string
  photos: Photo[]
  session: SessionInfo
}
type SessionOption = { id: string; label: string }

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sessions, setSessions] = useState<SessionOption[]>([])
  const [productTypes, setProductTypes] = useState<string[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const limit = 30

  const loadItems = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (sessionFilter) params.set('sessionId', sessionFilter)
    if (typeFilter) params.set('productType', typeFilter)

    try {
      const res = await fetch(`/api/catalog?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
      if (data.sessions) setSessions(data.sessions)
      if (data.productTypes) setProductTypes(data.productTypes)
    } catch {
      setItems([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, search, statusFilter, sessionFilter, typeFilter])

  useEffect(() => { loadItems() }, [loadItems])

  // Load thumbnail URLs for visible items
  useEffect(() => {
    items.forEach(item => {
      if (item.photos[0] && !photoUrls[item.photos[0].storageKey]) {
        fetch(`/api/files?path=${encodeURIComponent(item.photos[0].storageKey)}`)
          .then(r => r.json())
          .then(d => {
            if (d.url) {
              setPhotoUrls(prev => ({ ...prev, [item.photos[0].storageKey]: d.url }))
            }
          })
          .catch(() => {})
      }
    })
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const totalPages = Math.ceil(total / limit)

  const statusLabel: Record<string, string> = {
    pending: 'In attesa',
    processing: 'In corso',
    done: 'Completato',
    error: 'Errore',
  }
  const statusColor: Record<string, string> = {
    pending: 'var(--muted)',
    processing: 'var(--warn)',
    done: 'var(--ok)',
    error: 'var(--err)',
  }

  const stats = {
    total,
    done: items.filter(i => i.status === 'done').length,
    errors: items.filter(i => i.status === 'error').length,
  }

  return (
    <div className="animate-fadeUp">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>Catalogo AI</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Tutti i prodotti catalogati con intelligenza artificiale
          </p>
        </div>
        <Link href="/sessions/new" className="btn btn-p" style={{ textDecoration: 'none' }}>
          + Nuova Sessione
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Prodotti totali', value: total, color: 'var(--accent)' },
          { label: 'Sessioni', value: sessions.length, color: 'var(--accent2)' },
          { label: 'Tipi prodotto', value: productTypes.length, color: 'var(--warn)' },
          { label: 'In questa pagina', value: items.length, color: 'var(--ok)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{loading ? '-' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', gap: 8 }}>
          <input
            className="inp"
            placeholder="Cerca per SKU, nome, colore..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            style={{ flex: 1 }}
          />
          <button className="btn btn-p" onClick={handleSearch} style={{ padding: '10px 18px' }}>
            Cerca
          </button>
        </div>
        <select className="inp" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ width: 150 }}>
          <option value="">Tutti gli stati</option>
          <option value="done">Completato</option>
          <option value="pending">In attesa</option>
          <option value="processing">In corso</option>
          <option value="error">Errore</option>
        </select>
        <select className="inp" value={sessionFilter} onChange={e => { setSessionFilter(e.target.value); setPage(1) }} style={{ width: 200 }}>
          <option value="">Tutte le sessioni</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select className="inp" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} style={{ width: 170 }}>
          <option value="">Tutti i tipi</option>
          {productTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {(search || statusFilter || sessionFilter || typeFilter) && (
          <button
            className="btn btn-s"
            onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); setSessionFilter(''); setTypeFilter(''); setPage(1) }}
            style={{ padding: '10px 14px', fontSize: 12 }}
          >
            Resetta filtri
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {search || statusFilter || sessionFilter || typeFilter
              ? 'Nessun prodotto trovato'
              : 'Il catalogo e vuoto'}
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
            {search || statusFilter || sessionFilter || typeFilter
              ? 'Prova a modificare i filtri di ricerca'
              : 'Crea una nuova sessione per iniziare a catalogare i prodotti'}
          </p>
          {!search && !statusFilter && !sessionFilter && !typeFilter && (
            <Link href="/sessions/new" className="btn btn-p" style={{ textDecoration: 'none' }}>
              + Nuova Sessione
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--subtle)' }}>
                  <th style={thStyle}>Foto</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>SKU</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Nome</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Tipo</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Colore</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Sessione</th>
                  <th style={thStyle}>Stato</th>
                  <th style={thStyle}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    photoUrl={item.photos[0] ? photoUrls[item.photos[0].storageKey] : undefined}
                    expanded={expanded === item.id}
                    onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
                    statusLabel={statusLabel}
                    statusColor={statusColor}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
              <button
                className="btn btn-s"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '8px 14px', fontSize: 12 }}
              >
                ← Precedente
              </button>
              <span style={{ fontSize: 13, color: 'var(--muted)', padding: '0 12px' }}>
                Pagina {page} di {totalPages} ({total} prodotti)
              </span>
              <button
                className="btn btn-s"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '8px 14px', fontSize: 12 }}
              >
                Successiva →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: 'var(--muted)',
  textAlign: 'center',
}

function ItemRow({
  item,
  photoUrl,
  expanded,
  onToggle,
  statusLabel,
  statusColor,
}: {
  item: CatalogItemRow
  photoUrl?: string
  expanded: boolean
  onToggle: () => void
  statusLabel: Record<string, string>
  statusColor: Record<string, string>
}) {
  return (
    <>
      <tr
        style={{
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer',
          transition: 'background .15s',
          background: expanded ? 'var(--subtle)' : undefined,
        }}
        onClick={onToggle}
        onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLElement).style.background = '#faf8f4' }}
        onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLElement).style.background = '' }}
      >
        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={item.sku}
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
            />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 6, background: 'var(--subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: 'var(--muted)', border: '1px solid var(--border)',
            }}>
              {item.photos.length > 0 ? '...' : '-'}
            </div>
          )}
        </td>
        <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 12, fontFamily: 'monospace' }}>
          {item.sku.length > 30 ? item.sku.slice(0, 30) + '...' : item.sku}
        </td>
        <td style={{ padding: '10px 14px' }}>
          {item.productName || <span style={{ color: 'var(--muted)' }}>-</span>}
        </td>
        <td style={{ padding: '10px 14px' }}>
          {item.productType ? (
            <span className="tag-t">{item.productType}</span>
          ) : (
            <span style={{ color: 'var(--muted)' }}>-</span>
          )}
        </td>
        <td style={{ padding: '10px 14px' }}>
          {item.color || <span style={{ color: 'var(--muted)' }}>-</span>}
        </td>
        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>
          {item.session.brand} {item.session.season} {item.session.year}
        </td>
        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
            background: (statusColor[item.status] || 'var(--muted)') + '18',
            color: statusColor[item.status] || 'var(--muted)',
          }}>
            {statusLabel[item.status] || item.status}
          </span>
        </td>
        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
          <Link
            href={`/sessions/${item.sessionId}`}
            className="btn btn-s"
            style={{ padding: '5px 12px', fontSize: 11, textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            Sessione
          </Link>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'var(--subtle)' }}>
          <td colSpan={8} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <DetailField label="SKU completo" value={item.sku} />
                <DetailField label="Nome prodotto" value={item.productName} />
                <DetailField label="Tipo" value={item.productType} />
                <DetailField label="Colore" value={item.color} />
                <DetailField label="Composizione" value={item.composition} />
                <DetailField label="Licenza" value={item.license} />
                <DetailField label="Modella" value={item.recognizedModel} />
              </div>
              <div>
                <DetailField label="Meta titolo" value={item.metaTitle} />
                <DetailField label="Descrizione breve" value={item.shortDesc} />
                <DetailField label="Foto" value={`${item.photos.length} foto`} />
                <DetailField label="Data" value={new Date(item.createdAt).toLocaleDateString('it-IT')} />
                <div style={{ marginTop: 12 }}>
                  <Link
                    href={`/sessions/${item.sessionId}`}
                    className="btn btn-p"
                    style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 12 }}
                  >
                    Vai alla sessione →
                  </Link>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13 }}>{value || <span style={{ color: 'var(--muted)' }}>-</span>}</div>
    </div>
  )
}
