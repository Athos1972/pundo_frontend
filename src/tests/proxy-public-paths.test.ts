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
