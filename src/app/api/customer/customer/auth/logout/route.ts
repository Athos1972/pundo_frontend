// Dedicated logout handler — takes precedence over the catch-all proxy.
//
// Problem: Google OAuth sets customer_token via a backend redirect (not the
// Next.js proxy), so the cookie is stored in the browser *with* Domain=.pundo.cy.
// The catch-all proxy strips Domain= from Set-Cookie headers, so the backend's
// clearing Set-Cookie can't match the original cookie → logout silently fails
// for Google-authenticated users.
//
// Fix: delete the cookie server-side via Next.js cookies() API, which bypasses
// the Domain mismatch and clears the cookie unconditionally. Then also forward
// the logout call to the backend so it can invalidate the server-side session.

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8500'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const store = await cookies()
  const token = store.get('customer_token')?.value

  // Best-effort backend session invalidation
  if (token) {
    try {
      await fetch(`${BACKEND}/api/v1/customer/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Backend unreachable — proceed with client-side cookie deletion anyway
    }
  }

  // Delete the cookie server-side — works regardless of how Domain was set
  store.delete('customer_token')

  return new NextResponse(null, { status: 204 })
}
