// ─── Nominatim Geocoding Proxy ────────────────────────────────────────────────
// Proxies address search requests to Nominatim with a proper User-Agent header
// (required by Nominatim Usage Policy). Used by the admin LocationEditor.

import { NextRequest, NextResponse } from 'next/server'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.trim().length < 3) {
    return NextResponse.json([])
  }

  const params = new URLSearchParams({
    q: q.trim(),
    format: 'json',
    limit: '5',
    addressdetails: '0',
  })

  try {
    const res = await fetch(`${NOMINATIM}?${params.toString()}`, {
      headers: {
        'User-Agent': 'pundo-admin/1.0 (https://pundo.app)',
        'Accept-Language': 'en',
      },
    })

    if (!res.ok) {
      return NextResponse.json([], { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 502 })
  }
}
