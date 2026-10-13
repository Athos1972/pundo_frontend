// T15 — Contact API Route with Turnstile verification (F6990 Phase 2)

import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, clientIpForwardHeaders } from '@/lib/proxy/client-ip'
import { verifyTurnstile } from '@/lib/turnstile-server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8500'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Parse JSON body to extract Turnstile token before forwarding
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ detail: 'Invalid request' }, { status: 400 })
  }

  const turnstileToken = typeof body?.turnstile_token === 'string' ? body.turnstile_token : ''

  // Client IP: rightmost X-Forwarded-For entry set by nginx (B6220-002)
  const ip = getClientIp(request.headers)

  const captchaOk = await verifyTurnstile(turnstileToken, ip)
  if (!captchaOk) {
    return NextResponse.json({ error: 'captcha_failed' }, { status: 400 })
  }

  // Forward to backend (without turnstile_token — backend does not need it for contact)
  const { turnstile_token: _token, ...forwardBody } = body

  let backendRes: Response
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...clientIpForwardHeaders(request.headers) },
      body: JSON.stringify(forwardBody),
    })
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 })
  }

  const data = await backendRes.json().catch(() => ({}))
  return NextResponse.json(data, { status: backendRes.status })
}
