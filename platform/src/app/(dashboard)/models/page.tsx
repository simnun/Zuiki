'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type FacePhoto = { id: string; photoUrl: string }
type Model = { id: string; name: string; heightCm: number | null; sizeTop: string | null; sizeBottom: string | null; sizeBra: string | null; sizeShoe: string | null; facePhotos: FacePhoto[] }

const TL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const TL_SIZES_EXT = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
const TS_SIZES = ['38', '40', '42', '44', '46', '48', '50', '52']
const BRA_SIZES = ['2B', '2C', '3B', '3C', '4B', '4C']
const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41']

function resizeImg(file: File): Promise<string> {
  return new Promise(r => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 512
        let w = img.width, h = img.height
        if (w > max || h > max) {
          const ratio = Math.min(max / w, max / h)
          w = Math.round(w * ratio); h = Math.round(h * ratio)
        }
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        c.getContext('2d')!.drawImage(img, 0, 0, w, h)
        r(c.toDataURL('image/jpeg', 0.8))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  // Form fields
  const [nome, setNome] = useState('')
  const [altezza, setAltezza] = useState('')
  const [tagliaSopra, setTagliaSopra] = useState('')
  const [tagliaSotto, setTagliaSotto] = useState('')
  const [tagliaSottoLetter, setTagliaSottoLetter] = useState('')
  const [tagliaReggiseno, setTagliaReggiseno] = useState('')
  const [numeroScarpe, setNumeroScarpe] = useState('')
  const [tmpFaces, setTmpFaces] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)
  const addFileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const loadModels = useCallback(() => {
    fetch('/api/models').then(r => r.json()).then(d => {
      setModels(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadModels() }, [loadModels])

  const resetForm = () => {
    setNome(''); setAltezza(''); setTagliaSopra(''); setTagliaSotto('')
    setTagliaSottoLetter(''); setTagliaReggiseno(''); setNumeroScarpe('')
    setTmpFaces([]); setEditId(null); setShowForm(false)
  }

  const openNew = () => {
    resetForm()
    setShowForm(true)
    setEditId(null)
  }

  const openEdit = (m: Model) => {
    setNome(m.name)
    setAltezza(m.heightCm?.toString() || '')
    setTagliaSopra(m.sizeTop || '')
    // Split combined sizeBottom (e.g., "42/M") into numeric and letter parts
    const bottomParts = (m.sizeBottom || '').split('/')
    const numPart = bottomParts.find(p => /^\d+$/.test(p.trim())) || ''
    const letterPart = bottomParts.find(p => /^[A-Z]+$/i.test(p.trim())) || ''
    setTagliaSotto(numPart.trim())
    setTagliaSottoLetter(letterPart.trim())
    setTagliaReggiseno(m.sizeBra || '')
    setNumeroScarpe(m.sizeShoe || '')
    setTmpFaces(m.facePhotos.map(p => p.photoUrl))
    setEditId(m.id)
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome || !altezza || !tagliaSopra || (!tagliaSotto && !tagliaSottoLetter)) {
      flash('Compila tutti i campi: nome, altezza, taglia sopra e almeno una taglia sotto (numerica o lettera)')
      return
    }

    const sizeBottom = [tagliaSotto, tagliaSottoLetter].filter(Boolean).join('/')
    const body = { name: nome, heightCm: parseInt(altezza), sizeTop: tagliaSopra, sizeBottom, sizeBra: tagliaReggiseno || null, sizeShoe: numeroScarpe || null }

    try {
      let savedModel: Model
      if (editId) {
        const res = await fetch(`/api/models/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          flash(`Errore nel salvataggio: ${err?.error || res.statusText}`)
          return
        }
        savedModel = await res.json()
      } else {
        const res = await fetch('/api/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          flash(`Errore nella creazione: ${err?.error || res.statusText}`)
          return
        }
        savedModel = await res.json()
      }

      // Upload new face photos (those that are data URLs not already in DB)
      const existingUrls = new Set(savedModel.facePhotos.map(p => p.photoUrl))
      const newFaces = tmpFaces.filter(url => !existingUrls.has(url))

      if (newFaces.length > 0) {
        for (const dataUrl of newFaces) {
          const blob = await (await fetch(dataUrl)).blob()
          const formData = new FormData()
          formData.append('photos', new File([blob], 'face.jpg', { type: 'image/jpeg' }))
          await fetch(`/api/models/${savedModel.id}/photos`, { method: 'POST', body: formData })
        }
      }

      // Delete removed face photos
      const keptUrls = new Set(tmpFaces)
      for (const photo of savedModel.facePhotos) {
        if (!keptUrls.has(photo.photoUrl)) {
          await fetch(`/api/models/${savedModel.id}/photos?photoId=${photo.id}`, { method: 'DELETE' })
        }
      }

      loadModels()
      resetForm()
      flash(editId ? 'Modella aggiornata' : 'Modella creata')
    } catch {
      flash('Errore di rete')
    }
  }

  const handleDelete = async (m: Model) => {
    if (!confirm('Eliminare questa modella?')) return
    try {
      const res = await fetch(`/api/models/${m.id}`, { method: 'DELETE' })
      if (res.ok) {
        loadModels()
        if (editId === m.id) resetForm()
        flash('Modella eliminata')
      } else {
        flash('Errore nella cancellazione')
      }
    } catch {
      flash('Errore di rete')
    }
  }

  const addTmpFace = async (files: FileList | null) => {
    if (!files) return
    const newFaces = [...tmpFaces]
    for (let i = 0; i < files.length; i++) {
      newFaces.push(await resizeImg(files[i]))
    }
    setTmpFaces(newFaces)
  }

  const addFaceToExisting = async (model: Model, files: FileList | null) => {
    if (!files) return
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      const blob = await (await fetch(await resizeImg(files[i]))).blob()
      formData.append('photos', new File([blob], 'face.jpg', { type: 'image/jpeg' }))
    }
    const res = await fetch(`/api/models/${model.id}/photos`, { method: 'POST', body: formData })
    if (res.ok) loadModels()
  }

  const removeFaceFromExisting = async (model: Model, photo: FacePhoto) => {
    const res = await fetch(`/api/models/${model.id}/photos?photoId=${photo.id}`, { method: 'DELETE' })
    if (res.ok) loadModels()
  }

  return (
    <div className="animate-fadeUp">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>Modelle</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Gestisci le modelle e le foto del viso per il riconoscimento AI</p>
        </div>
        <button className="btn btn-p" onClick={() => showForm ? resetForm() : openNew()}>
          {showForm ? 'Chiudi' : '+ Aggiungi Modella'}
        </button>
      </div>

      {msg && (
        <div style={{
          background: msg.startsWith('Errore') ? '#fce4ec' : '#e8f5e9',
          border: `1px solid ${msg.startsWith('Errore') ? '#ef9a9a' : '#a5d6a7'}`,
          borderRadius: 8,
          padding: '10px 16px', marginBottom: 20, fontSize: 13,
          color: msg.startsWith('Errore') ? '#c62828' : '#2e7d32', fontWeight: 600,
        }}>{msg}</div>
      )}

      {showForm && (
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            {editId ? 'Modifica Modella' : 'Nuova Modella'}
          </h3>
          <form onSubmit={handleSave}>
            <div className="grid2">
              <div className="field">
                <label>Nome modella</label>
                <input className="inp" value={nome} onChange={e => setNome(e.target.value)} placeholder="Es. Valentina" required />
              </div>
              <div className="field">
                <label>Altezza (cm)</label>
                <input className="inp" type="number" value={altezza} onChange={e => setAltezza(e.target.value)} placeholder="173" required />
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>Taglia parte superiore</label>
                <select className="inp" value={tagliaSopra} onChange={e => setTagliaSopra(e.target.value)} required>
                  <option value="">Seleziona...</option>
                  {TL_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Taglia parte inferiore (numerica)</label>
                <select className="inp" value={tagliaSotto} onChange={e => setTagliaSotto(e.target.value)}>
                  <option value="">Seleziona...</option>
                  {TS_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>Taglia parte inferiore (lettera)</label>
                <select className="inp" value={tagliaSottoLetter} onChange={e => setTagliaSottoLetter(e.target.value)}>
                  <option value="">Seleziona...</option>
                  {TL_SIZES_EXT.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>Taglia reggiseno</label>
                <select className="inp" value={tagliaReggiseno} onChange={e => setTagliaReggiseno(e.target.value)}>
                  <option value="">Seleziona...</option>
                  {BRA_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Numero scarpe</label>
                <select className="inp" value={numeroScarpe} onChange={e => setNumeroScarpe(e.target.value)}>
                  <option value="">Seleziona...</option>
                  {SHOE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Foto volto (per riconoscimento)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 6 }}>
                {tmpFaces.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={url} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                    <button type="button" onClick={() => setTmpFaces(tmpFaces.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: 'var(--err)', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✕
                    </button>
                  </div>
                ))}
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} ref={fileRef}
                  onChange={e => { addTmpFace(e.target.files); e.target.value = '' }} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ width: 64, height: 64, borderRadius: '50%', border: '2px dashed var(--border)', background: 'var(--subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--muted)' }}>
                  +
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Carica 1+ foto del volto per identificare la modella nelle foto dei capi</p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-p" type="submit">
                {editId ? 'Salva modifiche' : 'Salva modella'}
              </button>
              <button className="btn btn-s" type="button" onClick={resetForm}>Annulla</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="spinner" /> : models.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nessuna modella registrata</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {models.map(m => {
            const photos = m.facePhotos || []
            return (
              <div key={m.id} className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                      {m.heightCm} cm · {m.sizeTop} / {m.sizeBottom}{m.sizeBra ? ` · Reggiseno ${m.sizeBra}` : ''}{m.sizeShoe ? ` · Scarpe ${m.sizeShoe}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(m)} className="btn btn-s" style={{ padding: '6px 14px', fontSize: 12 }}>
                      Modifica
                    </button>
                    <button onClick={() => handleDelete(m)} className="btn btn-d" style={{ padding: '6px 14px', fontSize: 12 }}>
                      Elimina
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--muted)', marginBottom: 10 }}>
                    Foto del viso ({photos.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    {photos.map(photo => (
                      <div key={photo.id} style={{ position: 'relative' }}>
                        <img src={photo.photoUrl} alt="Foto viso" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                        <button onClick={() => removeFaceFromExisting(m, photo)}
                          style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: 'var(--err)', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                      ref={el => { addFileRefs.current[m.id] = el }}
                      onChange={e => { addFaceToExisting(m, e.target.files); e.target.value = '' }} />
                    <button onClick={() => addFileRefs.current[m.id]?.click()}
                      style={{ width: 64, height: 64, borderRadius: '50%', border: '2px dashed var(--border)', background: 'var(--subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--muted)' }}>
                      +
                    </button>
                  </div>
                  {photos.length === 0 && (
                    <p style={{ fontSize: 12, color: '#b8860b', marginTop: 8 }}>
                      Aggiungi almeno una foto del viso per il riconoscimento AI
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
