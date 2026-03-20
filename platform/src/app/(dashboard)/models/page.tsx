'use client'
import { useState, useEffect, useRef } from 'react'

type FacePhoto = { id: string; dataUrl: string }
type Model = {
  id: string; name: string; heightCm: number | null
  sizeTop: string | null; sizeBottom: string | null
  facePhotos: FacePhoto[]
}

const STORAGE_KEY = 'zm'
const FACES_KEY = 'zfp'

function loadModels(): Model[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const old = JSON.parse(raw)
    if (!Array.isArray(old)) return []
    const faces = JSON.parse(localStorage.getItem(FACES_KEY) || '{}')
    // Support old format (array of {nm, h, ...}) and new format
    return old.map((m: any, i: number) => {
      const name = m.nm || m.name || ''
      return {
        id: m.id || `m_${i}`,
        name,
        heightCm: m.h || m.heightCm || null,
        sizeTop: m.st || m.sizeTop || null,
        sizeBottom: m.sb || m.sizeBottom || null,
        facePhotos: (m.facePhotos || (faces[name] || []).map((url: string, j: number) => ({
          id: `p_${i}_${j}`,
          dataUrl: url,
        }))),
      }
    })
  } catch { return [] }
}

function saveModels(models: Model[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(models))
  // Also save in old format for compatibility with wizard
  const faces: Record<string, string[]> = {}
  models.forEach(m => {
    if (m.facePhotos.length > 0) {
      faces[m.name] = m.facePhotos.map(p => p.dataUrl)
    }
  })
  localStorage.setItem(FACES_KEY, JSON.stringify(faces))
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [height, setHeight] = useState('')
  const [sizeTop, setSizeTop] = useState('')
  const [sizeBottom, setSizeBottom] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => { setModels(loadModels()) }, [])

  const save = (updated: Model[]) => {
    setModels(updated)
    saveModels(updated)
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const m: Model = {
      id: `m_${Date.now()}`,
      name,
      heightCm: height ? parseInt(height) : null,
      sizeTop: sizeTop || null,
      sizeBottom: sizeBottom || null,
      facePhotos: [],
    }
    save([...models, m])
    setName(''); setHeight(''); setSizeTop(''); setSizeBottom('')
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Eliminare questa modella?')) return
    save(models.filter(m => m.id !== id))
  }

  const handlePhotoUpload = async (modelId: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(modelId)

    const newPhotos: FacePhoto[] = []
    for (let i = 0; i < files.length; i++) {
      const dataUrl = await fileToDataUrl(files[i])
      newPhotos.push({ id: `p_${Date.now()}_${i}`, dataUrl })
    }

    save(models.map(m =>
      m.id === modelId
        ? { ...m, facePhotos: [...m.facePhotos, ...newPhotos] }
        : m
    ))
    setUploading(null)
  }

  const handlePhotoDelete = (modelId: string, photoId: string) => {
    save(models.map(m =>
      m.id === modelId
        ? { ...m, facePhotos: m.facePhotos.filter(p => p.id !== photoId) }
        : m
    ))
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
            <button className="btn btn-p" type="submit">Salva Modella</button>
          </form>
        </div>
      )}

      {models.length === 0 ? (
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
                    {m.sizeTop ? ` · Top: ${m.sizeTop}` : ''}
                    {m.sizeBottom ? ` · Bottom: ${m.sizeBottom}` : ''}
                    {!m.heightCm && !m.sizeTop && !m.sizeBottom ? 'Nessun dettaglio' : ''}
                  </div>
                </div>
                <button onClick={() => handleDelete(m.id)} className="btn btn-d" style={{ padding: '6px 14px', fontSize: 12 }}>
                  Elimina
                </button>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--muted)', marginBottom: 10 }}>
                  Foto del viso ({m.facePhotos.length})
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  {m.facePhotos.map(p => (
                    <div key={p.id} style={{ position: 'relative' }}>
                      <img
                        src={p.dataUrl}
                        alt="Foto viso"
                        style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
                      />
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
                        ✕
                      </button>
                    </div>
                  ))}

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    ref={el => { fileInputRefs.current[m.id] = el }}
                    onChange={e => { handlePhotoUpload(m.id, e.target.files); e.target.value = '' }}
                  />
                  <button
                    onClick={() => fileInputRefs.current[m.id]?.click()}
                    disabled={uploading === m.id}
                    style={{
                      width: 64, height: 64, borderRadius: '50%',
                      border: '2px dashed var(--border)', background: 'var(--subtle)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 22, color: 'var(--muted)',
                      transition: 'border-color .2s',
                    }}
                  >
                    {uploading === m.id ? '...' : '+'}
                  </button>
                </div>

                {m.facePhotos.length === 0 && (
                  <p style={{ fontSize: 12, color: '#b8860b', marginTop: 8 }}>
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
