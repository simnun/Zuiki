import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

export const maxDuration = 300

// Image generation models - ordered by quality/recency
const GEMINI_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
  'gemini-2.0-flash',
]

function geminiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageBase64, mimeType, prompt } = await req.json()

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_AI_API_KEY non configurata. Aggiungerla nelle env vars di Vercel.' }, { status: 500 })
  }

  const body = JSON.stringify({
    contents: [{
      parts: [
        ...(imageBase64 ? [{
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: imageBase64,
          },
        }] : []),
        { text: prompt },
      ],
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.4,
    },
  })

  let lastError = ''

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (!response.ok) {
        const err = await response.text()
        lastError = `${model}: HTTP ${response.status} - ${err.slice(0, 200)}`
        // If 403/401 on key, no point trying other models
        if (response.status === 403 || response.status === 401) {
          return NextResponse.json({ error: `API Key Google non valida o scaduta (${response.status}). Rigenera la chiave su aistudio.google.com/api-keys e aggiornala in Vercel.` }, { status: response.status })
        }
        continue // Try next model
      }

      const data = await response.json()

      // Extract image from response
      const candidates = data.candidates || []
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || []
        for (const part of parts) {
          if (part.inlineData?.data) {
            return NextResponse.json({
              imageBase64: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'image/png',
            })
          }
        }
      }

      // No image found in response
      const textParts = candidates[0]?.content?.parts?.filter((p: any) => p.text) || []
      const text = textParts.map((p: any) => p.text).join(' ')
      lastError = `${model}: nessuna immagine nella risposta. ${text.slice(0, 100)}`
      continue
    } catch (e: any) {
      lastError = `${model}: ${e.message}`
      continue
    }
  }

  return NextResponse.json({
    error: `Generazione immagine fallita con tutti i modelli. Ultimo errore: ${lastError}`,
  }, { status: 422 })
}
