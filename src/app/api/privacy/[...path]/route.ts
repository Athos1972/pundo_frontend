import { NextRequest, NextResponse } from 'next/server'
import { clientIpForwardHeaders } from '@/lib/proxy/client-ip'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8500'
const ALLOWED = new Set(['privacy-requests', 'privacy-requests/confirm'])
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join('/')
  if (!ALLOWED.has(path)) return NextResponse.json({ detail: 'Not found' }, { status: 404 })
  const response = await fetch(`${BACKEND}/api/v1/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...clientIpForwardHeaders(request.headers) }, body: await request.text() })
  return new NextResponse(await response.blob(), { status: response.status, headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' } })
}
