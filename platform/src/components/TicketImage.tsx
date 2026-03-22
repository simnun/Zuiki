'use client'
import { useState } from 'react'

export default function TicketImage({ src, alt, style, onClick }: {
  src: string; alt?: string
  style?: React.CSSProperties; onClick?: () => void
}) {
  const [error, setError] = useState(false)

  if (error) return (
    <div style={{
      ...style, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.1)', borderRadius: 8, fontSize: 11, color: '#999',
    }}>Immagine non disponibile</div>
  )

  return (
    <img
      src={src}
      alt={alt || ''}
      onClick={onClick}
      onError={() => setError(true)}
      style={{ ...style, cursor: onClick ? 'zoom-in' : undefined }}
    />
  )
}
