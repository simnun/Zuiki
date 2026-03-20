'use client'
import { useState, useEffect } from 'react'

type Model = {
  id: string; name: string; heightCm: number | null
  sizeTop: string | null; sizeBottom: string | null
  facePhotos: { id: string; photoUrl: string }[]
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [height, setHeight] = useState('')
  const [sizeTop, setSizeTop] = useState('')
  const [sizeBottom, setSizeBottom] = useState('')
  const [saving, setSaving] = useState(false)

  const loadModels = () => {
    fetch('/api/models').then(r => r.json()).then(d => { setModels(Array.isArray(d) ? d : []); setLoading(false) })
  }

  useEffect(() => { loadModels() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, heightCm: height ? parseInt(height) : null, sizeTop: sizeTop || null, sizeBottom: sizeBottom || null }),
    })
    if (res.ok) {
      setName(''); setHeight(''); setSizeTop(''); setSizeBottom('')
      setShowForm(false)
      loadModels()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa modella?')) return
    await fetch(`/api/models/${id}`, { method: 'DELETE' })
    loadModels()
  }

  return (
    <div className="animate-fadeUp">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>Modelle</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Gestisci le modelle per il riconoscimento AI</p>
        </div>
        <button className="btn btn-p" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Chiudi' : '+ Aggiungi'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nuova Modella</h3>
          <form onSubmit={handleAdd}>
            <div className="grid2">
              <div className="field">
                <label>Nome</label>
                <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Es. Sofia" required />
              </div>
              <div className="field">
                <label>Altezza (cm)</label>
                <input className="inp" type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" />
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>Taglia sopra</label>
                <input className="inp" value={sizeTop} onChange={e => setSizeTop(e.target.value)} placeholder="S" />
              </div>
              <div className="field">
                <label>Taglia sotto</label>
                <input className="inp" value={sizeBottom} onChange={e => setSizeBottom(e.target.value)} placeholder="40" />
              </div>
            </div>
            <button className="btn btn-p" type="submit" disabled={saving}>
              {saving ? 'Salvataggio...' : 'Salva Modella'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : models.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nessuna modella registrata</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {models.map(m => (
            <div key={m.id} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {m.heightCm ? `${m.heightCm} cm` : ''}
                    {m.sizeTop ? ` • Top: ${m.sizeTop}` : ''}
                    {m.sizeBottom ? ` • Bottom: ${m.sizeBottom}` : ''}
                  </div>
                </div>
                <button onClick={() => handleDelete(m.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--err)',
                }}>✕</button>
              </div>
              {m.facePhotos.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  {m.facePhotos.map(p => (
                    <img key={p.id} src={p.photoUrl} className="face-thumb" alt="" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
