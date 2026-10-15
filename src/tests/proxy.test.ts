import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy, config } from '@/proxy'

/**
 * Verhaltenstests fuer src/proxy.ts (i18n-Routing, Auth-Gates, CSP, Security-Header, Cache-Control).
 *
 * F8950 T33: ersetzt `proxy-public-paths.test.ts`, das den Quelltext von proxy.ts per Regex/`toContain` las (z. B.
 * `expect(proxySrc).toContain("'/avatars'")`). Die Regression-Anlaesse bleiben erhalten (F5910 Onboarding-Pfade,
 * N7500 Soro-CSP, Avatar-Bypass, Observatory-secure-Cookie, 307+Vary); geprueft wird jetzt, was `proxy()` mit einem
 * Request tut.
 */

function req(path: string, init: { headers?: Record<string, string>; cookies?: Record<string, string> } = {}) {
  const headers = new Headers(init.headers)
  if (init.cookies) headers.set('cookie', Object.entries(init.cookies).map(([k, v]) => `${k}=${v}`).join('; '))
  return new NextRequest(`http://localhost:3500${path}`, { headers })
}

const isRedirect = (r: Response) => r.status >= 300 && r.status < 400
const location = (r: Response) => new URL(r.headers.get('location') ?? '', 'http://localhost:3500').pathname

describe('proxy — CSP (N7500 Soro-Embed)', () => {
  const csp = (path = '/en/about') => proxy(req(path)).headers.get('content-security-policy') ?? ''
  const directive = (name: string) => csp().split('; ').find((d) => d.startsWith(`${name} `)) ?? ''

  it('img-src erlaubt Supabase (Soro-Thumbnails) sowie die bestehenden Hosts', () => {
    const img = directive('img-src')
    expect(img).toContain('https://*.supabase.co')
    expect(img).toContain('https://api.pundo.cy')
    expect(img).toContain('https://*.basemaps.cartocdn.com')
    expect(img).toContain('https://*.tile.openstreetmap.org')
  })

  it('connect-src erlaubt trysoro.com (Artikel-Deep-Link) und Cloudflare Challenges', () => {
    const connect = directive('connect-src')
    expect(connect).toContain('https://app.trysoro.com')
    expect(connect).toContain('https://challenges.cloudflare.com')
  })

  it('setzt pro Request eine Nonce, die in CSP und x-nonce uebereinstimmt', () => {
    const a = proxy(req('/en/about'))
    const b = proxy(req('/en/about'))
    const nonce = (r: Response) => r.headers.get('x-middleware-request-x-nonce')
    expect(nonce(a)).toBeTruthy()
    expect(nonce(a)).not.toBe(nonce(b))
    expect(a.headers.get('content-security-policy')).toContain(`'nonce-${nonce(a)}'`)
  })

  it('setzt die Security-Header', () => {
    const h = proxy(req('/en/about')).headers
    expect(h.get('x-content-type-options')).toBe('nosniff')
    expect(h.get('x-frame-options')).toBe('DENY')
    expect(h.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
  })
})

describe('proxy — i18n-Routing (F6300)', () => {
  it.each(['/avatars/x.png', '/_next/static/a.js', '/auth/login', '/account', '/oauth/consent', '/shop-admin/login', '/api/health'])(
    'lässt %s ohne Sprachpräfix durch (Bypass, keine Weiterleitung)', (path) => {
      expect(isRedirect(proxy(req(path)))).toBe(false)
    },
  )

  it('Avatar-Pfade laufen nicht durch die Middleware (matcher schliesst avatars aus)', () => {
    const source = config.matcher[0].source
    expect(new RegExp(`^${source}$`).test('/avatars/x.png')).toBe(false)
    expect(new RegExp(`^${source}$`).test('/en/about')).toBe(true)
  })

  it('leitet einen Pfad ohne Sprache temporär (307) mit Vary auf die erkannte Sprache um', () => {
    const r = proxy(req('/shops', { headers: { 'accept-language': 'ru-RU,ru;q=0.9' } }))
    expect(r.status).toBe(307)
    expect(location(r)).toBe('/ru/shops')
    expect(r.headers.get('vary')).toBe('Accept-Language, Cookie')
  })

  it('der Cookie app_lang hat Vorrang vor Accept-Language', () => {
    const r = proxy(req('/', { headers: { 'accept-language': 'ru' }, cookies: { app_lang: 'de' } }))
    expect(location(r)).toBe('/de')
  })

  it('leitet falsch geschriebene Sprachsegmente (/EN, /De/shops) permanent (308) auf Kleinschreibung um', () => {
    const r = proxy(req('/De/shops'))
    expect(r.status).toBe(308)
    expect(location(r)).toBe('/de/shops')
  })

  it('reicht die URL-Sprache als x-lang an Server Components weiter', () => {
    expect(proxy(req('/el/shops')).headers.get('x-middleware-request-x-lang')).toBe('el')
  })

  it('synchronisiert app_lang bei abweichender URL-Sprache (secure, Observatory-Regression)', () => {
    const cookie = proxy(req('/de/about', { cookies: { app_lang: 'en' } })).cookies.get('app_lang')
    expect(cookie?.value).toBe('de')
    expect(cookie?.secure).toBe(true)
  })

  it('setzt app_lang nicht neu, wenn der Cookie schon zur URL passt', () => {
    expect(proxy(req('/de/about', { cookies: { app_lang: 'de' } })).cookies.get('app_lang')).toBeUndefined()
  })

  it('öffentliche SEO-Seiten bekommen ein cachefähiges Cache-Control (Sprachpräfix wird ignoriert)', () => {
    expect(proxy(req('/en/about')).headers.get('cache-control')).toContain('s-maxage=3600')
    expect(proxy(req('/en/account-nope')).headers.get('cache-control')).toBeNull()
  })
})

describe('proxy — Shop-Admin-Auth-Gate (F5910)', () => {
  it.each([
    '/shop-admin/login',
    '/shop-admin/register',
    '/shop-admin/onboarding',
    '/shop-admin/auth/callback',
    '/shop-admin/verify-email',
  ])('%s ist ohne Anmeldung erreichbar', (path) => {
    expect(isRedirect(proxy(req(path)))).toBe(false)
  })

  it('geschützte Seiten leiten ohne Token auf den Login um und merken sich das Ziel', () => {
    const r = proxy(req('/shop-admin/dashboard'))
    expect(isRedirect(r)).toBe(true)
    expect(location(r)).toBe('/shop-admin/login')
    expect(new URL(r.headers.get('location')!).searchParams.get('next')).toBe('/shop-admin/dashboard')
  })

  it('geschützte Seiten sind mit shop_owner_token erreichbar', () => {
    expect(isRedirect(proxy(req('/shop-admin/dashboard', { cookies: { shop_owner_token: 'x' } })))).toBe(false)
  })
})

describe('proxy — System-Admin-Gate', () => {
  it('/admin/login ist öffentlich, andere /admin-Seiten verlangen admin_token', () => {
    expect(isRedirect(proxy(req('/admin/login')))).toBe(false)
    const r = proxy(req('/admin/dashboard'))
    expect(location(r)).toBe('/admin/login')
    expect(isRedirect(proxy(req('/admin/dashboard', { cookies: { admin_token: 'x' } })))).toBe(false)
  })
})
