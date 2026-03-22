'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type LastMsg = { message: string; createdAt: string; sender: { firstName: string; lastName: string; role: string } }
type Ticket = {
  id: string; subject: string; description: string; status: string
  createdAt: string; updatedAt: string
  createdBy: { firstName: string; lastName: string }
  company?: { name: string }
  _count: { messages: number }
  lastMessage: LastMsg | null
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Aperto', color: '#e67e22', bg: '#fef3e2' },
  in_progress: { label: 'In lavorazione', color: '#3498db', bg: '#ebf5fb' },
  resolved: { label: 'Risolto', color: '#27ae60', bg: '#eafaf1' },
  closed: { label: 'Chiuso', color: '#95a5a6', bg: '#f0f0f0' },
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/tickets').then(r => r.json()).then(d => {
      setTickets(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  }

  const filtered = tickets.filter(t => {
    if (filter !== 'all') {
      if (filter === 'resolved') { if (t.status !== 'resolved' && t.status !== 'closed') return false }
      else if (t.status !== filter) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const match = t.subject.toLowerCase().includes(q)
        || t.createdBy.firstName.toLowerCase().includes(q)
        || t.createdBy.lastName.toLowerCase().includes(q)
        || t.company?.name?.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'ora'
    if (mins < 60) return `${mins}m fa`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h fa`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}g fa`
    return new Date(date).toLocaleDateString('it-IT')
  }

  // Check if last message is from user (needs admin attention)
  const needsAttention = (t: Ticket) =>
    t.status !== 'closed' && t.status !== 'resolved' && t.lastMessage && t.lastMessage.sender.role !== 'super_admin'

  return (
    <div className="animate-fadeUp">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 24 }}>Ticket Supporto</h1>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Totale', value: counts.all, color: 'var(--text)' },
          { label: 'Aperti', value: counts.open, color: '#e67e22' },
          { label: 'In lavorazione', value: counts.in_progress, color: '#3498db' },
          { label: 'Risolti', value: counts.resolved, color: '#27ae60' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '16px 20px', borderRadius: 12,
            background: '#222', border: '1px solid #333',
          }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca per oggetto, utente o azienda..."
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 10, fontSize: 13,
            background: '#222', border: '1px solid #333', color: '#fff',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {[
          { key: 'all', label: 'Tutti' },
          { key: 'open', label: 'Aperti' },
          { key: 'in_progress', label: 'In lavorazione' },
          { key: 'resolved', label: 'Risolti/Chiusi' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filter === tab.key ? 'var(--accent2)' : '#222',
              color: filter === tab.key ? '#fff' : '#888',
              border: `1px solid ${filter === tab.key ? 'var(--accent2)' : '#333'}`,
              borderRadius: 8, fontFamily: 'inherit', transition: 'all .15s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#888', background: '#222', borderRadius: 12 }}>
          {tickets.length === 0 ? 'Nessun ticket ricevuto' : 'Nessun risultato per questa ricerca'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(t => {
            const stCfg = STATUS_CFG[t.status] || STATUS_CFG.open
            const urgent = needsAttention(t)
            return (
              <Link key={t.id} href={`/admin/tickets/${t.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  padding: '16px 20px', borderRadius: 12, cursor: 'pointer',
                  background: '#222', border: `1px solid ${urgent ? '#e67e22' : '#333'}`,
                  transition: 'all .15s',
                  borderLeft: `3px solid ${stCfg.color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        {urgent && <span style={{ fontSize: 8, color: '#e67e22' }}>●</span>}
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{t.subject}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: stCfg.bg, color: stCfg.color,
                        }}>{stCfg.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#888' }}>
                        <span style={{ fontWeight: 600, color: '#aaa' }}>
                          {t.createdBy.firstName} {t.createdBy.lastName}
                        </span>
                        {t.company?.name && (
                          <>
                            <span>·</span>
                            <span>{t.company.name}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{t._count.messages} {t._count.messages === 1 ? 'msg' : 'msgs'}</span>
                      </div>
                      {t.lastMessage && (
                        <p style={{ fontSize: 12, color: '#777', margin: '6px 0 0', lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 600, color: t.lastMessage.sender.role === 'super_admin' ? 'var(--accent2)' : '#aaa' }}>
                            {t.lastMessage.sender.role === 'super_admin' ? 'Tu' : t.lastMessage.sender.firstName}:
                          </span>{' '}
                          {t.lastMessage.message.slice(0, 80)}{t.lastMessage.message.length > 80 ? '...' : ''}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        {timeAgo(t.lastMessage?.createdAt || t.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
