'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Company = { id: string; name: string; slug: string; isActive: boolean; createdAt: string; _count: { users: number; shootingSessions: number } }

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '' })
  const [msg, setMsg] = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const loadCompanies = useCallback(() => {
    fetch('/api/companies').then(r => r.json()).then(d => {
      setCompanies(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }, [])

  useEffect(() => { loadCompanies() }, [loadCompanies])

  const autoSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const createCompany = async () => {
    if (!form.name.trim()) { flash('Inserisci il nome azienda'); return }
    const slug = form.slug.trim() || autoSlug(form.name)
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), slug }),
    })
    if (res.ok) {
      setForm({ name: '', slug: '' })
      setShowForm(false)
      loadCompanies()
      flash('Azienda creata')
    } else {
      const err = await res.json()
      flash(err.error || 'Errore nella creazione')
    }
  }

  return (
    <div className="animate-fadeUp">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Aziende</h1>
        <button className="btn btn-p" onClick={() => setShowForm(!showForm)}
          style={{ padding: '10px 20px', fontSize: 13 }}>
          {showForm ? 'Annulla' : '+ Nuova azienda'}
        </button>
      </div>

      {msg && (
        <div style={{
          background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8,
          padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#2e7d32', fontWeight: 600,
        }}>{msg}</div>
      )}

      {/* Create company form */}
      {showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 24, maxWidth: 500 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nuova azienda</h3>
          <div className="field">
            <label>Nome azienda</label>
            <input className="inp" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value, slug: form.slug || '' })}
              placeholder="Es. Fashion Brand S.r.l." />
          </div>
          <div className="field">
            <label>Slug (URL-friendly, auto-generato se vuoto)</label>
            <input className="inp" value={form.slug}
              onChange={e => setForm({ ...form, slug: e.target.value })}
              placeholder={form.name ? autoSlug(form.name) : 'es. fashion-brand'} />
          </div>
          <button className="btn btn-p" onClick={createCompany} style={{ padding: '10px 24px' }}>
            Crea azienda
          </button>
        </div>
      )}

      {/* Company list */}
      {loading ? <div className="spinner" /> : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="tbl">
            <thead><tr><th>Nome</th><th>Slug</th><th>Utenti</th><th>Sessioni</th><th>Stato</th><th></th></tr></thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td><code style={{ fontSize: 12 }}>{c.slug}</code></td>
                  <td>{c._count.users}</td>
                  <td>{c._count.shootingSessions}</td>
                  <td><span style={{ fontSize: 11, fontWeight: 700, color: c.isActive ? 'var(--ok)' : 'var(--err)' }}>{c.isActive ? 'Attiva' : 'Disattiva'}</span></td>
                  <td><Link href={`/admin/companies/${c.id}`} className="btn btn-s" style={{ textDecoration: 'none', padding: '4px 12px', fontSize: 11 }}>Dettagli</Link></td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>Nessuna azienda</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
