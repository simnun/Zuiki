'use client'
import { useState, useEffect } from 'react'

export default function CompanyPage() {
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')

  // Editable fields
  const [name, setName] = useState('')
  const [vat, setVat] = useState('')
  const [address, setAddress] = useState('')
  const [billingEmail, setBillingEmail] = useState('')

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user) setUser(d.user)
    })
    fetch('/api/company/profile').then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        setCompany(d)
        setName(d.name || '')
        setVat(d.vatNumber || '')
        setAddress(d.billingAddress || '')
        setBillingEmail(d.billingEmail || '')
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const flash = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(''), 2500) }

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/company/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, vatNumber: vat, billingAddress: address, billingEmail }),
    })
    flash(res.ok ? 'Dati azienda salvati' : 'Errore nel salvataggio')
    setSaving(false)
  }

  const isEditable = user?.role === 'owner' || user?.role === 'admin'

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  if (!company) return (
    <div className="animate-fadeUp">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 20 }}>Azienda</h1>
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
        Nessuna azienda associata al tuo account.
      </div>
    </div>
  )

  return (
    <div className="animate-fadeUp">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Azienda</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>Informazioni e dati di fatturazione della tua azienda</p>

      {saved && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
          {saved}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Company info */}
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Dati aziendali</h3>

          <div className="field">
            <label>Nome azienda</label>
            <input className="inp" value={name} onChange={e => setName(e.target.value)} disabled={!isEditable} style={!isEditable ? { opacity: 0.6 } : {}} />
          </div>
          <div className="field">
            <label>Partita IVA</label>
            <input className="inp" value={vat} onChange={e => setVat(e.target.value)} disabled={!isEditable} placeholder="IT01234567890" style={!isEditable ? { opacity: 0.6 } : {}} />
          </div>
          <div className="field">
            <label>Indirizzo fatturazione</label>
            <input className="inp" value={address} onChange={e => setAddress(e.target.value)} disabled={!isEditable} placeholder="Via Roma 1, 20100 Milano" style={!isEditable ? { opacity: 0.6 } : {}} />
          </div>
          <div className="field">
            <label>Email fatturazione</label>
            <input className="inp" type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} disabled={!isEditable} placeholder="fatture@azienda.it" style={!isEditable ? { opacity: 0.6 } : {}} />
          </div>

          {isEditable && (
            <button className="btn btn-p" onClick={save} disabled={saving}>
              {saving ? 'Salvataggio...' : 'Salva modifiche'}
            </button>
          )}
        </div>

        {/* Piano & crediti */}
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Piano e crediti</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'var(--subtle)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Piano</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{company.pricingPlan || 'Base'}</div>
              </div>
              <div style={{ background: 'var(--subtle)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Crediti</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                  &euro; {Number(company.walletCredits || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ background: 'var(--subtle)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Utilizzati</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  &euro; {Number(company.usedCredits || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ background: 'var(--subtle)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Rinnovo</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {company.creditRenewalDate ? new Date(company.creditRenewalDate).toLocaleDateString('it-IT') : '—'}
                </div>
              </div>
            </div>

            {/* Usage bar */}
            {(() => {
              const total = Number(company.walletCredits || 0) + Number(company.usedCredits || 0)
              const pct = total > 0 ? (Number(company.usedCredits || 0) / total) * 100 : 0
              return total > 0 ? (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                    Utilizzo: {pct.toFixed(0)}%
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 6,
                      background: pct > 80 ? 'var(--err)' : 'var(--ok)', transition: 'width .3s',
                    }} />
                  </div>
                </div>
              ) : null
            })()}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Identificativo</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Slug</span>
                <span className="sku" style={{ fontSize: 12 }}>{company.slug}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Stato</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: company.isActive ? 'var(--ok)' : 'var(--err)' }}>
                  {company.isActive ? 'Attiva' : 'Disattivata'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Creata il</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {new Date(company.createdAt).toLocaleDateString('it-IT')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
