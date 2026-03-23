'use client'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'

const ROLE_HOME: Record<string, string> = {
  super_admin: '/admin/companies',
  owner: '/dashboard',
  admin: '/billing/invoices',
  user: '/sessions/new',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // If already logged in, redirect to appropriate page
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user?.role) {
        window.location.href = ROLE_HOME[d.user.role] || '/dashboard'
      }
    }).catch(() => {})
  }, [])
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
      setError('Email o password errati')
      setLoading(false)
    } else {
      // Fetch session to get role-based redirect
      const sess = await fetch('/api/auth/session').then(r => r.json())
      const role = sess?.user?.role || 'user'
      window.location.href = ROLE_HOME[role] || '/dashboard'
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
          Inserisci email e password per accedere
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>EMAIL</label>
            <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="nome@azienda.it" required autoFocus
            />
          </div>

          <div className="field">
            <label>PASSWORD</label>
            <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </div>

          {error && (
            <div style={{
              background: '#fff5f5', border: '1px solid #ecc', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--err)',
              fontWeight: 600, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button className="btn btn-p" type="submit" disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: 15, color: '#fff' }}>
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>
        <p style={{ fontSize: 10, color: '#bbb', textAlign: 'center', marginTop: 24 }}>
          Build: {process.env.NEXT_PUBLIC_BUILD_TIME}
        </p>
      </div>
    </div>
  )
}
