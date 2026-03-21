'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

type CompanyDetail = {
  id: string; name: string; slug: string; isActive: boolean
  users: { id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean }[]
  _count: { shootingSessions: number }
}

export default function CompanyDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [newUser, setNewUser] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'user' })
  const [msg, setMsg] = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  useEffect(() => {
    fetch(`/api/companies/${id}`).then(r => r.json()).then(d => {
      setCompany(d)
      setUsers(d.users || [])
    })
  }, [id])

  const loadUsers = useCallback(() => {
    fetch(`/api/companies/${id}/users`).then(r => r.ok ? r.json() : []).then(setUsers)
  }, [id])

  const createUser = async () => {
    const { email, password, firstName, lastName, role } = newUser
    if (!email || !password || !firstName || !lastName) { flash('Compila tutti i campi'); return }
    const res = await fetch(`/api/companies/${id}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName, role }),
    })
    if (res.ok) {
      setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'user' })
      loadUsers()
      flash('Utente creato')
    } else {
      const err = await res.json()
      flash(err.error === 'Email already in use' ? 'Email già in uso' : 'Errore')
    }
  }

  if (!company) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div className="animate-fadeUp">
      <button className="btn btn-s" onClick={() => router.push('/admin/companies')} style={{ marginBottom: 16, padding: '6px 12px', fontSize: 12 }}>← Indietro</button>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>{company.name}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Sessioni</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{company._count.shootingSessions}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Utenti</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{users.length}</div>
        </div>
      </div>

      {msg && (
        <div style={{
          background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8,
          padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#2e7d32', fontWeight: 600,
        }}>{msg}</div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Utenti</h2>
      <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
        <table className="tbl">
          <thead><tr><th>Nome</th><th>Email</th><th>Ruolo</th><th>Attivo</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                <td>{u.email}</td>
                <td>
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: u.role === 'owner' ? 'var(--accent)' : u.role === 'admin' ? '#e3f2fd' : 'var(--subtle)',
                    color: u.role === 'owner' ? '#fff' : u.role === 'admin' ? '#1565c0' : 'var(--text)',
                  }}>
                    {u.role === 'super_admin' ? 'Super Admin' : u.role === 'owner' ? 'Proprietario' : u.role === 'admin' ? 'Amministrativo' : 'Utente'}
                  </span>
                </td>
                <td style={{ color: u.isActive ? 'var(--ok)' : 'var(--err)', fontWeight: 700, fontSize: 12 }}>{u.isActive ? 'Si' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Aggiungi utente</h2>
      <div className="card" style={{ padding: 24, maxWidth: 600 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Nome</label>
            <input className="inp" value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} />
          </div>
          <div className="field">
            <label>Cognome</label>
            <input className="inp" value={newUser.lastName} onChange={e => setNewUser({ ...newUser, lastName: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Email</label>
          <input className="inp" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="nome@azienda.it" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Password</label>
            <input className="inp" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
          </div>
          <div className="field">
            <label>Ruolo</label>
            <select className="inp" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="user">Utente</option>
              <option value="admin">Amministrativo</option>
              <option value="owner">Proprietario</option>
            </select>
          </div>
        </div>
        <button className="btn btn-p" onClick={createUser}>Crea utente</button>
      </div>
    </div>
  )
}
