'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type LastMsg = { message: string; createdAt: string; sender: { firstName: string; lastName: string; role: string } }
type Ticket = {
  id: string; subject: string; description: string; status: string
  createdAt: string; updatedAt: string
  createdBy: { firstName: string; lastName: string }
  _count: { messages: number }
  lastMessage: LastMsg | null
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Aperto', color: '#e67e22', bg: '#fef3e2' },
  in_progress: { label: 'In lavorazione', color: '#3498db', bg: '#ebf5fb' },
  resolved: { label: 'Risolto', color: '#27ae60', bg: '#eafaf1' },
  closed: { label: 'Chiuso', color: '#95a5a6', bg: '#f0f0f0' },
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/tickets').then(r => r.json()).then(d => {
      setTickets(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)
  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  }

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

  return (
    <div className="animate-fadeUp">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>Supporto</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Hai bisogno di aiuto? Siamo qui per te.
          </p>
        </div>
        <Link href="/support/new" className="btn btn-p" style={{ textDecoration: 'none', padding: '10px 20px', fontSize: 13 }}>
          + Nuovo Ticket
        </Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[
          { key: 'all', label: 'Tutti', count: counts.all },
          { key: 'open', label: 'Aperti', count: counts.open },
          { key: 'in_progress', label: 'In lavorazione', count: counts.in_progress },
          { key: 'resolved', label: 'Risolti', count: counts.resolved },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: 'none', border: 'none', borderBottom: filter === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: filter === tab.key ? 'var(--accent)' : 'var(--muted)',
              transition: 'all .15s', fontFamily: 'inherit',
            }}>
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                marginLeft: 6, padding: '1px 7px', borderRadius: 10, fontSize: 11,
                background: filter === tab.key ? 'var(--accent)' : 'var(--border)',
                color: filter === tab.key ? '#fff' : 'var(--muted)',
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--subtle)', borderRadius: 16, border: '1px solid var(--border)',
        }}>
          {tickets.length === 0 ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>?</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Nessun ticket</h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
                Hai un problema o una domanda? Apri un ticket e il nostro team ti risponderà al più presto.
              </p>
              <Link href="/support/new" className="btn btn-p" style={{ textDecoration: 'none', padding: '10px 24px', fontSize: 13 }}>
                Apri il tuo primo ticket
              </Link>
            </>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>Nessun ticket con questo filtro</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(t => {
            const st = STATUS_CFG[t.status] || STATUS_CFG.open
            const hasAdminReply = t.lastMessage?.sender.role === 'super_admin'
            return (
              <Link key={t.id} href={`/support/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{
                  padding: '18px 22px', cursor: 'pointer', transition: 'all .15s',
                  borderLeft: `3px solid ${st.color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{t.subject}</h3>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: st.bg, color: st.color,
                        }}>{st.label}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                        {t.lastMessage
                          ? <>
                              <span style={{ fontWeight: 600, color: hasAdminReply ? 'var(--accent2)' : 'var(--text)' }}>
                                {hasAdminReply ? 'Supporto' : t.lastMessage.sender.firstName}:
                              </span>{' '}
                              {t.lastMessage.message.slice(0, 100)}{t.lastMessage.message.length > 100 ? '...' : ''}
                            </>
                          : t.description.slice(0, 100) + (t.description.length > 100 ? '...' : '')
                        }
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {timeAgo(t.lastMessage?.createdAt || t.updatedAt)}
                      </div>
                      {t._count.messages > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                          {t._count.messages} {t._count.messages === 1 ? 'risposta' : 'risposte'}
                        </div>
                      )}
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
