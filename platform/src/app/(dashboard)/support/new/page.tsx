'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewTicketPage() {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!subject.trim() || !description.trim()) {
      setError('Compila tutti i campi')
      return
    }
    setLoading(true)

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), description: description.trim() }),
      })

      if (res.ok) {
        const ticket = await res.json()
        router.push(`/support/${ticket.id}`)
      } else {
        const err = await res.json().catch(() => null)
        setError(err?.error || 'Errore nella creazione del ticket')
        setLoading(false)
      }
    } catch {
      setError('Errore di rete. Riprova.')
      setLoading(false)
    }
  }

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 640 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
        <Link href="/support" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Supporto</Link>
        <span style={{ color: 'var(--muted)' }}>/</span>
        <span style={{ fontWeight: 600 }}>Nuovo Ticket</span>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Apri un ticket di supporto</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28 }}>
          Descrivi il tuo problema o la tua domanda nel modo più dettagliato possibile.
          Il nostro team ti risponderà al più presto.
        </p>

        {error && (
          <div style={{
            background: '#fce4ec', border: '1px solid #ef9a9a', borderRadius: 8,
            padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#c62828', fontWeight: 600,
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Oggetto</label>
            <input className="inp" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Es: Problema con il caricamento delle foto" required
              style={{ fontSize: 14 }} />
          </div>

          <div className="field">
            <label>Descrizione dettagliata</label>
            <textarea className="inp" rows={8} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Descrivi il problema passo per passo:&#10;&#10;1. Cosa stavi facendo?&#10;2. Cosa ti aspettavi che succedesse?&#10;3. Cosa è successo invece?&#10;&#10;Più dettagli fornisci, più velocemente potremo aiutarti."
              required style={{ fontSize: 14, lineHeight: 1.6, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-p" type="submit" disabled={loading}
              style={{ flex: 1, padding: '12px 20px', fontSize: 14 }}>
              {loading ? 'Invio in corso...' : 'Invia Ticket'}
            </button>
            <Link href="/support" className="btn btn-s"
              style={{ textDecoration: 'none', padding: '12px 20px', fontSize: 14, display: 'flex', alignItems: 'center' }}>
              Annulla
            </Link>
          </div>
        </form>
      </div>

      {/* Help hint */}
      <div style={{
        marginTop: 20, padding: '16px 20px', borderRadius: 12,
        background: 'var(--subtle)', border: '1px solid var(--border)', fontSize: 13,
      }}>
        <strong>Suggerimento:</strong> prima di aprire un ticket, controlla se la tua domanda trova risposta
        nelle <Link href="/support" style={{ color: 'var(--accent)' }}>richieste già aperte</Link>.
      </div>
    </div>
  )
}
