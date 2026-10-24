// B8950-016 T19 (B14): the response bodies the E2E journeys mock (e2e/fixtures/contracts/*.json) are what the code really sends.
//   - contact-*: produced by the Next route /api/contact from the backend answers (mail_guard.py: 400 detail "captcha_failed";
//     the rate limiter answers 429). The journey contact-form.spec.ts feeds the contact form with these files.
//   - shop-admin-social-link-* and admin-social-link-rule-*: recorded from the real backend by the "Real backend" tests of the
//     journeys social-link-moderation*.spec.ts (they fail when the backend changes; E2E_RECORD_CONTRACTS=1 re-records).
//     Here only their shape is pinned, so a hand edit of a recorded file cannot slip through.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(__dirname, '..', '..', 'e2e', 'fixtures', 'contracts')
const contract = (name: string) => JSON.parse(readFileSync(join(DIR, `${name}.json`), 'utf8')) as { status: number; body: Record<string, unknown> }

const fetchMock = vi.fn()
beforeEach(() => {
  vi.resetModules()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

async function contactRoute(backendStatus: number, backendBody: unknown) {
  fetchMock.mockImplementation(
    async () => new Response(JSON.stringify(backendBody), { status: backendStatus, headers: { 'content-type': 'application/json' } }),
  )
  const { POST } = await import('@/app/api/contact/route')
  const res = await POST(
    new NextRequest('http://localhost:3500/api/contact', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subject: 's' }),
    }),
  )
  return { status: res.status, body: await res.json() }
}

describe('contact route -> the bodies contact-form.spec.ts mocks', () => {
  it('backend 400 captcha_failed', async () => {
    expect(await contactRoute(400, { detail: 'captcha_failed' })).toEqual(contract('contact-captcha-failed'))
  })

  it('backend 429', async () => {
    expect(await contactRoute(429, { detail: 'Rate limit exceeded' })).toEqual(contract('contact-rate-limited'))
  })
})

describe('recorded social-link responses keep the shape the frontend reads', () => {
  const KEYS = ['category', 'error', 'key', 'resolved_host', 'via_shortener']

  it.each(['shop-admin-social-link-blocked-adult', 'shop-admin-social-link-shortener-unresolvable'])('%s', (name) => {
    const { status, body } = contract(name)
    expect(status).toBe(422)
    expect(Object.keys(body).sort()).toEqual(KEYS)
    expect(['social_link_blocked', 'shortener_unresolvable']).toContain(body.error)
    expect(typeof body.via_shortener).toBe('boolean')
  })

  it('admin rule validation error is a string detail', () => {
    const { status, body } = contract('admin-social-link-rule-invalid-host')
    expect(status).toBe(422)
    expect(typeof body.detail).toBe('string')
  })

  it('admin org search too short is a 422 with the code the frontend maps (CRM_ERROR_KEYS)', async () => {
    const { CRM_ERROR_KEYS } = await import('@/components/system-admin/crm/crmFetch')
    const { status, body } = contract('admin-crm-orgs-search-too-short')
    expect(status).toBe(422)
    expect(Object.keys(CRM_ERROR_KEYS)).toContain(body.detail)
  })

  it('every fixture file is used by a journey (no orphans)', () => {
    const used = readdirSync(join(__dirname, '..', '..', 'e2e', 'journeys'))
      .filter((f) => f.endsWith('.ts'))
      .map((f) => readFileSync(join(__dirname, '..', '..', 'e2e', 'journeys', f), 'utf8'))
      .join('\n')
    for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
      expect(used, `${f} is not referenced by any journey`).toContain(f.replace(/\.json$/, ''))
    }
  })
})
