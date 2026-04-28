// T14 — Coming-Soon API Route (F6990 Phase 2)
//
// Removed: FS-append to data/naidivse-signups.txt
// Added: Cloudflare Turnstile verification + backend proxy to POST /api/v1/coming-soon

import { NextRequest, NextResponse } from 'next/server'
import { verifyTurnstile } from '@/lib/turnstile-server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'

export async function POST(req: NextRequest): Promise<NextResponse> {
  let email: string
  let turnstileToken: string | undefined

  try {
    const body = await req.json()
    email = String(body?.email ?? '').trim()
    turnstileToken = typeof body?.turnstile_token === 'string' ? body.turnstile_token : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!email || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  // Turnstile verification — client IP from Cloudflare header or x-forwarded-for
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    undefined

  const captchaOk = await verifyTurnstile(turnstileToken ?? '', ip)
  if (!captchaOk) {
    return NextResponse.json({ error: 'captcha_failed' }, { status: 400 })
  }

  // Forward to backend (which persists to DB and applies rate limiting)
  let backendRes: Response
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/coming-soon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, turnstile_token: turnstileToken }),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 502 })
  }

  const data = await backendRes.json().catch(() => ({}))
  return NextResponse.json(data, { status: backendRes.status })
}
