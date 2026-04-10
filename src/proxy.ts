import { NextRequest, NextResponse } from 'next/server'

// Paths within /shop-admin that don't require authentication
const PUBLIC_PATHS = [
  '/shop-admin/login',
  '/shop-admin/register',
  '/shop-admin/verify-email',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/shop-admin')) return NextResponse.next()

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  // Check for auth cookie — actual JWT validation happens in API calls
  // Proxy only checks presence to avoid the round-trip to the backend on every request
  const token = request.cookies.get('shop_owner_token')
  if (!token?.value) {
    const loginUrl = new URL('/shop-admin/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/shop-admin/:path*',
}
