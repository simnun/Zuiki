import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

export const maxDuration = 300

const HF_SPACE = 'https://briaai-bria-rmbg-2-0.hf.space'

// Retry fetch with exponential backoff
async function fetchRetry(
  url: string,
  options: RequestInit,
  { retries = 4, baseDelay = 2000, label = '' } = {}
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options)
      // Retry on 503 (space sleeping/cold start) or 529 (overloaded)
      if ((res.status === 503 || res.status === 529) && attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`[BRIA] ${label} attempt ${attempt + 1} got ${res.status}, retrying in ${delay}ms...`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      return res
    } catch (err: any) {
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`[BRIA] ${label} attempt ${attempt + 1} failed: ${err.message}, retrying in ${delay}ms...`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
  throw new Error(`${label}: tutti i tentativi falliti`)
}

// Wake up the HF Space by hitting its main page
async function wakeUpSpace() {
  try {
    const res = await fetch(HF_SPACE, { method: 'GET' })
    // If we get a 200, space is awake. If 503, it's waking up.
    if (res.status === 503) {
      // Wait for cold start
      console.log('[BRIA] Space sleeping, waiting for wake up...')
      await new Promise(r => setTimeout(r, 15000))
    }
  } catch {
    // Ignore - we'll retry in the main flow
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageBase64, mimeType } = await req.json()
  if (!imageBase64) {
    return NextResponse.json({ error: 'imageBase64 richiesto' }, { status: 400 })
  }

  try {
    const imageBuffer = Buffer.from(imageBase64, 'base64')

    // Wake up space if sleeping
    await wakeUpSpace()

    // 1. Upload image to HF Space
    const uploadForm = new FormData()
    uploadForm.append('files', new Blob([imageBuffer], { type: mimeType || 'image/png' }), 'image.png')

    const uploadRes = await fetchRetry(
      `${HF_SPACE}/gradio_api/upload`,
      { method: 'POST', body: uploadForm },
      { label: 'Upload' }
    )
    if (!uploadRes.ok) {
      throw new Error(`Upload fallito: ${uploadRes.status} ${await uploadRes.text().catch(() => '')}`)
    }
    const uploadPaths = await uploadRes.json()
    const filePath = uploadPaths[0]

    // 2. Call predict endpoint
    const callRes = await fetchRetry(
      `${HF_SPACE}/gradio_api/call/predict`,
      {
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
      },
      { label: 'Predict' }
    )
    if (!callRes.ok) {
      throw new Error(`Predict fallito: ${callRes.status} ${await callRes.text().catch(() => '')}`)
    }
    const { event_id } = await callRes.json()

    // 3. Poll SSE result with retries (space may still be processing)
    let resultUrl: string | null = null

    for (let poll = 0; poll < 6; poll++) {
      const sseRes = await fetchRetry(
        `${HF_SPACE}/gradio_api/call/predict/${event_id}`,
        { method: 'GET' },
        { retries: 2, label: 'SSE' }
      )
      if (!sseRes.ok) {
        if (poll < 5) {
          await new Promise(r => setTimeout(r, 3000))
          continue
        }
        throw new Error(`SSE fallito: ${sseRes.status}`)
      }

      const sseText = await sseRes.text()

      // Check for error events
      if (sseText.includes('event: error')) {
        const errorMatch = sseText.match(/event: error\ndata: (.+)/)
        const errorMsg = errorMatch ? errorMatch[1] : 'Errore sconosciuto'
        throw new Error(`BRIA errore: ${errorMsg}`)
      }

      // Parse SSE: find the "complete" event with data
      const lines = sseText.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('data: ')) {
          try {
            const parsed = JSON.parse(lines[i].slice(6))
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
      }

      if (resultUrl) break

      // If still processing, wait and poll again
      if (sseText.includes('process_starts') || sseText.includes('process_generating')) {
        await new Promise(r => setTimeout(r, 3000))
        continue
      }

      // No result and no processing events - might need more time
      if (poll < 5) {
        await new Promise(r => setTimeout(r, 3000))
      }
    }

    if (!resultUrl) {
      throw new Error('Nessun risultato dal modello dopo multipli tentativi')
    }

    // 4. Download the result image
    const imgRes = await fetchRetry(
      resultUrl,
      { method: 'GET' },
      { retries: 2, label: 'Download' }
    )
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
