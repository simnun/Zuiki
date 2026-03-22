'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string; type: string; title: string; message: string | null
  link: string | null; read: boolean; createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
  ticket_reply: '💬',
  ticket_resolved: '✅',
  payment_due: '⚠️',
  payment_received: '💰',
  session_complete: '🎉',
  session_failed: '❌',
  limit_warning: '📊',
  system: '🔔',
}

export default function NotificationBell({ isDark = false }: { isDark?: boolean }) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => {
      setNotifications(d.notifications || [])
      setUnreadCount(d.unreadCount || 0)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [load])

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    load()
  }

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      })
    }
    setOpen(false)
    if (n.link) router.push(n.link)
    load()
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'ora'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    return `${days}g`
  }

  const bgColor = isDark ? '#1a1a1a' : 'var(--card)'
  const borderColor = isDark ? '#333' : 'var(--border)'
  const textColor = isDark ? '#fff' : 'var(--text)'
  const mutedColor = isDark ? '#888' : 'var(--muted)'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 20, padding: '6px 8px',
          color: mutedColor, transition: 'color .15s',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#e74c3c', color: '#fff', borderRadius: '50%',
            minWidth: 16, height: 16, fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
          }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          width: 380, maxHeight: 480, overflowY: 'auto',
          background: bgColor, border: `1px solid ${borderColor}`,
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,.2)',
          zIndex: 999,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', borderBottom: `1px solid ${borderColor}`,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: textColor }}>Notifiche</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Segna tutto come letto
              </button>
            )}
          </div>

          {/* Notifications list */}
          {notifications.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
              <p style={{ fontSize: 13, color: mutedColor, margin: 0 }}>Nessuna notifica</p>
            </div>
          ) : (
            <div>
              {notifications.map(n => (
                <button key={n.id} onClick={() => handleClick(n)}
                  style={{
                    display: 'flex', gap: 12, padding: '14px 20px', width: '100%',
                    background: n.read ? 'transparent' : (isDark ? '#222' : 'var(--subtle)'),
                    border: 'none', borderBottom: `1px solid ${borderColor}`,
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background .15s',
                  }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICONS[n.type] || '🔔'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{
                        fontSize: 13, fontWeight: n.read ? 500 : 700, color: textColor,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{n.title}</span>
                      <span style={{ fontSize: 10, color: mutedColor, flexShrink: 0, marginLeft: 8 }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    {n.message && (
                      <p style={{
                        fontSize: 12, color: mutedColor, margin: 0, lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{n.message}</p>
                    )}
                    {!n.read && (
                      <span style={{
                        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--accent)', marginTop: 4,
                      }} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
