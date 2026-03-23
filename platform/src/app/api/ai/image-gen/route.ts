import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

export const maxDuration = 300

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageBase64, mimeType, prompt } = await req.json()

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_AI_API_KEY non configurata' }, { status: 500 })
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        }],
        generationConfig: {
          responseModalities: ['Text', 'Image'],
          temperature: 0.4,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `Gemini API error ${response.status}: ${err.slice(0, 300)}` }, { status: response.status })
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

    // No image generated - return text response if any
    const textParts = candidates[0]?.content?.parts?.filter((p: any) => p.text) || []
    const text = textParts.map((p: any) => p.text).join(' ')

    return NextResponse.json({
      error: text || 'Nessuna immagine generata. Il modello potrebbe non aver compreso la richiesta.',
    }, { status: 422 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Errore nella generazione immagine' }, { status: 500 })
  }
}
