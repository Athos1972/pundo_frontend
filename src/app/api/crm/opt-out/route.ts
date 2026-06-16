// ─── Public CRM Opt-out Proxy (F7600) ─────────────────────────────────────────
// Routes POST /api/crm/opt-out → backend POST /api/v1/crm/opt-out.
// No admin_token — this is a public endpoint, rate-limited on the backend.
// Always returns neutral 200 to avoid enumeration.

import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8500'

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  try {
    const res = await fetch(`${BACKEND}/api/v1/crm/opt-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    // Neutral: always 200 to frontend regardless of backend response
    const _data = await res.json().catch(() => ({ ok: true }))
    return NextResponse.json({ ok: true })
  } catch {
    // Backend unreachable — still return neutral 200 (R5: no enumeration)
    return NextResponse.json({ ok: true })
  }
}
