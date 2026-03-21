'use client'
import { useState, useEffect, useRef } from 'react'

type FacePhoto = { id: string; dataUrl: string }
type Model = {
  id: string; name: string; heightCm: number | null
  sizeTop: string | null; sizeBottom: string | null
  facePhotos: FacePhoto[]
}

const KEY = 'zuiki_models'

function load(): Model[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function persist(models: Model[]) {
  localStorage.setItem(KEY, JSON.stringify(models))
  // Sync face photos in old wizard format (zfp)
  const faces: Record<string, string[]> = {}
  // Sync models in old wizard format (zm)
  const oldMods = models.map(m => ({ nm: m.name, h: m.heightCm, st: m.sizeTop, sb: m.sizeBottom }))
  localStorage.setItem('zm', JSON.stringify(oldMods))
  models.forEach(m => {
    if (m.facePhotos.length > 0) faces[m.name] = m.facePhotos.map(p => p.dataUrl)
  })
  localStorage.setItem('zfp', JSON.stringify(faces))
}

function toDataUrl(file: File): Promise<string> {
  return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(file) })
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [height, setHeight] = useState('')
  const [sizeTop, setSizeTop] = useState('')
  const [sizeBottom, setSizeBottom] = useState('')
  const [newPhotos, setNewPhotos] = useState<FacePhoto[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const newFileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { setModels(load()) }, [])

  const save = (u: Model[]) => { setModels(u); persist(u) }

  const handleNewPhotos = async (files: FileList | null) => {
    if (!files) return
    const photos: FacePhoto[] = []
    for (let i = 0; i < files.length; i++) {
      photos.push({ id: `np_${Date.now()}_${i}`, dataUrl: await toDataUrl(files[i]) })
    }
    setNewPhotos(prev => [...prev, ...photos])
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    save([...models, {
      id: `m_${Date.now()}`, name,
      heightCm: height ? parseInt(height) : null,
      sizeTop: sizeTop || null, sizeBottom: sizeBottom || null,
      facePhotos: newPhotos,
    }])
    setName(''); setHeight(''); setSizeTop(''); setSizeBottom(''); setNewPhotos([])
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Eliminare questa modella?')) return
    save(models.filter(m => m.id !== id))
  }

  const addPhotos = async (modelId: string, files: FileList | null) => {
    if (!files) return
    setUploading(modelId)
    const photos: FacePhoto[] = []
    for (let i = 0; i < files.length; i++) {
      photos.push({ id: `p_${Date.now()}_${i}`, dataUrl: await toDataUrl(files[i]) })
    }
    save(models.map(m => m.id === modelId ? { ...m, facePhotos: [...m.facePhotos, ...photos] } : m))
    setUploading(null)
  }

  const removePhoto = (modelId: string, photoId: string) => {
    save(models.map(m => m.id === modelId ? { ...m, facePhotos: m.facePhotos.filter(p => p.id !== photoId) } : m))
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
                <label>Taglia parte superiore</label>
                <select className="inp" value={sizeTop} onChange={e => setSizeTop(e.target.value)}>
                  <option value="">Seleziona...</option>
                  {['XS','S','M','L','XL','XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Taglia parte inferiore</label>
                <select className="inp" value={sizeBottom} onChange={e => setSizeBottom(e.target.value)}>
                  <option value="">Seleziona...</option>
                  {['38','40','42','44','46','48','50','52'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Photo upload in creation form */}
            <div className="field">
              <label>Foto del viso</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 6 }}>
                {newPhotos.map(p => (
                  <div key={p.id} style={{ position: 'relative' }}>
                    <img src={p.dataUrl} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                    <button type="button" onClick={() => setNewPhotos(prev => prev.filter(x => x.id !== p.id))}
                      style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: 'var(--err)', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✕
                    </button>
                  </div>
                ))}
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} ref={newFileRef}
                  onChange={e => { handleNewPhotos(e.target.files); e.target.value = '' }} />
                <button type="button" onClick={() => newFileRef.current?.click()}
                  style={{ width: 64, height: 64, borderRadius: '50%', border: '2px dashed var(--border)', background: 'var(--subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--muted)' }}>
                  +
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Le foto del viso permettono all&apos;AI di riconoscere la modella nelle foto di catalogo</p>
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
                      <img src={p.dataUrl} alt="Foto viso" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                      <button onClick={() => removePhoto(m.id, p.id)}
                        style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: 'var(--err)', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                    ref={el => { fileRefs.current[m.id] = el }}
                    onChange={e => { addPhotos(m.id, e.target.files); e.target.value = '' }} />
                  <button onClick={() => fileRefs.current[m.id]?.click()} disabled={uploading === m.id}
                    style={{ width: 64, height: 64, borderRadius: '50%', border: '2px dashed var(--border)', background: 'var(--subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--muted)' }}>
                    {uploading === m.id ? '...' : '+'}
                  </button>
                </div>
                {m.facePhotos.length === 0 && (
                  <p style={{ fontSize: 12, color: '#b8860b', marginTop: 8 }}>
                    Aggiungi almeno una foto del viso per il riconoscimento AI
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
