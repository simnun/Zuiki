'use client'
import { useState, useEffect } from 'react'

export default function TicketImage({ storageKey, alt, style, onClick }: {
  storageKey: string; alt?: string
  style?: React.CSSProperties; onClick?: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!storageKey) return
    fetch(`/api/files?path=${encodeURIComponent(storageKey)}`)
      .then(r => r.json())
      .then(d => { if (d.url) setUrl(d.url); else setError(true) })
      .catch(() => setError(true))
  }, [storageKey])

  if (error) return (
    <div style={{
      ...style, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.1)', borderRadius: 8, fontSize: 11, color: '#999',
    }}>Immagine non disponibile</div>
  )

  if (!url) return (
    <div style={{
      ...style, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.05)', borderRadius: 8,
    }}>
      <div className="spinner" style={{ width: 16, height: 16 }} />
    </div>
  )

  return (
    <img
      src={url}
      alt={alt || ''}
      onClick={onClick}
      style={{ ...style, cursor: onClick ? 'zoom-in' : undefined }}
    />
  )
}
