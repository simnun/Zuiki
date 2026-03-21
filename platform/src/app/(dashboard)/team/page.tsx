'use client'
import { useState, useEffect, useCallback } from 'react'

interface TeamUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  createdAt: string
}

export default function TeamPage() {
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'user' })
  const [creating, setCreating] = useState(false)

  const flash = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(''), 2500) }

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user) setUser(d.user)
    })
  }, [])

  const loadUsers = useCallback(() => {
    fetch('/api/company/users').then(r => r.ok ? r.json() : []).then(d => {
      setUsers(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const isOwner = user?.role === 'owner'

  const createUser = async () => {
    const { email, password, firstName, lastName, role } = newUser
    if (!email || !password || !firstName || !lastName) { flash('Compila tutti i campi'); return }
    setCreating(true)
    const res = await fetch('/api/company/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName, role }),
    })
    if (res.ok) {
      setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'user' })
      setShowForm(false)
      loadUsers()
      flash('Utente creato con successo')
    } else {
      const err = await res.json()
      flash(err.error === 'Email already in use' ? 'Email gi\u00e0 in uso' : 'Errore nella creazione')
    }
    setCreating(false)
  }

  const toggleActive = async (u: TeamUser) => {
    const res = await fetch(`/api/company/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    if (res.ok) { loadUsers(); flash(u.isActive ? 'Utente disattivato' : 'Utente riattivato') }
  }

  const deleteUser = async (u: TeamUser) => {
    if (!confirm(`Eliminare l\u2019utente ${u.firstName} ${u.lastName}?`)) return
    const res = await fetch(`/api/company/users/${u.id}`, { method: 'DELETE' })
    if (res.ok) { loadUsers(); flash('Utente eliminato') }
  }

  const roleLabel: Record<string, string> = {
    owner: 'Proprietario', admin: 'Amministrativo', user: 'Utente',
  }
  const roleBg: Record<string, string> = {
    owner: 'var(--accent)', admin: '#e3f2fd', user: 'var(--subtle)',
  }
  const roleFg: Record<string, string> = {
    owner: '#fff', admin: '#1565c0', user: 'var(--text)',
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="animate-fadeUp">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Team</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{users.length} membr{users.length === 1 ? 'o' : 'i'} del team</p>
        </div>
        {isOwner && (
          <button className="btn btn-p" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Annulla' : '+ Aggiungi membro'}
          </button>
        )}
      </div>

      {saved && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
          {saved}
        </div>
      )}

      {/* New user form */}
      {showForm && isOwner && (
        <div className="card" style={{ padding: 28, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nuovo membro del team</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
            <div className="field">
              <label>Nome</label>
              <input className="inp" value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} placeholder="Mario" />
            </div>
            <div className="field">
              <label>Cognome</label>
              <input className="inp" value={newUser.lastName} onChange={e => setNewUser({ ...newUser, lastName: e.target.value })} placeholder="Rossi" />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="inp" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="mario@azienda.it" />
            </div>
            <div className="field">
              <label>Ruolo</label>
              <select className="inp" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="user">Utente</option>
                <option value="admin">Amministrativo</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 400 }}>
            <div className="field">
              <label>Password</label>
              <input className="inp" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 16 }}>
              <button className="btn btn-p" onClick={createUser} disabled={creating}>
                {creating ? 'Creazione...' : 'Crea utente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {users.map(u => (
          <div key={u.id} className="card" style={{ padding: 24, opacity: u.isActive ? 1 : 0.5, transition: 'opacity .2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: u.isActive ? 'var(--accent)' : 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 16, fontWeight: 700,
              }}>
                {u.firstName[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{u.firstName} {u.lastName}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: roleBg[u.role] || 'var(--subtle)',
                color: roleFg[u.role] || 'var(--text)',
              }}>
                {roleLabel[u.role] || u.role}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {u.isActive ? 'Attivo' : 'Disattivato'} &middot; Dal {new Date(u.createdAt).toLocaleDateString('it-IT')}
              </div>
              {isOwner && u.id !== user.id && u.role !== 'owner' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => toggleActive(u)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, color: u.isActive ? 'var(--warn)' : 'var(--ok)',
                  }}>
                    {u.isActive ? 'Disattiva' : 'Riattiva'}
                  </button>
                  <button onClick={() => deleteUser(u)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, color: 'var(--err)',
                  }}>
                    Elimina
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          Nessun membro nel team.
        </div>
      )}
    </div>
  )
}
