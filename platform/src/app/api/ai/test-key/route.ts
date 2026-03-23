import { NextResponse } from 'next/server'

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
