'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SEASONS = ['Primavera/Estate', 'Autunno/Inverno']
const SHOOT_TYPES = [
  { value: 'model', label: 'Con modella' },
  { value: 'mannequin', label: 'Manichino' },
  { value: 'still', label: 'Still life' },
  { value: 'mixed', label: 'Misto' },
]

type Model = { id: string; name: string; heightCm: number | null }

export default function NewSessionPage() {
  const router = useRouter()
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(false)

  const [brand, setBrand] = useState('zuiki')
  const [season, setSeason] = useState(SEASONS[0])
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [shootingDate, setShootingDate] = useState(new Date().toISOString().split('T')[0])
  const [shootType, setShootType] = useState('model')
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/models').then(r => r.json()).then(d => setModels(Array.isArray(d) ? d : []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand, season, year, shootingDate, shootType, modelIds: selectedModels }),
    })

    if (res.ok) {
      const session = await res.json()
      router.push(`/sessions/${session.id}`)
    } else {
      setLoading(false)
      alert('Errore nella creazione della sessione')
    }
  }

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Nuova Sessione</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>Configura una nuova sessione di shooting</p>

      <form onSubmit={handleSubmit}>
        {/* Brand */}
        <div className="field">
          <label>Brand</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {['zuiki', 'loveskin'].map(b => (
              <button key={b} type="button" className={`brand-btn ${brand === b ? 'active' : ''}`}
                onClick={() => setBrand(b)} style={{ flex: 1 }}>
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Stagione</label>
            <select className="inp" value={season} onChange={e => setSeason(e.target.value)}>
              {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Anno</label>
            <input className="inp" type="text" value={year} onChange={e => setYear(e.target.value)} />
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Data Shooting</label>
            <input className="inp" type="date" value={shootingDate} onChange={e => setShootingDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Tipo di Shooting</label>
            <select className="inp" value={shootType} onChange={e => setShootType(e.target.value)}>
              {SHOOT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Model selection */}
        {(shootType === 'model' || shootType === 'mixed') && (
          <div className="field">
            <label>Modelle</label>
            {models.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                Nessuna modella registrata. <a href="/models" style={{ color: 'var(--accent2)' }}>Aggiungine una</a>
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {models.map(m => {
                  const sel = selectedModels.includes(m.id)
                  return (
                    <button key={m.id} type="button" onClick={() => {
                      setSelectedModels(sel ? selectedModels.filter(x => x !== m.id) : [...selectedModels, m.id])
                    }} style={{
                      padding: '8px 16px', borderRadius: 8, border: `2px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                      background: sel ? 'var(--accent)' : 'var(--card)', color: sel ? '#fff' : 'var(--text)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                    }}>
                      {m.name} {m.heightCm ? `(${m.heightCm}cm)` : ''}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button className="btn btn-p" type="submit" disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Creazione...' : 'Crea Sessione'}
          </button>
          <button className="btn btn-s" type="button" onClick={() => router.push('/dashboard')}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  )
}
