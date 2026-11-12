import { NextRequest, NextResponse } from 'next/server'
import { clientIpForwardHeaders } from '@/lib/proxy/client-ip'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8500'
const POST_ALLOWED = new Set(['privacy-requests', 'privacy-requests/confirm', 'privacy-requests/external-download/confirm'])

async function pathOf(context: { params: Promise<{ path: string[] }> }) {
  return (await context.params).path.join('/')
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = await pathOf(context)
  if (!POST_ALLOWED.has(path)) return NextResponse.json({ detail: 'Not found' }, { status: 404 })
  const response = await fetch(`${BACKEND}/api/v1/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...clientIpForwardHeaders(request.headers) }, body: await request.text() })
  // Fetch returns an empty 204 after consuming the fragment token.  Passing a
  // Blob here is invalid per the Fetch Response constructor and made the
  // otherwise successful grant look like a server error in Next.js.
  const forwarded = new NextResponse(response.status === 204 ? null : await response.blob(), { status: response.status, headers: { 'content-type': response.headers.get('content-type') ?? 'application/json', 'cache-control': response.headers.get('cache-control') ?? 'no-store', 'referrer-policy': response.headers.get('referrer-policy') ?? 'no-referrer' } })
  const grant = response.headers.get('x-privacy-download-grant')
  const exportId = response.headers.get('x-privacy-export-id')
  if (grant && exportId) {
    forwarded.cookies.set('privacy_download_grant', grant, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 300,
      path: `/api/privacy/privacy-exports/${encodeURIComponent(exportId)}/download`,
    })
    forwarded.headers.set('x-privacy-export-id', exportId)
  }
  return forwarded
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = await pathOf(context)
  if (!/^privacy-exports\/[0-9a-f-]+\/download$/i.test(path)) return NextResponse.json({ detail: 'Not found' }, { status: 404 })
  const response = await fetch(`${BACKEND}/api/v1/${path}`, { method: 'GET', headers: { cookie: request.headers.get('cookie') ?? '', ...clientIpForwardHeaders(request.headers) } })
  const forwarded = new NextResponse(await response.blob(), { status: response.status, headers: { 'content-type': response.headers.get('content-type') ?? 'application/json', 'content-disposition': response.headers.get('content-disposition') ?? '', 'cache-control': response.headers.get('cache-control') ?? 'no-store', 'referrer-policy': response.headers.get('referrer-policy') ?? 'no-referrer', 'x-content-type-options': response.headers.get('x-content-type-options') ?? 'nosniff' } })
  // Keep the consumed grant for one retry so the backend can distinguish a
  // used download (410) from an unknown visitor (404); clear it on that
  // terminal response instead.
  if (response.status === 410) forwarded.cookies.set('privacy_download_grant', '', { maxAge: 0, path: `/api/privacy/${path}` })
  return forwarded
}
