'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin/companies', label: 'Aziende', icon: '◆' },
  { href: '/admin/billing', label: 'Fatturazione', icon: '€' },
  { href: '/admin/tickets', label: 'Ticket', icon: '✉' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user?.role === 'super_admin') setUser(d.user)
      else window.location.href = '/login'
    }).catch(() => window.location.href = '/login')
  }, [])

  if (!user) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" /></div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 220, background: '#1a1a1a', padding: '20px 0', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '0 16px', marginBottom: 32 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            Admin <span style={{ color: 'var(--accent2)' }}>Panel</span>
          </span>
        </div>
        <nav style={{ flex: 1 }}>
          {NAV.map(n => {
            const active = pathname.startsWith(n.href)
            return (
              <Link key={n.href} href={n.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', margin: '2px 8px', borderRadius: 8,
                textDecoration: 'none', fontSize: 13, fontWeight: 600,
                color: active ? '#fff' : '#888',
                background: active ? 'var(--accent2)' : 'transparent',
              }}>
                <span style={{ fontSize: 14 }}>{n.icon}</span> {n.label}
              </Link>
            )
          })}
        </nav>
        <div style={{ padding: '0 16px' }}>
          <Link href="/dashboard" style={{ fontSize: 12, color: '#666', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '32px 40px', maxWidth: 1200 }}>{children}</main>
    </div>
  )
}
