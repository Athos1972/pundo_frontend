// ─── Nominatim Geocoding Proxy ────────────────────────────────────────────────
// Proxies address search (?q=) and reverse (?lat=&lon=) requests to Nominatim with a proper User-Agent header
// (required by Nominatim Usage Policy). Used by the admin LocationEditor.

import { NextRequest, NextResponse } from 'next/server'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'
const HEADERS = {
  'User-Agent': 'pundo-admin/1.0 (https://pundo.app)',
  'Accept-Language': 'en',
}

// Reverse mode: ?lat=..&lon=.. -> { display_name } (object, not array). Browser must not call
// Nominatim directly (CSP connect-src).
async function reverse(latRaw: string, lonRaw: string): Promise<NextResponse> {
  const lat = Number(latRaw)
  const lon = Number(lonRaw)
  if (
    latRaw.trim() === '' || lonRaw.trim() === '' ||
    !Number.isFinite(lat) || !Number.isFinite(lon) ||
    lat < -90 || lat > 90 || lon < -180 || lon > 180
  ) {
    return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 })
  }
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), format: 'json' })
  try {
    const res = await fetch(`${NOMINATIM_REVERSE}?${params.toString()}`, { headers: HEADERS })
    if (!res.ok) {
      return NextResponse.json({}, { status: res.status })
    }
    const data = await res.json() as { display_name?: string }
    return NextResponse.json({ display_name: data.display_name })
  } catch {
    return NextResponse.json({}, { status: 502 })
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const latRaw = request.nextUrl.searchParams.get('lat')
  const lonRaw = request.nextUrl.searchParams.get('lon')
  if (latRaw !== null || lonRaw !== null) {
    return reverse(latRaw ?? '', lonRaw ?? '')
  }

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
      headers: HEADERS,
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
