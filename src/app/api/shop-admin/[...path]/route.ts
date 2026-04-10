// ─── Shop-Admin Catch-All Proxy Route Handler ─────────────────────────────────
// Reads the HttpOnly shop_owner_token cookie and proxies authenticated requests
// to the backend. Client Components call /api/shop-admin/... (same-origin),
// this handler attaches Authorization and forwards to BACKEND_URL.

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'

interface RouteContext {
  params: Promise<{ path: string[] }>
}

async function proxy(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params
  const store = await cookies()
  const token = store.get('shop_owner_token')?.value

  const targetPath = path.join('/')
  const search = request.nextUrl.search
  const url = `${BACKEND}/api/v1/shop-owner/${targetPath}${search}`

  const headers: Record<string, string> = {}
  const contentType = request.headers.get('content-type')
  if (contentType) headers['Content-Type'] = contentType
  if (token) headers['Authorization'] = `Bearer ${token}`

  const hasBody = !['GET', 'HEAD'].includes(request.method)
  const body = hasBody ? await request.blob() : undefined

  let backendRes: Response
  try {
    backendRes = await fetch(url, { method: request.method, headers, body })
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 })
  }

  const responseBody = await backendRes.blob()
  const responseHeaders = new Headers()

  // Forward Set-Cookie so login can set the auth cookie on the browser
  const setCookie = backendRes.headers.get('set-cookie')
  if (setCookie) responseHeaders.set('set-cookie', setCookie)

  const responseContentType = backendRes.headers.get('content-type')
  if (responseContentType) responseHeaders.set('content-type', responseContentType)

  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers: responseHeaders,
  })
}

export const GET = (req: NextRequest, ctx: RouteContext) => proxy(req, ctx)
export const POST = (req: NextRequest, ctx: RouteContext) => proxy(req, ctx)
export const PATCH = (req: NextRequest, ctx: RouteContext) => proxy(req, ctx)
export const PUT = (req: NextRequest, ctx: RouteContext) => proxy(req, ctx)
export const DELETE = (req: NextRequest, ctx: RouteContext) => proxy(req, ctx)
