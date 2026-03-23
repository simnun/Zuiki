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

// Wake up the HF Space by hitting its main page and wait until ready
async function ensureSpaceReady() {
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(HF_SPACE, { method: 'GET' })
      if (res.ok) {
        console.log('[BRIA] Space is ready')
        return
      }
      if (res.status === 503) {
        console.log(`[BRIA] Space sleeping, wake attempt ${i + 1}/5, waiting...`)
        await new Promise(r => setTimeout(r, 10000))
        continue
      }
      // Other status - try to proceed anyway
      return
    } catch {
      await new Promise(r => setTimeout(r, 5000))
    }
  }
  console.log('[BRIA] Space may not be fully ready, proceeding anyway...')
}

// Extract result URL from SSE text
function parseSSEResult(sseText: string): { resultUrl: string | null; error: string | null; processing: boolean } {
  // Check for error events
  if (sseText.includes('event: error')) {
    const errorMatch = sseText.match(/event: error\ndata: (.+)/)
    return { resultUrl: null, error: errorMatch ? errorMatch[1] : 'Errore sconosciuto', processing: false }
  }

  let resultUrl: string | null = null
  const lines = sseText.split('\n')

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    try {
      const parsed = JSON.parse(line.slice(6))
      if (Array.isArray(parsed)) {
        // The /image endpoint returns [slider_result, file_result]
        // We want the file_result (index 1) which is the clean PNG output
        // Fall back to index 0 if index 1 is not available
        const fileResult = parsed[1] ?? parsed[0]
        if (fileResult) {
          const item = typeof fileResult === 'object' ? fileResult : null
          if (item?.url) {
            resultUrl = item.url
          } else if (item?.path) {
            resultUrl = `${HF_SPACE}/file=${item.path}`
          }
        }
      }
    } catch {
      // skip non-JSON data lines
    }
  }

  const processing = sseText.includes('process_starts') || sseText.includes('process_generating')
  return { resultUrl, error: null, processing }
}

// Process image via upload + /image endpoint
async function processViaUpload(imageBuffer: Buffer, mime: string): Promise<string> {
  // 1. Upload image
  const uploadForm = new FormData()
  uploadForm.append('files', new Blob([new Uint8Array(imageBuffer)], { type: mime }), 'image.png')

  const uploadRes = await fetchRetry(
    `${HF_SPACE}/upload`,
    { method: 'POST', body: uploadForm },
    { label: 'Upload' }
  )
  if (!uploadRes.ok) {
    throw new Error(`Upload fallito: ${uploadRes.status} ${await uploadRes.text().catch(() => '')}`)
  }
  const uploadPaths = await uploadRes.json()
  const filePath = uploadPaths[0]

  // 2. Call /image endpoint (NOT /predict - the space uses named endpoints)
  const callRes = await fetchRetry(
    `${HF_SPACE}/call/image`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          path: filePath,
          orig_name: 'image.png',
          size: imageBuffer.length,
          mime_type: mime,
        }],
      }),
    },
    { label: 'CallImage' }
  )
  if (!callRes.ok) {
    throw new Error(`Call /image fallito: ${callRes.status} ${await callRes.text().catch(() => '')}`)
  }
  const { event_id } = await callRes.json()

  // 3. Poll SSE result
  return await pollSSEResult(`${HF_SPACE}/call/image/${event_id}`)
}

// Process image via URL + /text endpoint (fallback)
async function processViaUrl(imageBuffer: Buffer, mime: string): Promise<string> {
  // Create a temporary data URL to pass to the /text endpoint
  const base64 = imageBuffer.toString('base64')
  const dataUrl = `data:${mime};base64,${base64}`

  const callRes = await fetchRetry(
    `${HF_SPACE}/call/text`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [dataUrl] }),
    },
    { label: 'CallText' }
  )
  if (!callRes.ok) {
    throw new Error(`Call /text fallito: ${callRes.status} ${await callRes.text().catch(() => '')}`)
  }
  const { event_id } = await callRes.json()

  return await pollSSEResult(`${HF_SPACE}/call/text/${event_id}`)
}

// Poll SSE endpoint until we get a result
async function pollSSEResult(sseUrl: string): Promise<string> {
  for (let poll = 0; poll < 10; poll++) {
    const sseRes = await fetchRetry(
      sseUrl,
      { method: 'GET' },
      { retries: 2, baseDelay: 3000, label: 'SSE' }
    )
    if (!sseRes.ok) {
      if (poll < 9) {
        await new Promise(r => setTimeout(r, 3000))
        continue
      }
      throw new Error(`SSE fallito: ${sseRes.status}`)
    }

    const sseText = await sseRes.text()
    const { resultUrl, error, processing } = parseSSEResult(sseText)

    if (error) throw new Error(`BRIA errore: ${error}`)
    if (resultUrl) return resultUrl

    if (processing || poll < 9) {
      await new Promise(r => setTimeout(r, 3000))
    }
  }
  throw new Error('Timeout: nessun risultato dal modello')
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
    const mime = mimeType || 'image/png'

    // Ensure space is awake
    await ensureSpaceReady()

    // Try /image endpoint first, fall back to /text endpoint
    let resultUrl: string
    try {
      resultUrl = await processViaUpload(imageBuffer, mime)
    } catch (uploadErr: any) {
      console.warn('[BRIA] /image endpoint failed, trying /text fallback:', uploadErr.message)
      resultUrl = await processViaUrl(imageBuffer, mime)
    }

    // Download the result image
    const imgRes = await fetchRetry(
      resultUrl,
      { method: 'GET' },
      { retries: 3, label: 'Download' }
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
