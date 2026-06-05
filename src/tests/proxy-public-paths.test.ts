import { describe, it, expect } from 'vitest'

/**
 * Regression guard for the proxy.ts auth gate.
 *
 * F5910 (2026-05-01): /shop-admin/onboarding and /shop-admin/auth/callback were
 * missing from PUBLIC_SHOP_ADMIN_PATHS, causing unauthenticated users (new
 * registrations) to be redirected to login instead of seeing the onboarding wizard.
 *
 * We can't import proxy.ts directly in Vitest (it references Next.js server APIs),
 * so we read and parse the source to assert the list stays correct.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const proxySrc = readFileSync(resolve(__dirname, '../../src/proxy.ts'), 'utf8')

function extractPublicPaths(src: string, varName: string): string[] {
  const match = src.match(new RegExp(`const ${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]`))
  if (!match) return []
  return match[1].match(/'([^']+)'/g)?.map(s => s.replace(/'/g, '')) ?? []
}

// Helper: extract the string content of a CSP directive line from buildCsp
function extractCspDirective(src: string, directive: string): string {
  const match = src.match(new RegExp(`\`${directive}[^,\`]*\``))
  return match ? match[0] : ''
}

describe('proxy.ts — buildCsp directives (N7500 Soro embed)', () => {
  it('img-src includes *.supabase.co for Soro article thumbnails', () => {
    const line = extractCspDirective(proxySrc, 'img-src')
    expect(line).toContain('https://*.supabase.co')
  })

  it('connect-src includes https://app.trysoro.com for article deep-link fetch', () => {
    const line = extractCspDirective(proxySrc, 'connect-src')
    expect(line).toContain('https://app.trysoro.com')
  })

  it('img-src still contains the existing pundo.cy and map tile hosts', () => {
    const line = extractCspDirective(proxySrc, 'img-src')
    expect(line).toContain('https://api.pundo.cy')
    expect(line).toContain('https://*.basemaps.cartocdn.com')
    expect(line).toContain('https://*.tile.openstreetmap.org')
  })

  it('connect-src still contains the existing Cloudflare challenges host', () => {
    const line = extractCspDirective(proxySrc, 'connect-src')
    expect(line).toContain('https://challenges.cloudflare.com')
  })
})

describe('proxy.ts — avatar proxy (broken-image bug)', () => {
  it('I18N_BYPASS_PREFIXES includes /avatars so avatar paths skip i18n redirect', () => {
    expect(proxySrc).toContain("'/avatars'")
  })

  it('matcher excludes avatars so middleware does not run on avatar image requests', () => {
    expect(proxySrc).toMatch(/\(\?!_next\|api\|[^)]*avatars/)
  })
})

describe('proxy.ts — i18n routing (F6300)', () => {
  it('I18N_BYPASS_PREFIXES includes /_next', () => {
    expect(proxySrc).toContain("'/_next'")
  })

  it('I18N_BYPASS_PREFIXES includes /auth and /account', () => {
    expect(proxySrc).toContain("'/auth'")
    expect(proxySrc).toContain("'/account'")
  })

  it('I18N_BYPASS_PREFIXES includes /oauth (MCP OAuth consent, F6600)', () => {
    expect(proxySrc).toContain("'/oauth'")
  })

  it('I18N_BYPASS_PREFIXES includes /shop-admin', () => {
    expect(proxySrc).toContain("'/shop-admin'")
  })

  it('detects lang from URL first segment and builds redirect', () => {
    expect(proxySrc).toContain('LANG_SET.has(firstSegment)')
  })

  it('sets x-lang request header for Server Components', () => {
    expect(proxySrc).toContain("requestHeaders.set('x-lang'")
  })

  it('syncs app_lang cookie on response when URL lang differs from cookie', () => {
    expect(proxySrc).toContain('response.cookies.set(LANG_COOKIE')
  })

  it('sets secure: true on app_lang cookie (Observatory regression)', () => {
    // The options object passed to response.cookies.set must include secure: true
    expect(proxySrc).toMatch(/response\.cookies\.set\(LANG_COOKIE[\s\S]*?secure:\s*true/)
  })

  it('uses 307 in dev and 308 in production', () => {
    expect(proxySrc).toContain("NODE_ENV === 'development' ? 307 : 308")
  })

  it('strips lang prefix before applying SEO Cache-Control', () => {
    expect(proxySrc).toContain('stripLangForCache(pathname)')
  })
})

describe('proxy.ts — PUBLIC_SHOP_ADMIN_PATHS', () => {
  const paths = extractPublicPaths(proxySrc, 'PUBLIC_SHOP_ADMIN_PATHS')

  it('includes the login page', () => {
    expect(paths).toContain('/shop-admin/login')
  })

  it('includes the register redirect stub', () => {
    expect(paths).toContain('/shop-admin/register')
  })

  it('includes the onboarding wizard (F5910)', () => {
    expect(paths).toContain('/shop-admin/onboarding')
  })

  it('includes the OAuth callback page (F5910)', () => {
    expect(paths).toContain('/shop-admin/auth/callback')
  })

  it('includes the verify-email page', () => {
    expect(paths).toContain('/shop-admin/verify-email')
  })
})
