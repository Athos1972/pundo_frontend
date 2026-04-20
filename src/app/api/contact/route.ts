import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get('content-type') ?? 'application/json'
  const body = await request.blob()

  let backendRes: Response
  try {
    backendRes = await fetch(`${BACKEND}/api/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    })
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 })
  }

  const data = await backendRes.json().catch(() => ({}))
  return NextResponse.json(data, { status: backendRes.status })
}
