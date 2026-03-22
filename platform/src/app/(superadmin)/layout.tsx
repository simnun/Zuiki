'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import NotificationBell from '@/components/NotificationBell'

const NAV = [
  { href: '/admin/companies', label: 'Aziende', icon: '◆' },
  { href: '/admin/billing', label: 'Fatturazione', icon: '€' },
  { href: '/admin/tickets', label: 'Ticket', icon: '✉' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [unreadTickets, setUnreadTickets] = useState(0)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user?.role === 'super_admin') setUser(d.user)
      else window.location.href = '/login'
    }).catch(() => window.location.href = '/login')
  }, [])

  // Fetch unread ticket count for nav badge
  useEffect(() => {
    if (!user) return
    const load = () => {
      fetch('/api/notifications').then(r => r.json()).then(d => {
        const ticketNotifs = (d.notifications || []).filter(
          (n: any) => !n.read && (n.type === 'ticket_reply' || n.type === 'ticket_resolved')
        )
        setUnreadTickets(ticketNotifs.length)
      }).catch(() => {})
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [user])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.href = '/login'
  }

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
            const isTicket = n.href === '/admin/tickets'
            return (
              <Link key={n.href} href={n.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', margin: '2px 8px', borderRadius: 8,
                textDecoration: 'none', fontSize: 13, fontWeight: 600,
                color: active ? '#fff' : '#888',
                background: active ? 'var(--accent2)' : 'transparent',
                position: 'relative',
              }}>
                <span style={{ fontSize: 14 }}>{n.icon}</span> {n.label}
                {/* Unread badge on Ticket */}
                {isTicket && unreadTickets > 0 && (
                  <span style={{
                    marginLeft: 'auto',
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
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: '#888' }}>
            {user.firstName} {user.lastName}
          </div>
          <button onClick={handleLogout} style={{
            display: 'block', width: '100%', padding: '10px 12px', borderRadius: 8,
            background: '#2a2a2a', border: '1px solid #333',
            fontSize: 12, fontWeight: 600, color: '#888', textAlign: 'center',
            cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
          }}>
            Esci
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '32px 40px', maxWidth: 1200, position: 'relative' }}>
        {/* Notification bell top-right */}
        <div style={{ position: 'absolute', top: 20, right: 40, zIndex: 100 }}>
          <NotificationBell isDark />
        </div>
        {children}
      </main>
    </div>
  )
}
