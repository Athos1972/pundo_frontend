// T16 — Customer Signup Route (F6990 Phase 2, B6220-003)
//
// This specific route takes precedence over the catch-all /api/customer/[...path]/route.ts
// for POST /api/customer/customer/auth/signup calls.
//
// Responsibilities:
// 1. Forward to backend including turnstile_token in body. The BACKEND is the only
//    Turnstile verifier (tokens are single-use; B6220-003).
// 2. Map backend errors: 400 {detail:'captcha_failed'} -> {error:'captcha_failed'},
//    429 -> {error:'rate_limited'}
// 3. Forward Set-Cookie for customer_token on successful signup

import { cookies } from 'next/headers'
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

  // Forward to backend — token included, the backend verifies it
  const acceptLang = request.headers.get('accept-language')
  const store = await cookies()
  const existingToken = store.get('customer_token')?.value

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (acceptLang) headers['Accept-Language'] = acceptLang
  Object.assign(headers, clientIpForwardHeaders(request.headers))
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

  if (backendRes.status === 429) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  if (backendRes.status === 400) {
    const text = await backendRes.text()
    let detail: unknown
    try {
      detail = JSON.parse(text)?.detail
    } catch {
      detail = undefined
    }
    if (detail === 'captcha_failed') {
      return NextResponse.json({ error: 'captcha_failed' }, { status: 400 })
    }
    return new NextResponse(text, { status: 400, headers: responseHeaders })
  }

  const responseBody = await backendRes.blob()
  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers: responseHeaders,
  })
}
