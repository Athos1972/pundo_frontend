// ─── Public CRM Opt-out Proxy (F7600) ─────────────────────────────────────────
// Routes POST /api/crm/opt-out → backend POST /api/v1/crm/opt-out.
// No admin_token — this is a public endpoint, rate-limited on the backend.
// Always returns neutral 200 to the browser (no enumeration, the backend answers 200 for unknown tokens too).
// B8950-016 T32: a backend failure (5xx, 429, unreachable) must not vanish: the opt-out was NOT recorded, so it is
// logged at error level (never the token) and shows up in the server log monitoring.

import { NextRequest, NextResponse } from 'next/server'
import { clientIpForwardHeaders } from '@/lib/proxy/client-ip'

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
      headers: { 'Content-Type': 'application/json', ...clientIpForwardHeaders(request.headers) },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      logOptOutFailure('backend_status', { status: res.status })
    }
    // Neutral: always 200 to the browser regardless of the backend response
    return NextResponse.json({ ok: true })
  } catch (err) {
    // Backend unreachable — still neutral 200 to the browser (R5), but loud in the log
    logOptOutFailure('backend_unreachable', { error: err instanceof Error ? err.name : 'unknown' })
    return NextResponse.json({ ok: true })
  }
}

/** Structured single-line error log without PII or token (the opt-out was not recorded). */
function logOptOutFailure(reason: string, extra: Record<string, string | number>): void {
  console.error(JSON.stringify({ event: 'crm_optout_not_recorded', reason, ...extra }))
}
