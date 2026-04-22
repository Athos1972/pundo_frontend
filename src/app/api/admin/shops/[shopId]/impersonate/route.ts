// ─── Admin Shop-Owner Impersonation ───────────────────────────────────────────
// Calls the backend impersonation endpoint and sets the shop_owner_token cookie
// server-side (HttpOnly). Takes priority over the catch-all /api/admin/[...path].

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'

interface RouteContext {
  params: Promise<{ shopId: string }>
}

export async function POST(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { shopId } = await context.params
  const store = await cookies()
  const adminToken = store.get('admin_token')?.value

  if (!adminToken) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  }

  let backendRes: Response
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/admin/shops/${shopId}/impersonate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 })
  }

  if (!backendRes.ok) {
    const body = await backendRes.json().catch(() => ({ detail: 'Unknown error' }))
    return NextResponse.json(body, { status: backendRes.status })
  }

  const data = (await backendRes.json()) as { shop_owner_token: string }

  store.set('shop_owner_token', data.shop_owner_token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60,
  })

  return NextResponse.json({ success: true })
}
