'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Email o password non validi')
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div className="animate-fadeUp" style={{
        background: 'var(--card)', borderRadius: 20, padding: '48px 40px',
        border: '1px solid var(--border)', width: 400, maxWidth: '90vw',
        boxShadow: '0 8px 30px rgba(0,0,0,.06)',
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>
          Catalogo <span style={{ color: 'var(--accent2)' }}>AI</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 32 }}>
          Piattaforma di catalogazione AI per Zuiki
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@zuiki.it" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••" required />
          </div>

          {error && (
            <div style={{
              background: '#fff5f5', border: '1px solid #ecc', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--err)',
            }}>
              {error}
            </div>
          )}

          <button className="btn btn-p" type="submit" disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: 15 }}>
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <a href="/" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
            Usa Catalogo Rapido (senza account)
          </a>
        </div>
      </div>
    </div>
  )
}
