// Dedicated logout handler — takes precedence over the catch-all proxy.
//
// Problem: Google OAuth sets customer_token via a backend redirect (not the
// Next.js proxy), so the cookie is stored in the browser *with* Domain=pundo.cy.
// The catch-all proxy strips Domain= from Set-Cookie headers, so neither the
// backend's clearing Set-Cookie nor a domain-free delete can match the original
// cookie → logout silently fails for Google-authenticated users.
//
// Fix: send TWO Set-Cookie delete headers in the browser response:
//   1. Without Domain  → clears host-only cookie (Email/OTP users)
//   2. With Domain=... → clears domain-scoped cookie (Google OAuth users)
//
// COOKIE_DOMAIN must mirror the backend's AUTH_COOKIE_DOMAIN env var.
// Prod (both pundo.cy and naidivse.cy): COOKIE_DOMAIN=pundo.cy
// Local dev: COOKIE_DOMAIN="" (empty) — Google OAuth not testable locally anyway.

import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8500'
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? ''

// Build a Set-Cookie string that expires customer_token immediately.
function buildDeleteHeader(domain?: string): string {
  const base = 'customer_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
  return domain ? `${base}; Domain=${domain}; Secure` : base
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Read token directly from the incoming request cookies (no next/headers needed).
  const token = request.cookies.get('customer_token')?.value

  // Best-effort backend session invalidation — fire-and-forget on failure.
  if (token) {
    try {
      await fetch(`${BACKEND}/api/v1/customer/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Backend unreachable — proceed with cookie deletion anyway.
    }
  }

  // Build response with explicit cookie-clearing headers.
  const responseHeaders = new Headers()

  // Belt: clear host-only cookie (Email/OTP users, or any env without COOKIE_DOMAIN).
  responseHeaders.append('Set-Cookie', buildDeleteHeader())

  // Suspenders: clear domain-scoped cookie (Google OAuth users in production).
  if (COOKIE_DOMAIN) {
    responseHeaders.append('Set-Cookie', buildDeleteHeader(COOKIE_DOMAIN))
  }

  return new NextResponse(null, { status: 204, headers: responseHeaders })
}
