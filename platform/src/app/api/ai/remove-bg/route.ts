import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageBase64, mimeType } = await req.json()
  if (!imageBase64) {
    return NextResponse.json({ error: 'imageBase64 richiesto' }, { status: 400 })
  }

  const apiKey = process.env.REMOVE_BG_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      error: 'REMOVE_BG_API_KEY non configurata. Registrati gratis su remove.bg/api e aggiungi la chiave nelle env vars.',
      needsKey: true,
    }, { status: 500 })
  }

  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64')

    const formData = new FormData()
    formData.append('image_file', new Blob([imageBuffer], { type: mimeType || 'image/png' }), 'image.png')
    formData.append('size', 'auto')
    formData.append('format', 'png')

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    })

    if (!response.ok) {
      const errText = await response.text()
      let errMsg = `remove.bg errore: ${response.status}`
      if (response.status === 402) {
        errMsg = 'Crediti remove.bg esauriti (50 gratuiti/mese). Attendi il prossimo mese o acquista crediti su remove.bg.'
      } else if (response.status === 403) {
        errMsg = 'API Key remove.bg non valida.'
      }
      console.error('remove.bg error:', response.status, errText)
      return NextResponse.json({ error: errMsg }, { status: response.status })
    }

    const resultBuffer = await response.arrayBuffer()
    const resultBase64 = Buffer.from(resultBuffer).toString('base64')

    return NextResponse.json({
      imageBase64: resultBase64,
      mimeType: 'image/png',
    })
  } catch (err: any) {
    console.error('remove.bg error:', err)
    return NextResponse.json({
      error: err.message || 'Errore rimozione sfondo',
    }, { status: 500 })
  }
}
