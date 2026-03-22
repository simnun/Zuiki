'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Message = { id: string; message: string; createdAt: string; sender: { firstName: string; lastName: string; role: string } }
type Ticket = {
  id: string; subject: string; description: string; status: string; createdAt: string
  createdBy: { firstName: string; lastName: string }; messages: Message[]
}

export default function AdminTicketDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')

  const load = () => {
    fetch(`/api/tickets/${id}`).then(r => r.json()).then(t => { setTicket(t); setStatus(t.status) })
  }

  useEffect(() => { load() }, [id])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: reply, status }),
    })
    setReply('')
    setSending(false)
    load()
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus)
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    load()
  }

  if (!ticket) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>

  const statusColor: Record<string, string> = { open: 'var(--warn)', in_progress: 'var(--accent2)', resolved: 'var(--ok)', closed: 'var(--muted)' }

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 700 }}>
      <button className="btn btn-s" onClick={() => router.push('/admin/tickets')} style={{ marginBottom: 16, padding: '6px 12px', fontSize: 12 }}>
        ← Indietro
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{ticket.subject}</h1>
        <select
          value={status}
          onChange={e => handleStatusChange(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            border: '1px solid var(--border)', background: 'var(--subtle)',
            color: statusColor[status] || 'var(--muted)', cursor: 'pointer',
          }}
        >
          <option value="open">open</option>
          <option value="in_progress">in_progress</option>
          <option value="resolved">resolved</option>
          <option value="closed">closed</option>
        </select>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 24 }}>
        Da: {ticket.createdBy.firstName} {ticket.createdBy.lastName} • {new Date(ticket.createdAt).toLocaleDateString('it-IT')}
      </p>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <p style={{ fontSize: 14, lineHeight: 1.7 }}>{ticket.description}</p>
      </div>

      {ticket.messages.map(m => (
        <div key={m.id} className="card" style={{
          padding: '14px 20px', marginBottom: 8,
          borderLeft: m.sender.role === 'super_admin' ? '3px solid var(--accent2)' : undefined,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {m.sender.firstName} {m.sender.lastName}
              {m.sender.role === 'super_admin' && <span style={{ fontSize: 10, color: 'var(--accent2)', marginLeft: 6 }}>ADMIN</span>}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(m.createdAt).toLocaleString('it-IT')}</span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>{m.message}</p>
        </div>
      ))}

      <form onSubmit={handleReply} style={{ marginTop: 16 }}>
        <textarea className="inp" rows={3} value={reply} onChange={e => setReply(e.target.value)}
          placeholder="Scrivi una risposta..." required />
        <button className="btn btn-p" type="submit" disabled={sending} style={{ marginTop: 8 }}>
          {sending ? 'Invio...' : 'Rispondi'}
        </button>
      </form>
    </div>
  )
}
