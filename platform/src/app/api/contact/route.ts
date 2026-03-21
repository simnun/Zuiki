import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, company, message } = body

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
    }

    // Try sending via Resend if configured
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      await resend.emails.send({
        from: process.env.RESEND_FROM || 'Catalogo AI <noreply@zuiki.it>',
        to: process.env.CONTACT_EMAIL || 'info@zuiki.it',
        subject: `[Catalogo AI] Nuova richiesta da ${name}`,
        html: `
          <h2>Nuova richiesta di contatto</h2>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Azienda:</strong> ${company || 'Non specificata'}</p>
          <p><strong>Messaggio:</strong></p>
          <p>${message}</p>
        `,
      })
    }

    // Log the contact request
    console.log('[CONTACT]', { name, email, company, message: message.slice(0, 200) })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[CONTACT ERROR]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
