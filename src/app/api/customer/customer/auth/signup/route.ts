// T16 — Customer Signup Route with Turnstile verification (F6990 Phase 2)
//
// This specific route takes precedence over the catch-all /api/customer/[...path]/route.ts
// for POST /api/customer/customer/auth/signup calls.
//
// Responsibilities:
// 1. Verify Turnstile token (frontend-side, fail fast)
// 2. Forward to backend including turnstile_token in body (for backend-side verify once T12-BE is active)
// 3. Forward Set-Cookie for customer_token on successful signup

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyTurnstile } from '@/lib/turnstile-server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ detail: 'Invalid request' }, { status: 400 })
  }

  const turnstileToken = typeof body?.turnstile_token === 'string' ? body.turnstile_token : ''

  // Client IP from Cloudflare header or x-forwarded-for
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    undefined

  // Frontend-side Turnstile verification (fail fast before hitting backend)
  const captchaOk = await verifyTurnstile(turnstileToken, ip)
  if (!captchaOk) {
    return NextResponse.json({ error: 'captcha_failed' }, { status: 400 })
  }

  // Forward to backend — token included so backend can verify independently (T12-BE)
  const acceptLang = request.headers.get('accept-language')
  const store = await cookies()
  const existingToken = store.get('customer_token')?.value

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (acceptLang) headers['Accept-Language'] = acceptLang
  if (existingToken) headers['Authorization'] = `Bearer ${existingToken}`

  let backendRes: Response
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/customer/auth/signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 })
  }

  const responseHeaders = new Headers()

  // Forward Set-Cookie so the browser receives customer_token on successful signup
  const setCookie = backendRes.headers.get('set-cookie')
  if (setCookie) responseHeaders.set('set-cookie', setCookie)

  const responseContentType = backendRes.headers.get('content-type')
  if (responseContentType) responseHeaders.set('content-type', responseContentType)

  if (backendRes.status === 204) {
    return new NextResponse(null, { status: 204, headers: responseHeaders })
  }

  const responseBody = await backendRes.blob()
  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers: responseHeaders,
  })
}
