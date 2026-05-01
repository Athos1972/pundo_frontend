import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public SEO paths that Google should be able to cache and index.
// The customer layout reads headers() for multi-brand detection, which opts every
// customer page into dynamic rendering and causes Next.js to emit
// "Cache-Control: private, no-cache, no-store". We override that here so
// Googlebot and CDNs see a cacheable response for content that is not
// user-specific.
// Exact matches for top-level pages
const PUBLIC_EXACT = new Set(['/', '/about', '/contact', '/for-shops'])

// Prefix matches for detail/listing pages
const PUBLIC_PREFIXES = [
  '/products/',
  '/shops/',
  '/guides/',
  '/categories/',
  '/legal/',
  '/help/',
  '/search',
  '/nostalgia',
  '/homesick',
]

const PUBLIC_CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic =
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))

  if (!isPublic) return NextResponse.next()

  const response = NextResponse.next()
  response.headers.set('Cache-Control', PUBLIC_CACHE)
  return response
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|manifest.webmanifest|sitemap.xml|robots.txt|brand_logos|product_images|review_photos|shop_logos).*)',
  ],
}
