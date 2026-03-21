'use client'
import { useState, useEffect, useRef } from 'react'

// Same format as wizard (StepSetup) — stored in localStorage "zm"
type Modella = { nome: string; altezza: string; tagliaSopra: string; tagliaSotto: string }
// Face photos — stored in localStorage "zfp" as Record<nome, dataUrl[]>

const TL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const TS_SIZES = ['38', '40', '42', '44', '46', '48', '50', '52']

function loadMod(): Modella[] {
  try { return JSON.parse(localStorage.getItem('zm') || '[]') } catch { return [] }
}
function loadFaces(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem('zfp') || '{}') } catch { return {} }
}
function saveMod(mod: Modella[]) { localStorage.setItem('zm', JSON.stringify(mod)) }
function saveFaces(fp: Record<string, string[]>) { localStorage.setItem('zfp', JSON.stringify(fp)) }

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
  const [mod, setMod] = useState<Modella[]>([])
  const [facePh, setFacePh] = useState<Record<string, string[]>>({})
  const [showForm, setShowForm] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  // Form fields
  const [nome, setNome] = useState('')
  const [altezza, setAltezza] = useState('')
  const [tagliaSopra, setTagliaSopra] = useState('')
  const [tagliaSotto, setTagliaSotto] = useState('')
  const [tmpFaces, setTmpFaces] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)
  const addFileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => { setMod(loadMod()); setFacePh(loadFaces()) }, [])

  const resetForm = () => {
    setNome(''); setAltezza(''); setTagliaSopra(''); setTagliaSotto('')
    setTmpFaces([]); setEditIdx(null); setShowForm(false)
  }

  const openNew = () => {
    resetForm()
    setShowForm(true)
    setEditIdx(null)
  }

  const openEdit = (idx: number) => {
    const m = mod[idx]
    setNome(m.nome); setAltezza(m.altezza)
    setTagliaSopra(m.tagliaSopra); setTagliaSotto(m.tagliaSotto)
    setTmpFaces(facePh[m.nome] || [])
    setEditIdx(idx)
    setShowForm(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome || !altezza || !tagliaSopra || !tagliaSotto) {
      alert('Compila tutti i campi: nome, altezza, taglia sopra e taglia sotto')
      return
    }

    let newMod = [...mod]
    const newFp = { ...facePh }

    if (editIdx !== null) {
      // Editing existing: remove old face photos if name changed
      const oldName = mod[editIdx].nome
      if (oldName !== nome) {
        delete newFp[oldName]
      }
      newMod[editIdx] = { nome, altezza, tagliaSopra, tagliaSotto }
    } else {
      // Creating new: prevent duplicates
      newMod = [...newMod.filter(x => x.nome !== nome), { nome, altezza, tagliaSopra, tagliaSotto }]
    }

    // Save face photos
    if (tmpFaces.length > 0) {
      newFp[nome] = tmpFaces
    } else {
      delete newFp[nome]
    }

    saveMod(newMod); saveFaces(newFp)
    setMod(newMod); setFacePh(newFp)
    resetForm()
  }

  const handleDelete = (idx: number) => {
    if (!confirm('Eliminare questa modella?')) return
    const m = mod[idx]
    const newMod = mod.filter((_, i) => i !== idx)
    const newFp = { ...facePh }
    delete newFp[m.nome]
    saveMod(newMod); saveFaces(newFp)
    setMod(newMod); setFacePh(newFp)
    if (editIdx === idx) resetForm()
  }

  const addTmpFace = async (files: FileList | null) => {
    if (!files) return
    const newFaces = [...tmpFaces]
    for (let i = 0; i < files.length; i++) {
      newFaces.push(await resizeImg(files[i]))
    }
    setTmpFaces(newFaces)
  }

  const addFaceToExisting = async (idx: number, files: FileList | null) => {
    if (!files) return
    const m = mod[idx]
    const newFp = { ...facePh }
    if (!newFp[m.nome]) newFp[m.nome] = []
    for (let i = 0; i < files.length; i++) {
      newFp[m.nome] = [...newFp[m.nome], await resizeImg(files[i])]
    }
    saveFaces(newFp)
    setFacePh(newFp)
  }

  const removeFaceFromExisting = (nome: string, photoIdx: number) => {
    const newFp = { ...facePh }
    if (newFp[nome]) {
      newFp[nome] = newFp[nome].filter((_, i) => i !== photoIdx)
      if (!newFp[nome].length) delete newFp[nome]
      saveFaces(newFp)
      setFacePh(newFp)
    }
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

      {showForm && (
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            {editIdx !== null ? 'Modifica Modella' : 'Nuova Modella'}
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
                <label>Taglia parte inferiore</label>
                <select className="inp" value={tagliaSotto} onChange={e => setTagliaSotto(e.target.value)} required>
                  <option value="">Seleziona...</option>
                  {TS_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
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
                {editIdx !== null ? 'Salva modifiche' : 'Salva modella'}
              </button>
              <button className="btn btn-s" type="button" onClick={resetForm}>Annulla</button>
            </div>
          </form>
        </div>
      )}

      {mod.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nessuna modella registrata</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mod.map((m, idx) => {
            const photos = facePh[m.nome] || []
            return (
              <div key={m.nome} className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{m.nome}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                      {m.altezza} cm · {m.tagliaSopra} / {m.tagliaSotto}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(idx)} className="btn btn-s" style={{ padding: '6px 14px', fontSize: 12 }}>
                      Modifica
                    </button>
                    <button onClick={() => handleDelete(idx)} className="btn btn-d" style={{ padding: '6px 14px', fontSize: 12 }}>
                      Elimina
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--muted)', marginBottom: 10 }}>
                    Foto del viso ({photos.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    {photos.map((url, pi) => (
                      <div key={pi} style={{ position: 'relative' }}>
                        <img src={url} alt="Foto viso" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                        <button onClick={() => removeFaceFromExisting(m.nome, pi)}
                          style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: 'var(--err)', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                      ref={el => { addFileRefs.current[idx] = el }}
                      onChange={e => { addFaceToExisting(idx, e.target.files); e.target.value = '' }} />
                    <button onClick={() => addFileRefs.current[idx]?.click()}
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
