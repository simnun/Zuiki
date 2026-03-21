'use client'
import { useState, useEffect } from 'react'

type Tab = 'profilo' | 'azienda' | 'api'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profilo')
  const [user, setUser] = useState<any>(null)
  // Profile fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  // Company fields
  const [companyName, setCompanyName] = useState('')
  const [companyVat, setCompanyVat] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  // API key
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState('')

  useEffect(() => {
    // Load user from session
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user) {
        setUser(d.user)
        setFirstName(d.user.firstName || '')
        setLastName(d.user.lastName || '')
        setEmail(d.user.email || '')
      }
    })
    // Load API key from localStorage
    setApiKey(localStorage.getItem('za') || '')
    // Load company info from localStorage
    const co = JSON.parse(localStorage.getItem('zuiki_company') || '{}')
    setCompanyName(co.name || '')
    setCompanyVat(co.vat || '')
    setCompanyAddress(co.address || '')
  }, [])

  const flash = (msg: string) => {
    setSaved(msg)
    setTimeout(() => setSaved(''), 2000)
  }

  const saveProfile = () => {
    localStorage.setItem('zuiki_profile', JSON.stringify({ firstName, lastName, email }))
    flash('Profilo salvato')
  }

  const saveCompany = () => {
    localStorage.setItem('zuiki_company', JSON.stringify({ name: companyName, vat: companyVat, address: companyAddress }))
    flash('Dati azienda salvati')
  }

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('za', apiKey.trim())
      flash('API Key salvata')
    } else {
      localStorage.removeItem('za')
      flash('API Key rimossa')
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profilo', label: 'Profilo' },
    { key: 'azienda', label: 'Azienda' },
    { key: 'api', label: 'API Key' },
  ]

  return (
    <div className="animate-fadeUp">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Impostazioni</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>Gestisci il tuo profilo, l&apos;azienda e le configurazioni</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: '2px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '12px 24px', fontSize: 14, fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer',
            color: tab === t.key ? 'var(--accent)' : 'var(--muted)',
            borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -2, transition: 'all .15s',
            fontFamily: 'Outfit, sans-serif',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Success toast */}
      {saved && (
        <div style={{
          background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8,
          padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#2e7d32', fontWeight: 600,
        }}>
          {saved}
        </div>
      )}

      {/* Profile tab */}
      {tab === 'profilo' && (
        <div className="card" style={{ padding: 32, maxWidth: 600 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Il tuo profilo</h3>
          <div className="grid2">
            <div className="field">
              <label>Nome</label>
              <input className="inp" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Mario" />
            </div>
            <div className="field">
              <label>Cognome</label>
              <input className="inp" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Rossi" />
            </div>
          </div>
          <div className="field">
            <label>Email</label>
            <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mario@azienda.it" />
          </div>
          <button className="btn btn-p" onClick={saveProfile}>Salva profilo</button>
        </div>
      )}

      {/* Company tab */}
      {tab === 'azienda' && (
        <div className="card" style={{ padding: 32, maxWidth: 600 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Dati azienda</h3>
          <div className="field">
            <label>Nome azienda</label>
            <input className="inp" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Zuiki S.r.l." />
          </div>
          <div className="field">
            <label>Partita IVA</label>
            <input className="inp" value={companyVat} onChange={e => setCompanyVat(e.target.value)} placeholder="IT01234567890" />
          </div>
          <div className="field">
            <label>Indirizzo</label>
            <input className="inp" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="Via Roma 1, 20100 Milano" />
          </div>
          <button className="btn btn-p" onClick={saveCompany}>Salva dati azienda</button>
        </div>
      )}

      {/* API Key tab */}
      {tab === 'api' && (
        <div className="card" style={{ padding: 32, maxWidth: 600 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>API Key Anthropic</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
            La chiave API di Anthropic (Claude) è necessaria per il funzionamento del catalogo AI.
            Senza questa chiave non sarà possibile processare le foto dello shooting.
          </p>

          <div className="field">
            <label>API KEY</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="inp"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={{ flex: 1 }}
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
            {apiKey && (
              <span style={{ fontSize: 12, color: '#2e7d32', fontWeight: 600 }}>
                Chiave configurata
              </span>
            )}
            {!apiKey && (
              <span style={{ fontSize: 12, color: 'var(--err)', fontWeight: 600 }}>
                Chiave mancante — il catalogo AI non funzionerà
              </span>
            )}
          </div>

          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
            La chiave viene salvata solo nel tuo browser e non viene mai inviata ai nostri server.
          </p>
        </div>
      )}
    </div>
  )
}
