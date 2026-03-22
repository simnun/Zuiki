'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Message = { id: string; message: string; createdAt: string; sender: { firstName: string; lastName: string; role: string } }
type Ticket = {
  id: string; subject: string; description: string; status: string; createdAt: string
  createdBy: { firstName: string; lastName: string }
  company?: { name: string }
  messages: Message[]
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Aperto', color: '#e67e22', bg: '#fef3e2' },
  in_progress: { label: 'In lavorazione', color: '#3498db', bg: '#ebf5fb' },
  resolved: { label: 'Risolto', color: '#27ae60', bg: '#eafaf1' },
  closed: { label: 'Chiuso', color: '#95a5a6', bg: '#f0f0f0' },
}

export default function AdminTicketDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
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
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: reply.trim() }),
    })
    setReply('')
    setSending(false)
    load()
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatusUpdating(true)
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setStatusUpdating(false)
    load()
  }

  // Quick reply + status change
  const handleReplyAndResolve = async () => {
    if (!reply.trim()) return
    setSending(true)
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: reply.trim(), status: 'resolved' }),
    })
    setReply('')
    setSending(false)
    load()
  }

  if (!ticket) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>

  const st = STATUS_CFG[ticket.status] || STATUS_CFG.open
  const isClosed = ticket.status === 'closed'

  return (
    <div className="animate-fadeUp" style={{ display: 'flex', gap: 24 }}>
      {/* Main chat area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Back button */}
        <button onClick={() => router.push('/admin/tickets')}
          style={{
            background: 'none', border: 'none', color: '#888', cursor: 'pointer',
            fontSize: 13, fontFamily: 'inherit', marginBottom: 16, padding: 0,
          }}>
          ← Tutti i ticket
        </button>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 20 }}>{ticket.subject}</h1>

        {/* Chat messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Original description */}
          <AdminMessageBubble
            sender={`${ticket.createdBy.firstName} ${ticket.createdBy.lastName}`}
            message={ticket.description}
            date={ticket.createdAt}
            isAdmin={false}
          />

          {/* Thread */}
          {ticket.messages.map(m => {
            const isAdmin = m.sender.role === 'super_admin'
            return (
              <AdminMessageBubble
                key={m.id}
                sender={isAdmin ? 'Tu (Admin)' : `${m.sender.firstName} ${m.sender.lastName}`}
                message={m.message}
                date={m.createdAt}
                isAdmin={isAdmin}
              />
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply form */}
        {!isClosed ? (
          <div style={{ marginTop: 20 }}>
            <form onSubmit={handleReply}>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Scrivi una risposta al cliente..."
                rows={4}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 14,
                  background: '#222', border: '1px solid #333', color: '#fff',
                  fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                {reply.trim() && ticket.status !== 'resolved' && (
                  <button type="button" onClick={handleReplyAndResolve} disabled={sending}
                    style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: '#222', border: '1px solid #27ae60', color: '#27ae60', fontFamily: 'inherit',
                    }}>
                    Rispondi e Risolvi
                  </button>
                )}
                <button type="submit" disabled={sending || !reply.trim()}
                  style={{
                    padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: 'var(--accent2)', border: 'none', color: '#fff', fontFamily: 'inherit',
                    opacity: !reply.trim() ? 0.5 : 1,
                  }}>
                  {sending ? 'Invio...' : 'Rispondi'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{
            marginTop: 20, padding: '14px 20px', borderRadius: 12, textAlign: 'center',
            background: '#222', border: '1px solid #333', color: '#888', fontSize: 13,
          }}>
            Ticket chiuso. <button onClick={() => handleStatusChange('open')}
              style={{ background: 'none', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
              Riapri ticket
            </button>
          </div>
        )}
      </div>

      {/* Sidebar info */}
      <div style={{ width: 240, flexShrink: 0 }}>
        <div style={{ padding: '20px', borderRadius: 12, background: '#222', border: '1px solid #333' }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 16 }}>
            Dettagli Ticket
          </h3>

          {/* Status */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Stato</div>
            <select
              value={ticket.status}
              onChange={e => handleStatusChange(e.target.value)}
              disabled={statusUpdating}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: '#1a1a1a', border: '1px solid #333', color: st.color,
                cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
              }}
            >
              <option value="open" style={{ color: '#e67e22' }}>Aperto</option>
              <option value="in_progress" style={{ color: '#3498db' }}>In lavorazione</option>
              <option value="resolved" style={{ color: '#27ae60' }}>Risolto</option>
              <option value="closed" style={{ color: '#95a5a6' }}>Chiuso</option>
            </select>
          </div>

          {/* Client info */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Cliente</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
              {ticket.createdBy.firstName} {ticket.createdBy.lastName}
            </div>
            {ticket.company?.name && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{ticket.company.name}</div>
            )}
          </div>

          {/* Date */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Aperto il</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>
              {new Date(ticket.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
              {new Date(ticket.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Messages count */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Messaggi</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>{ticket.messages.length + 1}</div>
          </div>

          {/* Ticket ID */}
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>ID Ticket</div>
            <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>#{ticket.id.slice(0, 12)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminMessageBubble({ sender, message, date, isAdmin }: {
  sender: string; message: string; date: string; isAdmin: boolean
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isAdmin ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '80%', padding: '14px 18px', borderRadius: 16,
        borderBottomLeftRadius: isAdmin ? 16 : 4,
        borderBottomRightRadius: isAdmin ? 4 : 16,
        background: isAdmin ? 'var(--accent2)' : '#2a2a2a',
        color: isAdmin ? '#fff' : '#ddd',
        border: isAdmin ? 'none' : '1px solid #333',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, marginBottom: 6,
          color: isAdmin ? 'rgba(255,255,255,0.8)' : '#888',
        }}>
          {sender}
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{message}</p>
      </div>
      <span style={{ fontSize: 10, color: '#666', marginTop: 4, padding: '0 8px' }}>
        {new Date(date).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
