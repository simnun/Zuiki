'use client'
import { useState, useEffect } from 'react'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [stats, setStats] = useState({ sessions: 0, items: 0, since: '' })

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user) {
        setUser(d.user)
        setFirstName(d.user.firstName || '')
        setLastName(d.user.lastName || '')
        setEmail(d.user.email || '')
      }
    })
    // Load user stats
    fetch('/api/profile/stats').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setStats(d)
    }).catch(() => {})
  }, [])

  const flash = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(''), 2500) }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone }),
      })
      flash(res.ok ? 'Profilo aggiornato' : 'Errore nel salvataggio')
    } catch { flash('Errore di rete') }
    setSaving(false)
  }

  const roleLabel: Record<string, string> = {
    owner: 'Proprietario', admin: 'Amministrativo', user: 'Utente', super_admin: 'Super Admin',
  }

  if (!user) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="animate-fadeUp">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Il mio profilo</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>Gestisci le tue informazioni personali</p>

      {saved && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
          {saved}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        {/* Profile form */}
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Informazioni personali</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label>Nome</label>
              <input className="inp" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="field">
              <label>Cognome</label>
              <input className="inp" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Email</label>
            <input className="inp" type="email" value={email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>L&apos;email non pu&ograve; essere modificata</div>
          </div>

          <div className="field">
            <label>Telefono</label>
            <input className="inp" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+39 333 1234567" />
          </div>

          <button className="btn btn-p" onClick={saveProfile} disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva profilo'}
          </button>
        </div>

        {/* Stats sidebar */}
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 22, fontWeight: 700,
              }}>
                {(firstName || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{firstName} {lastName}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{email}</div>
              </div>
            </div>
            <div style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: user.role === 'owner' ? 'var(--accent)' : user.role === 'admin' ? '#e3f2fd' : 'var(--subtle)',
              color: user.role === 'owner' ? '#fff' : user.role === 'admin' ? '#1565c0' : 'var(--text)',
            }}>
              {roleLabel[user.role] || user.role}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Attivit&agrave;</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Sessioni create</span>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{stats.sessions}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Prodotti catalogati</span>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{stats.items}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Iscritto dal</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{stats.since || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
