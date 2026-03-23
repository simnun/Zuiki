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

// POST: Test image generation with multiple models
export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'GOOGLE_AI_API_KEY not set' })
  }

  const models = [
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-3.1-flash-image-preview',
    'gemini-2.5-flash-image',
    'gemini-3-pro-image-preview',
  ]

  const results: any[] = []

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Generate a simple image of a white t-shirt laid flat on a pure white background.' }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 0.4,
          },
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        results.push({ model, ok: false, status: res.status, error: err.slice(0, 200) })
        continue
      }

      const data = await res.json()
      const candidates = data.candidates || []
      let hasImage = false
      for (const candidate of candidates) {
        for (const part of (candidate.content?.parts || [])) {
          if (part.inlineData?.data) {
            results.push({ model, ok: true, hasImage: true, mimeType: part.inlineData.mimeType, imageLen: part.inlineData.data.length })
            hasImage = true
            break
          }
        }
        if (hasImage) break
      }
      if (!hasImage) {
        const textParts = candidates[0]?.content?.parts?.filter((p: any) => p.text) || []
        results.push({ model, ok: true, hasImage: false, text: textParts.map((p: any) => p.text).join(' ').slice(0, 100) })
      }
    } catch (e: any) {
      results.push({ model, ok: false, error: e.message })
    }
  }

  return NextResponse.json({ results })
}
