// T13 — Cloudflare Turnstile server-side verification helper (F6990 Phase 2)
//
// Usage in a Next.js Route Handler:
//   const ok = await verifyTurnstile(token, request.headers.get('cf-connecting-ip') ?? undefined)
//   if (!ok) return Response.json({ detail: 'captcha_failed' }, { status: 400 })

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 *
 * - Fails closed (returns false) on network errors.
 * - In development, if TURNSTILE_SECRET_KEY is not set, returns true with a
 *   console warning so that local development is not blocked.
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[turnstile-server] TURNSTILE_SECRET_KEY not set — skipping verification in development.',
      )
      return true
    }
    // In production without a secret, fail closed.
    console.error('[turnstile-server] TURNSTILE_SECRET_KEY is not set in production!')
    return false
  }

  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.set('remoteip', ip)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      // Cloudflare typically responds in well under 5 s; cap at 8 s to be safe.
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      console.warn('[turnstile-server] Turnstile verify returned HTTP', res.status)
      return false
    }

    const data: TurnstileVerifyResponse = await res.json()
    return data.success === true
  } catch (err) {
    console.warn('[turnstile-server] Network error during Turnstile verify:', err)
    return false
  }
}
