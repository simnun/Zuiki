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
      return NextResponse.json({ ok: false, status: res.status, error: text.slice(0, 300) })
    }
    const data = await res.json()
    const models = (data.models || []).map((m: any) => m.name).filter((n: string) => n.includes('image') || n.includes('flash') || n.includes('imagen'))
    return NextResponse.json({ ok: true, models: models.slice(0, 30) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}

// POST: Test Imagen API (uses :predict endpoint, not :generateContent)
export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'GOOGLE_AI_API_KEY not set' })
  }

  const models = [
    'imagen-4.0-fast-generate-001',
    'imagen-4.0-generate-001',
  ]

  const results: any[] = []

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: 'A white t-shirt laid flat on a white background, flat lay photography, e-commerce product photo, top-down view' }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '1:1',
          },
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        results.push({ model, ok: false, status: res.status, error: err.slice(0, 300) })
        continue
      }

      const data = await res.json()
      const predictions = data.predictions || []
      if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
        results.push({ model, ok: true, imageLen: predictions[0].bytesBase64Encoded.length })
      } else {
        results.push({ model, ok: false, error: 'No image in response', response: JSON.stringify(data).slice(0, 300) })
      }
    } catch (e: any) {
      results.push({ model, ok: false, error: e.message })
    }
  }

  return NextResponse.json({ results })
}
