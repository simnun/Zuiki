'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Message = { id: string; message: string; createdAt: string; sender: { firstName: string; lastName: string; role: string } }
type Ticket = {
  id: string; subject: string; description: string; status: string; createdAt: string
  createdBy: { firstName: string; lastName: string }; messages: Message[]
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  open: { label: 'Aperto', color: '#e67e22', bg: '#fef3e2', icon: '●' },
  in_progress: { label: 'In lavorazione', color: '#3498db', bg: '#ebf5fb', icon: '◐' },
  resolved: { label: 'Risolto', color: '#27ae60', bg: '#eafaf1', icon: '✓' },
  closed: { label: 'Chiuso', color: '#95a5a6', bg: '#f0f0f0', icon: '—' },
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const load = () => {
    fetch(`/api/tickets/${id}`).then(r => r.json()).then(setTicket)
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.messages.length])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      })
      if (res.ok) {
        setReply('')
        load()
      } else {
        setError('Errore nell\'invio. Riprova.')
      }
    } catch {
      setError('Errore di rete. Riprova.')
    }
    setSending(false)
  }

  if (!ticket) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>

  const st = STATUS_CFG[ticket.status] || STATUS_CFG.open
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 700 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13 }}>
        <Link href="/support" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Supporto</Link>
        <span style={{ color: 'var(--muted)' }}>/</span>
        <span style={{ fontWeight: 600 }}>#{ticket.id.slice(0, 8)}</span>
      </div>

      {/* Ticket header */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{ticket.subject}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--muted)' }}>
              <span>Aperto il {new Date(ticket.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span>·</span>
              <span>{ticket.messages.length} {ticket.messages.length === 1 ? 'risposta' : 'risposte'}</span>
            </div>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 8,
            background: st.bg, color: st.color, whiteSpace: 'nowrap',
          }}>{st.icon} {st.label}</span>
        </div>
      </div>

      {/* Conversation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Original message */}
        <MessageBubble
          sender={`${ticket.createdBy.firstName} ${ticket.createdBy.lastName}`}
          message={ticket.description}
          date={ticket.createdAt}
          isAdmin={false}
          isFirst={true}
        />

        {/* Thread */}
        {ticket.messages.map((m, i) => {
          const isAdmin = m.sender.role === 'super_admin'
          return (
            <MessageBubble
              key={m.id}
              sender={isAdmin ? 'Team Supporto' : `${m.sender.firstName} ${m.sender.lastName}`}
              message={m.message}
              date={m.createdAt}
              isAdmin={isAdmin}
              isFirst={i === 0 && true}
            />
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply form */}
      {!isClosed ? (
        <div style={{ marginTop: 20 }}>
          {error && (
            <div style={{
              background: '#fce4ec', border: '1px solid #ef9a9a', borderRadius: 8,
              padding: '8px 14px', marginBottom: 12, fontSize: 12, color: '#c62828', fontWeight: 600,
            }}>{error}</div>
          )}
          <form onSubmit={handleReply}>
            <textarea
              className="inp"
              rows={3}
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Scrivi un messaggio..."
              required
              style={{ fontSize: 14, lineHeight: 1.5, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                Il team di supporto riceverà una notifica della tua risposta
              </span>
              <button className="btn btn-p" type="submit" disabled={sending || !reply.trim()}
                style={{ padding: '8px 20px', fontSize: 13 }}>
                {sending ? 'Invio...' : 'Invia'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{
          marginTop: 20, padding: '16px 20px', borderRadius: 12, textAlign: 'center',
          background: 'var(--subtle)', border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            Questo ticket è stato {ticket.status === 'resolved' ? 'risolto' : 'chiuso'}.{' '}
            <Link href="/support/new" style={{ color: 'var(--accent)' }}>Apri un nuovo ticket</Link> se hai bisogno di ulteriore assistenza.
          </p>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ sender, message, date, isAdmin, isFirst }: {
  sender: string; message: string; date: string; isAdmin: boolean; isFirst: boolean
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isAdmin ? 'flex-start' : 'flex-end',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '85%', padding: '14px 18px', borderRadius: 16,
        borderBottomRightRadius: isAdmin ? 16 : 4,
        borderBottomLeftRadius: isAdmin ? 4 : 16,
        background: isAdmin ? 'var(--card)' : 'var(--accent)',
        color: isAdmin ? 'var(--text)' : '#fff',
        border: isAdmin ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, marginBottom: 6,
          color: isAdmin ? 'var(--accent2)' : 'rgba(255,255,255,0.8)',
        }}>
          {sender}
          {isAdmin && <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--accent2)', color: '#fff' }}>SUPPORTO</span>}
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{message}</p>
      </div>
      <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, padding: '0 8px' }}>
        {new Date(date).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
