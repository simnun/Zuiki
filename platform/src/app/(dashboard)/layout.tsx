'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { ROLE_NAV, ROLE_HOME, canAccessRoute } from '@/lib/rbac'
import type { AppRole } from '@/lib/rbac'
import NotificationBell from '@/components/NotificationBell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [sideOpen, setSideOpen] = useState(true)
  const [unreadTickets, setUnreadTickets] = useState(0)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user) {
        if (d.user.role === 'super_admin') {
          window.location.href = '/admin/companies'
          return
        }
        setUser(d.user)
      } else {
        window.location.href = '/login'
      }
    }).catch(() => window.location.href = '/login')
  }, [])

  // Fetch unread ticket notification count for badge
  const loadUnread = useCallback(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => {
      const ticketNotifs = (d.notifications || []).filter(
        (n: any) => !n.read && (n.type === 'ticket_reply' || n.type === 'ticket_resolved')
      )
      setUnreadTickets(ticketNotifs.length)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (user) {
      loadUnread()
      const interval = setInterval(loadUnread, 30000)
      return () => clearInterval(interval)
    }
  }, [user, loadUnread])

  useEffect(() => {
    if (user && !canAccessRoute(user.role, pathname)) {
      const home = ROLE_HOME[user.role as AppRole] || '/dashboard'
      window.location.href = home
    }
  }, [user, pathname])

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  )

  const navItems = ROLE_NAV[user.role as AppRole] || []

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.href = '/login'
  }

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
          {navItems.map(n => {
            const active = pathname === n.href || pathname.startsWith(n.href + '/')
            const isSupport = n.href === '/support'
            return (
              <Link key={n.href} href={n.href} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', margin: '2px 8px', borderRadius: 10,
                textDecoration: 'none', fontSize: 13, fontWeight: 600,
                color: active ? '#fff' : 'var(--text)',
                background: active ? 'var(--accent)' : 'transparent',
                transition: 'all .15s',
                position: 'relative',
              }}>
                <span style={{ fontSize: 16, width: 28, textAlign: 'center' }}>{n.icon}</span>
                {sideOpen && n.label}
                {/* Unread badge on Support */}
                {isSupport && unreadTickets > 0 && (
                  <span style={{
                    position: sideOpen ? 'static' : 'absolute',
                    top: sideOpen ? undefined : 6,
                    right: sideOpen ? undefined : 4,
                    marginLeft: sideOpen ? 'auto' : undefined,
                    background: '#e74c3c', color: '#fff', borderRadius: 10,
                    minWidth: 18, height: 18, fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 5px',
                  }}>{unreadTickets}</span>
                )}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '0 16px' }}>
          <Link href="/settings" style={{
            display: 'block', textDecoration: 'none', padding: '10px 12px',
            borderRadius: 8, marginBottom: 8, cursor: 'pointer',
            transition: 'background .15s',
          }}>
            {sideOpen ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                }}>
                  {(user.firstName || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Impostazioni</div>
                </div>
              </div>
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 auto',
              }}>
                {(user.firstName || 'U')[0].toUpperCase()}
              </div>
            )}
          </Link>
          <button onClick={handleLogout} style={{
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
      <main style={{ flex: 1, padding: '32px 40px', maxWidth: 1200, position: 'relative' }}>
        {/* Top bar with notification bell */}
        <div style={{
          position: 'absolute', top: 20, right: 40,
          zIndex: 100,
        }}>
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  )
}
