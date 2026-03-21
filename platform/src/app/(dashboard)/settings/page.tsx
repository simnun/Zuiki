'use client'
import { useState, useEffect, useCallback } from 'react'

type Tab = 'profilo' | 'azienda' | 'crediti' | 'api' | 'utenti'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profilo')
  const [user, setUser] = useState<any>(null)
  const [saved, setSaved] = useState('')

  // Profile
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  // Company
  const [company, setCompany] = useState<any>(null)
  const [coName, setCoName] = useState('')
  const [coVat, setCoVat] = useState('')
  const [coAddress, setCoAddress] = useState('')
  const [coBillingEmail, setCoBillingEmail] = useState('')

  // API Key
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  // Users (owner)
  const [users, setUsers] = useState<any[]>([])
  const [newUser, setNewUser] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'user' })

  const flash = (msg: string) => {
    setSaved(msg)
    setTimeout(() => setSaved(''), 2500)
  }

  // Load session
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user) {
        setUser(d.user)
        setFirstName(d.user.firstName || '')
        setLastName(d.user.lastName || '')
        setEmail(d.user.email || '')
      }
    })
  }, [])

  // Load company data (owner/admin)
  useEffect(() => {
    if (!user) return
    if (['owner', 'admin'].includes(user.role)) {
      fetch('/api/company/profile').then(r => r.ok ? r.json() : null).then(d => {
        if (d) {
          setCompany(d)
          setCoName(d.name || '')
          setCoVat(d.vatNumber || '')
          setCoAddress(d.billingAddress || '')
          setCoBillingEmail(d.billingEmail || '')
        }
      })
    }
    // Load API key (owner/user)
    if (['owner', 'user'].includes(user.role)) {
      fetch('/api/company/apikey').then(r => r.ok ? r.json() : null).then(d => {
        if (d) setApiKey(d.apiKey || '')
      })
    }
    // Load users (owner)
    if (user.role === 'owner') {
      loadUsers()
    }
  }, [user])

  const loadUsers = useCallback(() => {
    fetch('/api/company/users').then(r => r.ok ? r.json() : []).then(setUsers)
  }, [])

  const role = user?.role || ''

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'profilo', label: 'Profilo', show: true },
    { key: 'azienda', label: 'Azienda', show: ['owner', 'admin'].includes(role) },
    { key: 'crediti', label: 'Piano e Crediti', show: ['owner', 'admin'].includes(role) },
    { key: 'api', label: 'API Key', show: ['owner', 'user'].includes(role) },
    { key: 'utenti', label: 'Gestione Utenti', show: role === 'owner' },
  ]

  const visibleTabs = tabs.filter(t => t.show)

  const saveProfile = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName }),
      })
      flash(res.ok ? 'Profilo salvato' : 'Errore nel salvataggio')
    } catch {
      flash('Errore di rete')
    }
  }

  const saveCompany = async () => {
    try {
      const res = await fetch('/api/company/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: coName, vatNumber: coVat, billingAddress: coAddress, billingEmail: coBillingEmail }),
      })
      flash(res.ok ? 'Dati azienda salvati' : 'Errore nel salvataggio')
    } catch {
      flash('Errore di rete')
    }
  }

  const saveApiKey = async () => {
    await fetch('/api/company/apikey', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKey.trim() || null }),
    })
    flash(apiKey.trim() ? 'API Key salvata' : 'API Key rimossa')
  }

  const createUser = async () => {
    const { email, password, firstName, lastName, role } = newUser
    if (!email || !password || !firstName || !lastName) {
      flash('Compila tutti i campi')
      return
    }
    const res = await fetch('/api/company/users', {
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
      flash(err.error === 'Email already in use' ? 'Email già in uso' : 'Errore nella creazione')
    }
  }

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Eliminare l'utente ${name}?`)) return
    const res = await fetch(`/api/company/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      loadUsers()
      flash('Utente eliminato')
    }
  }

  if (!user) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="animate-fadeUp">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Impostazioni</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>
        Gestisci il tuo profilo, l&apos;azienda e le configurazioni
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: '2px solid var(--border)', overflowX: 'auto' }}>
        {visibleTabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '12px 24px', fontSize: 14, fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer',
            color: tab === t.key ? 'var(--accent)' : 'var(--muted)',
            borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -2, transition: 'all .15s',
            fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Toast */}
      {saved && (
        <div style={{
          background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8,
          padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#2e7d32', fontWeight: 600,
        }}>
          {saved}
        </div>
      )}

      {/* Profilo */}
      {tab === 'profilo' && (
        <div className="card" style={{ padding: 32, maxWidth: 600 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Il tuo profilo</h3>
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
            <input className="inp" type="email" value={email} disabled style={{ opacity: 0.6 }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            Ruolo: <strong>{role === 'owner' ? 'Proprietario' : role === 'admin' ? 'Amministrativo' : role === 'user' ? 'Utente' : role}</strong>
          </div>
          <button className="btn btn-p" onClick={saveProfile}>Salva profilo</button>
        </div>
      )}

      {/* Azienda */}
      {tab === 'azienda' && ['owner', 'admin'].includes(role) && (
        <div className="card" style={{ padding: 32, maxWidth: 600 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Dati azienda e fatturazione</h3>
          <div className="field">
            <label>Nome azienda</label>
            <input className="inp" value={coName} onChange={e => setCoName(e.target.value)} />
          </div>
          <div className="field">
            <label>Partita IVA</label>
            <input className="inp" value={coVat} onChange={e => setCoVat(e.target.value)} placeholder="IT01234567890" />
          </div>
          <div className="field">
            <label>Indirizzo fatturazione</label>
            <input className="inp" value={coAddress} onChange={e => setCoAddress(e.target.value)} placeholder="Via Roma 1, 20100 Milano" />
          </div>
          <div className="field">
            <label>Email fatturazione</label>
            <input className="inp" type="email" value={coBillingEmail} onChange={e => setCoBillingEmail(e.target.value)} placeholder="fatture@azienda.it" />
          </div>
          <button className="btn btn-p" onClick={saveCompany}>Salva dati azienda</button>
        </div>
      )}

      {/* Crediti */}
      {tab === 'crediti' && ['owner', 'admin'].includes(role) && company && (
        <div className="card" style={{ padding: 32, maxWidth: 600 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Piano e crediti</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'var(--subtle)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>PIANO ATTIVO</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{company.pricingPlan || 'Base'}</div>
            </div>
            <div style={{ background: 'var(--subtle)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>CREDITI DISPONIBILI</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
                {Number(company.walletCredits || 0).toFixed(2)} &euro;
              </div>
            </div>
            <div style={{ background: 'var(--subtle)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>CREDITI UTILIZZATI</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {Number(company.usedCredits || 0).toFixed(2)} &euro;
              </div>
            </div>
            <div style={{ background: 'var(--subtle)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>RINNOVO CREDITI</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {company.creditRenewalDate
                  ? new Date(company.creditRenewalDate).toLocaleDateString('it-IT')
                  : '—'}
              </div>
            </div>
          </div>

          {/* Credit usage bar */}
          {(() => {
            const total = Number(company.walletCredits || 0) + Number(company.usedCredits || 0)
            const pct = total > 0 ? (Number(company.usedCredits || 0) / total) * 100 : 0
            return total > 0 ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                  Utilizzo: {pct.toFixed(0)}% del credito totale
                </div>
                <div style={{ background: 'var(--border)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 6,
                    background: pct > 80 ? 'var(--err)' : 'var(--accent)',
                    transition: 'width .3s',
                  }} />
                </div>
              </div>
            ) : null
          })()}

          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            Per ricaricare i crediti o cambiare piano, contatta il supporto.
          </p>
        </div>
      )}

      {/* API Key */}
      {tab === 'api' && ['owner', 'user'].includes(role) && (
        <div className="card" style={{ padding: 32, maxWidth: 600 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>API Key Anthropic</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
            La chiave API di Anthropic (Claude) è necessaria per il funzionamento del catalogo AI.
            Questa chiave è condivisa con tutti gli utenti della tua azienda.
          </p>

          <div className="field">
            <label>API KEY</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="inp" type={showKey ? 'text' : 'password'} value={apiKey}
                onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-api03-..." style={{ flex: 1 }}
              />
              <button className="btn btn-s" type="button" onClick={() => setShowKey(!showKey)}
                style={{ padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                {showKey ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
          </div>

          <div style={{
            background: 'var(--subtle)', borderRadius: 10, padding: '14px 16px',
            marginBottom: 20, border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Come ottenere la API Key</div>
            <ol style={{ fontSize: 12, color: 'var(--muted)', margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Vai su <strong>console.anthropic.com</strong></li>
              <li>Crea un account o accedi</li>
              <li>Vai in <strong>API Keys</strong> e crea una nuova chiave</li>
              <li>Copia la chiave e incollala qui sopra</li>
            </ol>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-p" onClick={saveApiKey}>Salva API Key</button>
            {apiKey && <span style={{ fontSize: 12, color: '#2e7d32', fontWeight: 600 }}>Chiave configurata</span>}
            {!apiKey && <span style={{ fontSize: 12, color: 'var(--err)', fontWeight: 600 }}>Chiave mancante</span>}
          </div>
        </div>
      )}

      {/* Gestione Utenti (owner only) */}
      {tab === 'utenti' && role === 'owner' && (
        <div>
          {/* Existing users */}
          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Utenti azienda</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--muted)', fontSize: 11 }}>NOME</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--muted)', fontSize: 11 }}>EMAIL</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--muted)', fontSize: 11 }}>RUOLO</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600, color: 'var(--muted)', fontSize: 11 }}>AZIONI</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{u.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: u.role === 'owner' ? 'var(--accent)' : u.role === 'admin' ? '#e3f2fd' : 'var(--subtle)',
                        color: u.role === 'owner' ? '#fff' : u.role === 'admin' ? '#1565c0' : 'var(--text)',
                      }}>
                        {u.role === 'owner' ? 'Proprietario' : u.role === 'admin' ? 'Amministrativo' : 'Utente'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {u.id !== user.id && u.role !== 'owner' && (
                        <button onClick={() => deleteUser(u.id, `${u.firstName} ${u.lastName}`)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 12, color: 'var(--err)', fontWeight: 600,
                        }}>
                          Elimina
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* New user form */}
          <div className="card" style={{ padding: 32, maxWidth: 600 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Aggiungi utente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label>Nome</label>
                <input className="inp" value={newUser.firstName}
                  onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} />
              </div>
              <div className="field">
                <label>Cognome</label>
                <input className="inp" value={newUser.lastName}
                  onChange={e => setNewUser({ ...newUser, lastName: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Email</label>
              <input className="inp" type="email" value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="nome@azienda.it" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label>Password</label>
                <input className="inp" type="password" value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
              </div>
              <div className="field">
                <label>Ruolo</label>
                <select className="inp" value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="user">Utente</option>
                  <option value="admin">Amministrativo</option>
                </select>
              </div>
            </div>
            <button className="btn btn-p" onClick={createUser}>Crea utente</button>
          </div>
        </div>
      )}
    </div>
  )
}
