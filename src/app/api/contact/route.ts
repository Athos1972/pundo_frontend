// T15 — Contact API Route (F6990 Phase 2, B6220-003)
//
// Turnstile is verified ONLY by the backend (tokens are single-use, a second
// siteverify here would make the backend check fail). This route forwards the
// body including `turnstile_token` and maps the backend error contract:
//   400 {detail:'captcha_failed'} -> 400 {error:'captcha_failed'}
//   429                           -> 429 {error:'rate_limited'}

import { NextRequest, NextResponse } from 'next/server'
import { clientIpForwardHeaders } from '@/lib/proxy/client-ip'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8500'

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ detail: 'Invalid request' }, { status: 400 })
  }

  let backendRes: Response
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...clientIpForwardHeaders(request.headers) },
      body: JSON.stringify(body),
    })
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 })
  }

  const data = await backendRes.json().catch(() => ({}))
  if (backendRes.status === 400 && data?.detail === 'captcha_failed') {
    return NextResponse.json({ error: 'captcha_failed' }, { status: 400 })
  }
  if (backendRes.status === 429) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }
  return NextResponse.json(data, { status: backendRes.status })
}
