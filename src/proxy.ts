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
import { LANGS, DEFAULT_LANG, type Lang } from '@/lib/lang'

// ---- i18n routing constants -----------------------------------------------
const LANG_SET = new Set<string>(LANGS)
const LANG_COOKIE = 'app_lang'

// Paths that bypass i18n redirect entirely (keep language-agnostic)
const I18N_BYPASS_PREFIXES = [
  '/_next', '/api', '/admin', '/shop-admin', '/auth', '/account', '/oauth',
  '/favicon', '/og', '/brands', '/brand_logos', '/manifest.webmanifest',
  '/robots.txt', '/sitemap.xml', '/llms.txt', '/__playwright',
  '/product_images', '/review_photos', '/shop_logos', '/avatars',
]

function shouldBypassI18n(pathname: string): boolean {
  // Static files with extensions
  if (/\.[a-zA-Z0-9]{1,10}$/.test(pathname)) return true
  return I18N_BYPASS_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

function detectLang(request: NextRequest): Lang {
  const cookieLang = request.cookies.get(LANG_COOKIE)?.value
  if (cookieLang && LANG_SET.has(cookieLang)) return cookieLang as Lang
  const acceptLanguage = request.headers.get('accept-language') ?? ''
  for (const raw of acceptLanguage.split(',')) {
    const code = raw.trim().split(';')[0].split('-')[0].toLowerCase()
    if (LANG_SET.has(code)) return code as Lang
  }
  return DEFAULT_LANG
}

// Public SEO paths — these get a cacheable Cache-Control header so Googlebot
// and CDNs can cache them (Next.js dynamic rendering emits private/no-store by default).
// Paths are matched after stripping the lang prefix (e.g. /en/about → /about).
const SEO_PUBLIC_EXACT = new Set(['/', '/about', '/contact', '/for-shops'])
const SEO_PUBLIC_PREFIXES = [
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
const SEO_CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400'

/** Strip the leading /{lang} prefix for SEO cache matching */
function stripLangForCache(pathname: string): string {
  const segments = pathname.split('/')
  if (segments[1] && LANG_SET.has(segments[1])) {
    const rest = segments.slice(2).join('/')
    return rest ? `/${rest}` : '/'
  }
  return pathname
}

const PUBLIC_SHOP_ADMIN_PATHS = [
  '/shop-admin/login',
  '/shop-admin/register',
  '/shop-admin/onboarding',
  '/shop-admin/auth/callback',
  '/shop-admin/verify-email',
]

// T17 — System-Admin Proxy-Gate (F6990 Phase 2, M7)
// Public paths under /admin/ that do NOT require the admin_token cookie.
const PUBLIC_ADMIN_PATHS = ['/admin/login']

const buildCsp = (nonce: string, analyticsHost?: string, metaPixelEnabled = false): string => {
  const analyticsConnectSrc = analyticsHost ? ` ${analyticsHost}` : ''
  const analyticsScriptSrc = analyticsHost ? ` ${analyticsHost}` : ''
  // Meta Pixel needs connect-src + img-src. script-src is covered by strict-dynamic.
  const metaConnectSrc = metaPixelEnabled ? ' https://www.facebook.com https://connect.facebook.net' : ''
  const metaImgSrc = metaPixelEnabled ? ' https://www.facebook.com' : ''
  const isDev = process.env.NODE_ENV === 'development'

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}${analyticsScriptSrc} https://challenges.cloudflare.com`,
    // style-src intentionally 'unsafe-inline': CSS injection risk is low; nonces/hashes can't cover
    // dynamic style= attributes in React (e.g. Leaflet maps, calculated widths). script-src remains strict.
    `style-src 'self' 'unsafe-inline'`,
    // img: Kartenkacheln (CartoDB/OSM) und Leaflet-Marker-Icons (unpkg).
    // api.pundo.cy: Produktbilder werden als absolute URLs gerendert.
    `img-src 'self' data: blob: https://api.pundo.cy https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://unpkg.com https://*.supabase.co${metaImgSrc}`,
    `font-src 'self'`,
    `connect-src 'self'${analyticsConnectSrc}${metaConnectSrc} https://challenges.cloudflare.com https://app.trysoro.com`,
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

  // ---- Job 0: i18n Routing (F6300) --------------------------------------
  // Redirect bare paths to /{lang}/path. Paths under admin/auth/account/api
  // are bypassed — they stay language-agnostic.
  if (!shouldBypassI18n(pathname)) {
    const segments = pathname.split('/')
    const firstSegment = segments[1] ?? ''
    if (!LANG_SET.has(firstSegment)) {
      // No lang prefix → redirect to detected lang
      const preferredLang = detectLang(request)
      const url = request.nextUrl.clone()
      url.pathname = `/${preferredLang}${pathname === '/' ? '' : pathname}`
      // 307 in dev (avoids caching), 308 in production (SEO-friendly permanent)
      const statusCode = process.env.NODE_ENV === 'development' ? 307 : 308
      return NextResponse.redirect(url, statusCode)
    }
    // Valid lang prefix present — forward lang via header so getLangServer()
    // reads the correct value even on first visit (before cookie is stored).
    // Also sync cookie on response if it drifted.
    const currentCookie = request.cookies.get(LANG_COOKIE)?.value
    if (currentCookie !== firstSegment) {
      ;(request as NextRequest & { _detectedLang?: string })._detectedLang = firstSegment
    }
    // Always inject x-lang header so Server Components get the right lang
    ;(request as NextRequest & { _xLang?: string })._xLang = firstSegment
  }

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
  const csp = buildCsp(nonce, brand.analytics.plausibleHost, !!brand.analytics.metaPixelId)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)
  requestHeaders.set('x-brand-slug', brand.slug)

  // Forward detected lang so getLangServer() reads it on every request
  const xLang = (request as NextRequest & { _xLang?: string })._xLang
  if (xLang) {
    requestHeaders.set('x-lang', xLang)
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set('content-security-policy', csp)
  setSecurityHeaders(response.headers)

  // Sync app_lang cookie when URL lang differs from stored cookie
  const detectedLang = (request as NextRequest & { _detectedLang?: string })._detectedLang
  if (detectedLang) {
    response.cookies.set(LANG_COOKIE, detectedLang, {
      maxAge: 31_536_000,
      path: '/',
      sameSite: 'lax',
    })
  }

  // SEO cache-control for public content pages (match against lang-stripped path)
  const strippedPath = stripLangForCache(pathname)
  if (SEO_PUBLIC_EXACT.has(strippedPath) || SEO_PUBLIC_PREFIXES.some((p) => strippedPath.startsWith(p))) {
    response.headers.set('Cache-Control', SEO_CACHE)
  }

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
        '/((?!_next|api|brand_logos|product_images|review_photos|avatars|favicon.ico|manifest.webmanifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
