import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'GOOGLE_AI_API_KEY not set' })
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    )
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({
        ok: false,
        status: res.status,
        error: text.slice(0, 300),
        keyPrefix: apiKey.slice(0, 10) + '...',
      })
    }
    const data = await res.json()
    const models = (data.models || []).map((m: any) => m.name).filter((n: string) => n.includes('image') || n.includes('flash'))
    return NextResponse.json({ ok: true, models: models.slice(0, 20), keyPrefix: apiKey.slice(0, 10) + '...' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}

// POST: Test image generation
export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'GOOGLE_AI_API_KEY not set' })
  }

  const model = 'gemini-2.5-flash-image'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Generate a simple image of a white t-shirt laid flat on a pure white background, seen from above, flat lay photography style.' }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          temperature: 0.4,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ ok: false, model, status: res.status, error: err.slice(0, 500) })
    }

    const data = await res.json()
    const candidates = data.candidates || []
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || []
      for (const part of parts) {
        if (part.inlineData?.data) {
          return NextResponse.json({
            ok: true,
            model,
            mimeType: part.inlineData.mimeType,
            imageBase64Length: part.inlineData.data.length,
          })
        }
      }
    }

    return NextResponse.json({ ok: false, model, error: 'No image in response', response: JSON.stringify(data).slice(0, 500) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, model, error: e.message })
  }
}
