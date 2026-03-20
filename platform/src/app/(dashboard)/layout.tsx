'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '◉' },
  { href: '/sessions/new', label: 'Nuova Sessione', icon: '＋' },
  { href: '/models', label: 'Modelle', icon: '♀' },
  { href: '/billing/invoices', label: 'Fatturazione', icon: '€' },
  { href: '/support/new', label: 'Supporto', icon: '?' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [sideOpen, setSideOpen] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user) setUser(d.user)
      else window.location.href = '/login'
    }).catch(() => window.location.href = '/login')
  }, [])

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: sideOpen ? 240 : 60,
        background: 'var(--card)',
        borderRight: '1px solid var(--border)',
        padding: '20px 0',
        transition: 'width .2s',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '0 16px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSideOpen(!sideOpen)} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)',
          }}>☰</button>
          {sideOpen && (
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
              Catalogo <span style={{ color: 'var(--accent2)' }}>AI</span>
            </span>
          )}
        </div>

        <nav style={{ flex: 1 }}>
          {NAV.map(n => {
            const active = pathname === n.href || pathname.startsWith(n.href + '/')
            return (
              <Link key={n.href} href={n.href} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', margin: '2px 8px', borderRadius: 10,
                textDecoration: 'none', fontSize: 13, fontWeight: 600,
                color: active ? '#fff' : 'var(--text)',
                background: active ? 'var(--accent)' : 'transparent',
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: 16, width: 28, textAlign: 'center' }}>{n.icon}</span>
                {sideOpen && n.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '0 16px' }}>
          {sideOpen && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              {user.firstName} {user.lastName}
            </div>
          )}
          <button onClick={() => {
            fetch('/api/auth/signout', { method: 'POST' }).then(() => window.location.href = '/login')
          }} style={{
            display: 'block', width: '100%', padding: '10px 12px', borderRadius: 8,
            background: 'var(--subtle)', border: '1px solid var(--border)',
            fontSize: 12, fontWeight: 600, color: 'var(--muted)', textAlign: 'center',
            cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
          }}>
            {sideOpen ? 'Esci' : '\u2190'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '32px 40px', maxWidth: 1200 }}>
        {children}
      </main>
    </div>
  )
}
