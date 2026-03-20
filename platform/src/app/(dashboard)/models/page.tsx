'use client'
import { useState, useEffect, useRef } from 'react'
import { getSignedUrl } from '@/lib/storage'

type FacePhoto = { id: string; photoUrl: string }
type Model = {
  id: string; name: string; heightCm: number | null
  sizeTop: string | null; sizeBottom: string | null
  facePhotos: FacePhoto[]
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
  const [uploading, setUploading] = useState<string | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const loadModels = () => {
    fetch('/api/models').then(r => r.json()).then(async (d) => {
      const models = Array.isArray(d) ? d : []
      setModels(models)
      setLoading(false)

      // Get signed URLs for face photos
      const urls: Record<string, string> = {}
      for (const model of models) {
        for (const photo of model.facePhotos) {
          try {
            const res = await fetch(`/api/files?path=${encodeURIComponent(photo.photoUrl)}`)
            const data = await res.json()
            if (data.url) urls[photo.id] = data.url
          } catch { /* ignore */ }
        }
      }
      setSignedUrls(urls)
    })
  }

  useEffect(() => { loadModels() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        heightCm: height ? parseInt(height) : null,
        sizeTop: sizeTop || null,
        sizeBottom: sizeBottom || null,
      }),
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

  const handlePhotoUpload = async (modelId: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(modelId)

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i])
    }

    await fetch(`/api/models/${modelId}/photos`, {
      method: 'POST',
      body: formData,
    })

    setUploading(null)
    loadModels()
  }

  const handlePhotoDelete = async (modelId: string, photoId: string) => {
    await fetch(`/api/models/${modelId}/photos?photoId=${photoId}`, { method: 'DELETE' })
    loadModels()
  }

  return (
    <div className="animate-fadeUp">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>Modelle</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Gestisci le modelle e le foto del viso per il riconoscimento AI</p>
        </div>
        <button className="btn btn-p" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Chiudi' : '+ Aggiungi Modella'}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {models.map(m => (
            <div key={m.id} className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{m.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    {m.heightCm ? `${m.heightCm} cm` : ''}
                    {m.sizeTop ? ` \u2022 Top: ${m.sizeTop}` : ''}
                    {m.sizeBottom ? ` \u2022 Bottom: ${m.sizeBottom}` : ''}
                    {!m.heightCm && !m.sizeTop && !m.sizeBottom ? 'Nessun dettaglio' : ''}
                  </div>
                </div>
                <button onClick={() => handleDelete(m.id)} className="btn btn-d" style={{ padding: '6px 14px', fontSize: 12 }}>
                  Elimina
                </button>
              </div>

              {/* Face photos section */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--muted)', marginBottom: 10 }}>
                  Foto del viso ({m.facePhotos.length})
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  {m.facePhotos.map(p => (
                    <div key={p.id} style={{ position: 'relative' }}>
                      {signedUrls[p.id] ? (
                        <img
                          src={signedUrls[p.id]}
                          alt="Foto viso"
                          className="face-thumb"
                          style={{ width: 64, height: 64 }}
                        />
                      ) : (
                        <div style={{
                          width: 64, height: 64, borderRadius: '50%', background: 'var(--subtle)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid var(--border)', fontSize: 10, color: 'var(--muted)',
                        }}>
                          Foto
                        </div>
                      )}
                      <button
                        onClick={() => handlePhotoDelete(m.id, p.id)}
                        style={{
                          position: 'absolute', top: -4, right: -4,
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'var(--err)', color: '#fff', border: 'none',
                          fontSize: 11, cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        \u2715
                      </button>
                    </div>
                  ))}

                  {/* Add photo button */}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    ref={el => { fileInputRefs.current[m.id] = el }}
                    onChange={e => handlePhotoUpload(m.id, e.target.files)}
                  />
                  <button
                    className="face-add"
                    style={{ width: 64, height: 64 }}
                    onClick={() => fileInputRefs.current[m.id]?.click()}
                    disabled={uploading === m.id}
                  >
                    {uploading === m.id ? (
                      <div className="animate-spin-custom" style={{ width: 18, height: 18 }} />
                    ) : (
                      '+'
                    )}
                  </button>
                </div>

                {m.facePhotos.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--warn)', marginTop: 8 }}>
                    Aggiungi almeno una foto del viso per il riconoscimento AI nelle sessioni
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
