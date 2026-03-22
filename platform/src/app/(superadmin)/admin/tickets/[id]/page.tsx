'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

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
  createdBy: { firstName: string; lastName: string }
  company?: { name: string }
  messages: Message[]
  attachments: Attachment[]
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Aperto', color: '#e67e22', bg: '#fef3e2' },
  in_progress: { label: 'In lavorazione', color: '#3498db', bg: '#ebf5fb' },
  resolved: { label: 'Risolto', color: '#27ae60', bg: '#eafaf1' },
  closed: { label: 'Chiuso', color: '#95a5a6', bg: '#f0f0f0' },
}

export default function AdminTicketDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
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
    if (newFiles.length + photos.length > 5) return
    setPhotos(prev => [...prev, ...newFiles])
    setPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))])
  }

  const removePhoto = (i: number) => {
    URL.revokeObjectURL(previews[i])
    setPhotos(prev => prev.filter((_, j) => j !== i))
    setPreviews(prev => prev.filter((_, j) => j !== i))
  }

  const sendMessage = async (extraBody: Record<string, unknown> = {}) => {
    if (!reply.trim() && photos.length === 0 && !extraBody.status) return
    setSending(true)

    const res = await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: reply.trim() || (photos.length > 0 ? '📷 Foto allegata' : undefined),
        replyToId: replyTo?.id || null,
        ...extraBody,
      }),
    })

    const data = await res.json()

    // Upload photos
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
    setSending(false)
    load()
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendMessage()
  }

  const handleReplyAndResolve = async () => {
    await sendMessage({ status: 'resolved' })
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatusUpdating(true)
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setStatusUpdating(false)
    load()
  }

  if (!ticket) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>

  const st = STATUS_CFG[ticket.status] || STATUS_CFG.open
  const isClosed = ticket.status === 'closed'

  return (
    <div className="animate-fadeUp" style={{ display: 'flex', gap: 24 }}>
      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
        }}>
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
        </div>
      )}

      {/* Main chat area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <button onClick={() => router.push('/admin/tickets')}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', marginBottom: 16, padding: 0 }}>
          ← Tutti i ticket
        </button>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 20 }}>{ticket.subject}</h1>

        {/* Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <AdminMessageBubble
            sender={`${ticket.createdBy.firstName} ${ticket.createdBy.lastName}`}
            message={ticket.description}
            date={ticket.createdAt}
            isAdmin={false}
            attachments={ticket.attachments}
            replyTo={null}
            onQuote={isClosed ? null : () => setReplyTo({ id: '', message: ticket.description, sender: { ...ticket.createdBy, role: 'user' } })}
            onImageClick={setLightbox}
          />

          {ticket.messages.map(m => {
            const isAdmin = m.sender.role === 'super_admin'
            return (
              <AdminMessageBubble
                key={m.id}
                sender={isAdmin ? 'Tu (Admin)' : `${m.sender.firstName} ${m.sender.lastName}`}
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
            {/* Quote bar */}
            {replyTo && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: '#2a2a2a', borderRadius: '12px 12px 0 0', borderLeft: '3px solid var(--accent2)',
                fontSize: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>
                    Rispondendo a {replyTo.sender.role === 'super_admin' ? 'te stesso' : replyTo.sender.firstName}
                  </span>
                  <p style={{ margin: '2px 0 0', color: '#888', lineHeight: 1.3 }}>
                    {replyTo.message.slice(0, 80)}{replyTo.message.length > 80 ? '...' : ''}
                  </p>
                </div>
                <button onClick={() => setReplyTo(null)} style={{
                  background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18, padding: '0 4px',
                }}>×</button>
              </div>
            )}

            <form onSubmit={handleReply}>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Scrivi una risposta al cliente..."
                rows={4}
                style={{
                  width: '100%', padding: '14px 16px', fontSize: 14,
                  background: '#222', border: '1px solid #333', color: '#fff',
                  fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5, outline: 'none',
                  boxSizing: 'border-box',
                  borderRadius: replyTo ? '0 0 12px 12px' : '12px',
                }}
              />

              {/* Photo previews */}
              {previews.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {previews.map((src, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={src} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid #333' }} />
                      <button onClick={() => removePhoto(i)} type="button" style={{
                        position: 'absolute', top: -6, right: -6, background: '#e74c3c', color: '#fff',
                        border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 10,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple hidden
                    onChange={e => handleAddPhotos(e.target.files)} />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: '#222', border: '1px solid #333', borderRadius: 8,
                      padding: '6px 12px', fontSize: 12, color: '#888', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    📷 Foto
                  </button>
                  {photos.length > 0 && <span style={{ fontSize: 11, color: '#666' }}>{photos.length} foto</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(reply.trim() || photos.length > 0) && ticket.status !== 'resolved' && (
                    <button type="button" onClick={handleReplyAndResolve} disabled={sending}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: '#222', border: '1px solid #27ae60', color: '#27ae60', fontFamily: 'inherit',
                      }}>
                      Rispondi e Risolvi
                    </button>
                  )}
                  <button type="submit" disabled={sending || (!reply.trim() && photos.length === 0)}
                    style={{
                      padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: 'var(--accent2)', border: 'none', color: '#fff', fontFamily: 'inherit',
                      opacity: (!reply.trim() && photos.length === 0) ? 0.5 : 1,
                    }}>
                    {sending ? 'Invio...' : 'Rispondi'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div style={{
            marginTop: 20, padding: '14px 20px', borderRadius: 12, textAlign: 'center',
            background: '#222', border: '1px solid #333', color: '#888', fontSize: 13,
          }}>
            Ticket chiuso. <button onClick={() => handleStatusChange('open')}
              style={{ background: 'none', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
              Riapri ticket
            </button>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div style={{ width: 240, flexShrink: 0 }}>
        <div style={{ padding: '20px', borderRadius: 12, background: '#222', border: '1px solid #333' }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 16 }}>
            Dettagli Ticket
          </h3>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Stato</div>
            <select
              value={ticket.status}
              onChange={e => handleStatusChange(e.target.value)}
              disabled={statusUpdating}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: '#1a1a1a', border: '1px solid #333', color: st.color,
                cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
              }}
            >
              <option value="open">Aperto</option>
              <option value="in_progress">In lavorazione</option>
              <option value="resolved">Risolto</option>
              <option value="closed">Chiuso</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Cliente</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
              {ticket.createdBy.firstName} {ticket.createdBy.lastName}
            </div>
            {ticket.company?.name && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{ticket.company.name}</div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Aperto il</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>
              {new Date(ticket.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
              {new Date(ticket.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Messaggi</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>{ticket.messages.length + 1}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>ID Ticket</div>
            <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>#{ticket.id.slice(0, 12)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminMessageBubble({ sender, message, date, isAdmin, attachments, replyTo, onQuote, onImageClick }: {
  sender: string; message: string; date: string; isAdmin: boolean
  attachments: Attachment[]; replyTo: ReplyTo | null
  onQuote: (() => void) | null; onImageClick: (src: string) => void
}) {
  const images = attachments.filter(a => a.mimeType?.startsWith('image/'))

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isAdmin ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '80%', padding: '14px 18px', borderRadius: 16,
        borderBottomLeftRadius: isAdmin ? 16 : 4,
        borderBottomRightRadius: isAdmin ? 4 : 16,
        background: isAdmin ? 'var(--accent2)' : '#2a2a2a',
        color: isAdmin ? '#fff' : '#ddd',
        border: isAdmin ? 'none' : '1px solid #333',
        position: 'relative',
      }}>
        {/* Quoted message */}
        {replyTo && (
          <div style={{
            padding: '8px 12px', marginBottom: 8, borderRadius: 8,
            background: isAdmin ? 'rgba(255,255,255,0.15)' : '#222',
            borderLeft: `3px solid ${isAdmin ? 'rgba(255,255,255,0.5)' : 'var(--accent2)'}`,
            fontSize: 12, lineHeight: 1.4,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 2, opacity: 0.8 }}>
              {replyTo.sender.role === 'super_admin' ? 'Tu' : replyTo.sender.firstName}
            </div>
            <div style={{ opacity: 0.7 }}>{replyTo.message.slice(0, 80)}{replyTo.message.length > 80 ? '...' : ''}</div>
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: isAdmin ? 'rgba(255,255,255,0.8)' : '#888' }}>
          {sender}
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
                  border: `1px solid ${isAdmin ? 'rgba(255,255,255,0.2)' : '#444'}`,
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
            color: isAdmin ? '#fff' : '#ddd',
          }}>↩</button>
        )}
      </div>
      <span style={{ fontSize: 10, color: '#666', marginTop: 4, padding: '0 8px' }}>
        {new Date(date).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
