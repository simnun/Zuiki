'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Attachment = { id: string; storageKey: string | null; fileName: string | null; mimeType: string | null }
type ReplyTo = { id: string; message: string; sender: { firstName: string; lastName: string; role: string } }
type Message = {
  id: string; message: string; createdAt: string; replyToId: string | null
  sender: { firstName: string; lastName: string; role: string }
  replyTo: ReplyTo | null
  attachments: Attachment[]
}
type Ticket = {
  id: string; subject: string; description: string; status: string; createdAt: string
  createdBy: { firstName: string; lastName: string }; messages: Message[]
  attachments: Attachment[]
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  open: { label: 'Aperto', color: '#e67e22', bg: '#fef3e2', icon: '●' },
  in_progress: { label: 'In lavorazione', color: '#3498db', bg: '#ebf5fb', icon: '◐' },
  resolved: { label: 'Risolto', color: '#27ae60', bg: '#eafaf1', icon: '✓' },
  closed: { label: 'Chiuso', color: '#95a5a6', bg: '#f0f0f0', icon: '—' },
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    fetch(`/api/tickets/${id}`).then(r => r.json()).then(setTicket)
  }

  useEffect(() => { load() }, [id])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.messages.length])

  const handleAddPhotos = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (newFiles.length + photos.length > 5) {
      setError('Massimo 5 foto per messaggio')
      return
    }
    setPhotos(prev => [...prev, ...newFiles])
    setPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))])
  }

  const removePhoto = (i: number) => {
    URL.revokeObjectURL(previews[i])
    setPhotos(prev => prev.filter((_, j) => j !== i))
    setPreviews(prev => prev.filter((_, j) => j !== i))
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() && photos.length === 0) return
    setSending(true)
    setError('')

    try {
      // Send text message
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: reply.trim() || (photos.length > 0 ? '📷 Foto allegata' : ''),
          replyToId: replyTo?.id || null,
        }),
      })

      if (!res.ok) throw new Error('Errore invio')
      const data = await res.json()

      // Upload photos if any
      if (photos.length > 0 && data.newMessageId) {
        const formData = new FormData()
        formData.set('messageId', data.newMessageId)
        photos.forEach(p => formData.append('photos', p))
        await fetch(`/api/tickets/${id}/upload`, { method: 'POST', body: formData })
      }

      setReply('')
      setReplyTo(null)
      setPhotos([])
      previews.forEach(p => URL.revokeObjectURL(p))
      setPreviews([])
      load()
    } catch {
      setError('Errore nell\'invio. Riprova.')
    }
    setSending(false)
  }

  if (!ticket) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>

  const st = STATUS_CFG[ticket.status] || STATUS_CFG.open
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 700 }}>
      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
        }}>
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13 }}>
        <Link href="/support" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Supporto</Link>
        <span style={{ color: 'var(--muted)' }}>/</span>
        <span style={{ fontWeight: 600 }}>#{ticket.id.slice(0, 8)}</span>
      </div>

      {/* Header */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{ticket.subject}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--muted)' }}>
              <span>Aperto il {new Date(ticket.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span>·</span>
              <span>{ticket.messages.length} {ticket.messages.length === 1 ? 'risposta' : 'risposte'}</span>
            </div>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 8,
            background: st.bg, color: st.color, whiteSpace: 'nowrap',
          }}>{st.icon} {st.label}</span>
        </div>
      </div>

      {/* Conversation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Original message */}
        <MessageBubble
          sender={`${ticket.createdBy.firstName} ${ticket.createdBy.lastName}`}
          message={ticket.description}
          date={ticket.createdAt}
          isAdmin={false}
          attachments={ticket.attachments}
          onQuote={null}
          replyTo={null}
          onImageClick={setLightbox}
        />

        {ticket.messages.map(m => {
          const isAdmin = m.sender.role === 'super_admin'
          return (
            <MessageBubble
              key={m.id}
              sender={isAdmin ? 'Team Supporto' : `${m.sender.firstName} ${m.sender.lastName}`}
              message={m.message}
              date={m.createdAt}
              isAdmin={isAdmin}
              attachments={m.attachments}
              replyTo={m.replyTo}
              onQuote={isClosed ? null : () => setReplyTo({ id: m.id, message: m.message, sender: m.sender })}
              onImageClick={setLightbox}
            />
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply form */}
      {!isClosed ? (
        <div style={{ marginTop: 20 }}>
          {error && (
            <div style={{
              background: '#fce4ec', border: '1px solid #ef9a9a', borderRadius: 8,
              padding: '8px 14px', marginBottom: 12, fontSize: 12, color: '#c62828', fontWeight: 600,
            }}>{error}</div>
          )}

          {/* Quoting bar */}
          {replyTo && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: 'var(--subtle)', borderRadius: '12px 12px 0 0', borderBottom: '2px solid var(--accent)',
              fontSize: 12,
            }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                  Rispondendo a {replyTo.sender.role === 'super_admin' ? 'Supporto' : replyTo.sender.firstName}
                </span>
                <p style={{ margin: '2px 0 0', color: 'var(--muted)', lineHeight: 1.3 }}>
                  {replyTo.message.slice(0, 80)}{replyTo.message.length > 80 ? '...' : ''}
                </p>
              </div>
              <button onClick={() => setReplyTo(null)} style={{
                background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: '0 4px',
              }}>×</button>
            </div>
          )}

          <form onSubmit={handleReply}>
            <textarea
              className="inp"
              rows={3}
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Scrivi un messaggio..."
              style={{
                fontSize: 14, lineHeight: 1.5, resize: 'vertical',
                borderRadius: replyTo ? '0 0 12px 12px' : undefined,
              }}
            />

            {/* Photo previews */}
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    <button onClick={() => removePhoto(i)} type="button" style={{
                      position: 'absolute', top: -6, right: -6, background: '#e74c3c', color: '#fff',
                      border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input ref={fileInputRef} type="file" accept="image/*" multiple hidden
                  onChange={e => handleAddPhotos(e.target.files)} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                    padding: '6px 12px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  📷 Foto
                </button>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {photos.length > 0 ? `${photos.length} foto` : ''}
                </span>
              </div>
              <button className="btn btn-p" type="submit" disabled={sending || (!reply.trim() && photos.length === 0)}
                style={{ padding: '8px 20px', fontSize: 13 }}>
                {sending ? 'Invio...' : 'Invia'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{
          marginTop: 20, padding: '16px 20px', borderRadius: 12, textAlign: 'center',
          background: 'var(--subtle)', border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            Questo ticket è stato {ticket.status === 'resolved' ? 'risolto' : 'chiuso'}.{' '}
            <Link href="/support/new" style={{ color: 'var(--accent)' }}>Apri un nuovo ticket</Link> se hai bisogno di ulteriore assistenza.
          </p>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ sender, message, date, isAdmin, attachments, replyTo, onQuote, onImageClick }: {
  sender: string; message: string; date: string; isAdmin: boolean
  attachments: Attachment[]; replyTo: ReplyTo | null
  onQuote: (() => void) | null; onImageClick: (src: string) => void
}) {
  const images = attachments.filter(a => a.mimeType?.startsWith('image/'))

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isAdmin ? 'flex-start' : 'flex-end',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '85%', padding: '14px 18px', borderRadius: 16,
        borderBottomRightRadius: isAdmin ? 16 : 4,
        borderBottomLeftRadius: isAdmin ? 4 : 16,
        background: isAdmin ? 'var(--card)' : 'var(--accent)',
        color: isAdmin ? 'var(--text)' : '#fff',
        border: isAdmin ? '1px solid var(--border)' : 'none',
        position: 'relative',
      }}>
        {/* Quoted message */}
        {replyTo && (
          <div style={{
            padding: '8px 12px', marginBottom: 8, borderRadius: 8,
            background: isAdmin ? 'var(--subtle)' : 'rgba(255,255,255,0.15)',
            borderLeft: `3px solid ${isAdmin ? 'var(--accent)' : 'rgba(255,255,255,0.5)'}`,
            fontSize: 12, lineHeight: 1.4,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 2, opacity: 0.8 }}>
              {replyTo.sender.role === 'super_admin' ? 'Supporto' : replyTo.sender.firstName}
            </div>
            <div style={{ opacity: 0.7 }}>{replyTo.message.slice(0, 80)}{replyTo.message.length > 80 ? '...' : ''}</div>
          </div>
        )}

        <div style={{
          fontSize: 11, fontWeight: 700, marginBottom: 6,
          color: isAdmin ? 'var(--accent2)' : 'rgba(255,255,255,0.8)',
        }}>
          {sender}
          {isAdmin && <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--accent2)', color: '#fff' }}>SUPPORTO</span>}
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{message}</p>

        {/* Images */}
        {images.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {images.map(img => (
              <img key={img.id}
                src={`/api/files?path=${encodeURIComponent(img.storageKey || '')}`}
                alt={img.fileName || ''}
                onClick={() => onImageClick(`/api/files?path=${encodeURIComponent(img.storageKey || '')}`)}
                style={{
                  width: images.length === 1 ? 240 : 120, height: images.length === 1 ? 'auto' : 120,
                  objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in',
                  border: `1px solid ${isAdmin ? 'var(--border)' : 'rgba(255,255,255,0.2)'}`,
                }}
              />
            ))}
          </div>
        )}

        {/* Quote button */}
        {onQuote && (
          <button onClick={onQuote} title="Cita messaggio" style={{
            position: 'absolute', top: 8, right: 8, background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 14, opacity: 0.4, padding: 0,
            color: isAdmin ? 'var(--text)' : '#fff',
          }}>↩</button>
        )}
      </div>
      <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, padding: '0 8px' }}>
        {new Date(date).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
