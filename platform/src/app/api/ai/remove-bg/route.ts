import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

export const maxDuration = 120

const HF_SPACE = 'https://briaai-bria-rmbg-2-0.hf.space'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageBase64, mimeType } = await req.json()
  if (!imageBase64) {
    return NextResponse.json({ error: 'imageBase64 richiesto' }, { status: 400 })
  }

  try {
    const imageBuffer = Buffer.from(imageBase64, 'base64')

    // 1. Upload image to HF Space
    const uploadForm = new FormData()
    uploadForm.append('files', new Blob([imageBuffer], { type: mimeType || 'image/png' }), 'image.png')

    const uploadRes = await fetch(`${HF_SPACE}/gradio_api/upload`, {
      method: 'POST',
      body: uploadForm,
    })
    if (!uploadRes.ok) {
      throw new Error(`Upload fallito: ${uploadRes.status}`)
    }
    const uploadPaths = await uploadRes.json()
    const filePath = uploadPaths[0]

    // 2. Call predict endpoint
    const callRes = await fetch(`${HF_SPACE}/gradio_api/call/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          path: filePath,
          orig_name: 'image.png',
          size: imageBuffer.length,
          mime_type: mimeType || 'image/png',
        }],
      }),
    })
    if (!callRes.ok) {
      throw new Error(`Predict fallito: ${callRes.status}`)
    }
    const { event_id } = await callRes.json()

    // 3. Get result via SSE stream
    const sseRes = await fetch(`${HF_SPACE}/gradio_api/call/predict/${event_id}`)
    if (!sseRes.ok) {
      throw new Error(`SSE fallito: ${sseRes.status}`)
    }
    const sseText = await sseRes.text()

    // Parse SSE: find the "complete" event with data
    const dataLines = sseText.split('\n').filter(l => l.startsWith('data: '))
    let resultUrl: string | null = null

    for (const line of dataLines) {
      try {
        const parsed = JSON.parse(line.slice(6))
        // Result is in parsed[0].url or parsed[0].path
        if (Array.isArray(parsed) && parsed[0]) {
          const item = parsed[0]
          if (item.url) {
            resultUrl = item.url
          } else if (item.path) {
            resultUrl = `${HF_SPACE}/gradio_api/file=${item.path}`
          }
        }
      } catch {
        // skip non-JSON data lines (e.g. heartbeat)
      }
    }

    if (!resultUrl) {
      throw new Error('Nessun risultato dal modello')
    }

    // 4. Download the result image
    const imgRes = await fetch(resultUrl)
    if (!imgRes.ok) {
      throw new Error(`Download risultato fallito: ${imgRes.status}`)
    }
    const resultBuffer = await imgRes.arrayBuffer()
    const resultBase64 = Buffer.from(resultBuffer).toString('base64')

    return NextResponse.json({
      imageBase64: resultBase64,
      mimeType: 'image/png',
    })
  } catch (err: any) {
    console.error('BRIA RMBG-2.0 error:', err)
    return NextResponse.json({
      error: err.message || 'Errore rimozione sfondo',
    }, { status: 500 })
  }
}
