'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewTicketPage() {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, description }),
    })

    if (res.ok) {
      const ticket = await res.json()
      router.push(`/support/${ticket.id}`)
    } else {
      setLoading(false)
      alert('Errore nella creazione del ticket')
    }
  }

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Nuovo Ticket</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>Hai bisogno di aiuto? Apri un ticket di supporto</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Oggetto</label>
          <input className="inp" value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Descrivi brevemente il problema" required />
        </div>
        <div className="field">
          <label>Descrizione</label>
          <textarea className="inp" rows={6} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Descrivi il problema in dettaglio..." required />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-p" type="submit" disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Invio...' : 'Invia Ticket'}
          </button>
          <button className="btn btn-s" type="button" onClick={() => router.push('/dashboard')}>Annulla</button>
        </div>
      </form>
    </div>
  )
}
