// =============================================================================
// src/proxy.ts — Next.js Proxy (ehemals middleware, seit Next 16 umbenannt)
// =============================================================================
//
// Zwei Jobs in einem Proxy (Next.js erlaubt nur einen proxy.ts pro App):
//
//   1) shop-admin Auth-Gate (Bestand): wenn jemand /shop-admin/** besucht und
//      keinen Auth-Cookie hat, redirect zum Login. Oeffentliche Subpfade
//      (login/register/verify-email) sind ausgenommen. Echtes JWT-Validation
//      passiert weiter im Backend bei jedem API-Call — dies hier ist nur
//      ein schneller Praesenz-Check um unnoetige Roundtrips zu sparen.
//
//   2) Strict nonce-based Content-Security-Policy (neu, 2026-04-15):
//      Pro Request wird ein frischer 128-Bit base64 Nonce erzeugt und ueber
//      den `x-nonce` Request-Header an die Next.js-Render-Pipeline
//      weitergereicht. Der Nonce erscheint im CSP-Header als
//      `'nonce-...'` und wird von Next.js automatisch an seine eigenen
//      Inline-Scripts angehaengt. `strict-dynamic` erlaubt dem nonced
//      Bootstrap-Script, weitere Scripts nachzuladen, ohne dass die ebenfalls
//      Nonces brauchen — das ist die moderne empfohlene CSP-Strategie
//      (https://csp.withgoogle.com/docs/strict-csp.html).
//
//      style-src enthaelt zusaetzlich 'unsafe-inline' als Fallback fuer
//      styled-jsx, das Inline-Styles ohne Nonce-Tagging produziert. In
//      Browsern die strict-dynamic unterstuetzen, hat der Nonce Vorrang
//      und 'unsafe-inline' wird ignoriert.
//
//      frame-ancestors 'none' ersetzt X-Frame-Options fuer moderne Browser.
//
// Matcher: Deckt ALLE Pfade ab ausser die, die direkt an den Backend-Container
// proxien (api/v1, brand_logos, product_images) sowie Framework-eigene
// statische Assets (_next/static, _next/image, favicon). Prefetch-Requests
// werden ebenfalls uebersprungen, damit der Nonce nur fuer "echte"
// HTML-Navigation generiert wird.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'

// Paths within /shop-admin that don't require authentication
const PUBLIC_SHOP_ADMIN_PATHS = [
  '/shop-admin/login',
  '/shop-admin/register',
  '/shop-admin/verify-email',
]

const buildCsp = (nonce: string): string =>
  [
    `default-src 'self'`,
    // strict-dynamic: nonced script darf weitere Scripts laden. Host-Allowlists
    // werden in modernen Browsern ignoriert wenn ein Nonce vorhanden ist.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // 'unsafe-inline' als Fallback fuer styled-jsx (keine Nonce-Unterstuetzung);
    // in Browsern die nonces unterstuetzen, wird es ignoriert.
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    // img: Kartenkacheln (CartoDB/OSM) und Leaflet-Marker-Icons (unpkg) ergaenzt 2026-04-15.
    // api.pundo.cy ergaenzt 2026-04-16: das Frontend rendert <img>-Tags fuer
    // Produkt-/Brand-/Review-Bilder seit dem image-variants-Release als
    // ABSOLUTE URLs auf https://api.pundo.cy/product_images/... — das ist
    // ein anderer Origin als pundo.cy, faellt also nicht unter 'self'.
    // Ohne dieses Whitelisting werden alle Produktbilder still vom Browser
    // geblockt.
    `img-src 'self' data: blob: https://api.pundo.cy https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://unpkg.com`,
    `font-src 'self'`,
    // connect: Plausible Analytics self-hosted — Tracker postet Events an /api/event
    // auf plausible.pundo.cy. Ohne diesen Eintrag wuerde der Browser jeden Pageview blockieren.
    `connect-src 'self' https://plausible.pundo.cy`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ---- Job 1: shop-admin auth-gate --------------------------------------
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

  // ---- Job 2: CSP mit per-request nonce ---------------------------------
  const nonceBytes = new Uint8Array(16)
  crypto.getRandomValues(nonceBytes)
  const nonce = Buffer.from(nonceBytes).toString('base64')
  const csp = buildCsp(nonce)

  // Nonce + CSP in den REQUEST-Header — Next.js liest ihn dort aus um den
  // Nonce in seine eigenen Inline-Scripts zu injizieren.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  // ...und natuerlich in den RESPONSE-Header, damit der Browser ihn erzwingt.
  response.headers.set('content-security-policy', csp)

  return response
}

// Matcher: alles ausser direkte Backend-Proxies und Framework-Assets.
// 'missing' schliesst Prefetch-Requests aus (die holen keinen HTML-Inhalt
// und brauchen keinen frischen Nonce).
export const config = {
  matcher: [
    {
      source:
        '/((?!api/v1|brand_logos|product_images|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
