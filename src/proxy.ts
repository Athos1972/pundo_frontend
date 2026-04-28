// =============================================================================
// src/proxy.ts — Next.js Proxy (seit Next 16 umbenannt von middleware)
//
// Drei Jobs in einem Proxy:
//
//   1) Brand-Detection: liest Host-Header → mappt auf Brand-Config →
//      setzt x-brand-slug Request-Header für Server Components
//
//   2) shop-admin Auth-Gate: wenn jemand /shop-admin/** besucht und
//      keinen Auth-Cookie hat, redirect zum Login. Oeffentliche Subpfade
//      (login/register/verify-email) sind ausgenommen.
//
//   3) Strict nonce-based Content-Security-Policy:
//      Pro Request wird ein frischer 128-Bit base64 Nonce erzeugt.
//      CSP-Direktiven (insb. connect-src, script-src) werden brand-spezifisch
//      befüllt um unterschiedliche Analytics-Hosts zu erlauben.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getBrandConfig } from '@/config/brands'

const PUBLIC_SHOP_ADMIN_PATHS = [
  '/shop-admin/login',
  '/shop-admin/register',
  '/shop-admin/verify-email',
]

// T17 — System-Admin Proxy-Gate (F6990 Phase 2, M7)
// Public paths under /admin/ that do NOT require the admin_token cookie.
const PUBLIC_ADMIN_PATHS = ['/admin/login']

const buildCsp = (nonce: string, analyticsHost?: string): string => {
  const analyticsConnectSrc = analyticsHost ? ` ${analyticsHost}` : ''
  const analyticsScriptSrc = analyticsHost ? ` ${analyticsHost}` : ''
  const isDev = process.env.NODE_ENV === 'development'

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}${analyticsScriptSrc} https://challenges.cloudflare.com`,
    // In dev: allow unsafe-inline without nonce (nonce + unsafe-inline doesn't work in CSP)
    // In prod: use nonce-only (strict)
    isDev ? `style-src 'self' 'unsafe-inline'` : `style-src 'self' 'nonce-${nonce}'`,
    // img: Kartenkacheln (CartoDB/OSM) und Leaflet-Marker-Icons (unpkg).
    // api.pundo.cy: Produktbilder werden als absolute URLs gerendert.
    `img-src 'self' data: blob: https://api.pundo.cy https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://unpkg.com`,
    `font-src 'self'`,
    `connect-src 'self'${analyticsConnectSrc} https://challenges.cloudflare.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-src https://challenges.cloudflare.com`,
    `frame-ancestors 'none'`,
  ]
  // Only enforce HTTPS upgrade in production
  if (process.env.NODE_ENV !== 'development') {
    directives.push(`upgrade-insecure-requests`)
  }
  return directives.join('; ')
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ---- Job 1: Brand-Detection -------------------------------------------
  const host = request.headers.get('host') ?? ''
  const brand = getBrandConfig(host)

  // ---- Job 2a: shop-admin auth-gate -------------------------------------
  if (
    pathname.startsWith('/shop-admin') &&
    !PUBLIC_SHOP_ADMIN_PATHS.some((p) => pathname.startsWith(p))
  ) {
    const token = request.cookies.get('shop_owner_token')
    if (!token?.value) {
      const loginUrl = new URL('/shop-admin/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ---- Job 2b: system-admin auth-gate (T17 — F6990 Phase 2) ------------
  // All /admin/** routes require the admin_token cookie, except the login page.
  if (
    pathname.startsWith('/admin') &&
    !PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))
  ) {
    const token = request.cookies.get('admin_token')
    if (!token?.value) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // ---- Job 3: CSP mit per-request nonce ---------------------------------
  const nonceBytes = new Uint8Array(16)
  crypto.getRandomValues(nonceBytes)
  const nonce = Buffer.from(nonceBytes).toString('base64')
  const csp = buildCsp(nonce, brand.analytics.plausibleHost)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)
  requestHeaders.set('x-brand-slug', brand.slug)

  // ---- Job 4: naidivse Coming-Soon-Rewrite --------------------------------
  // In development, skip the rewrite so the full layout can be tested locally.
  if (
    brand.slug === 'naidivse' &&
    process.env.NODE_ENV !== 'development' &&
    pathname !== '/coming-soon' &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_next/') &&
    !pathname.startsWith('/brands/')
  ) {
    const rewriteResponse = NextResponse.rewrite(new URL('/coming-soon', request.url), {
      request: { headers: requestHeaders },
    })
    rewriteResponse.headers.set('content-security-policy', csp)
    setSecurityHeaders(rewriteResponse.headers)
    return rewriteResponse
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set('content-security-policy', csp)
  setSecurityHeaders(response.headers)

  return response
}

// ---- T3: HTTP Security Headers -----------------------------------------------
// Applied to every HTML response (both prod and dev), except HSTS which is
// only set in production (HSTS over plain HTTP is ignored by browsers, but
// we keep it explicit to match the spec). No `preload` yet — add in Phase 3
// after subdomain inventory has been confirmed.
function setSecurityHeaders(headers: Headers): void {
  const isProd = process.env.NODE_ENV !== 'development'
  if (isProd) {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
  }
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()')
  headers.set('X-Frame-Options', 'DENY')
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next|api|brand_logos|product_images|review_photos|favicon.ico|manifest.webmanifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
