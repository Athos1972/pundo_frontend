/**
 * B8950-012 TF3: Marker-Konvention und Tracker der E2E-Testdaten (e2e/journeys/_helpers/test-data.ts).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ES-Imports werden gehoistet → Run-ID vorher per vi.hoisted setzen (sonst gewinnt .test-state.json)
vi.hoisted(() => { process.env.E2E_RUN_ID = '20261013154233' })

// Cleanup tests exercise only Admin-API requests. Keep the login helper out of
// scope so they never depend on a generated E2E state file or the test backend.
vi.mock('../../e2e/journeys/_helpers', () => ({
  adminLogin: () => Promise.resolve('test-admin-token'),
}))

import {
  RUN_ID, TestDataTracker, e2eEmail, e2eName, e2eSlug, generateRunId, isMarkerSlug, marker, testDbUrl,
} from '../../e2e/journeys/_helpers/test-data'

describe('marker convention', () => {
  it('uses the run id from E2E_RUN_ID', () => {
    expect(RUN_ID).toBe('20261013154233')
    expect(marker('b5900-010')).toBe('E2E-20261013154233-B5900-010')
    expect(marker('Shop Admin/E2E')).toBe('E2E-20261013154233-SHOP-ADMIN-E2E')
  })

  it('puts the marker at the START of names, slugs and e-mails (anchored selectors)', () => {
    expect(e2eName('B5900-010', 'Ψωμί')).toMatch(/^E2E-20261013154233-B5900-010-Ψωμί-[0-9a-f]{4}$/)
    expect(e2eSlug('Offers', 'D1 Card')).toMatch(/^e2e-20261013154233-offers-d1-card-[0-9a-f]{4}$/)
    expect(e2eEmail('smoke')).toMatch(/^e2e-20261013154233-smoke-[0-9a-f]{4}@pundo-e2e\.io$/)
    expect(e2eEmail('crud', 'pundo.com')).toMatch(/^e2e-20261013154233-crud-[0-9a-f]{4}@pundo\.com$/)
  })

  it('is unique per call and never matches real Google-Places look-alikes', () => {
    expect(e2eName('x', 'y')).not.toBe(e2eName('x', 'y'))
    for (const real of ['pelecanos-pelecanou-llc-ef9e2e27', 'alex-optical-94f39e2e', 'hupex-fitness-ee2e85ef']) {
      expect(real.startsWith('e2e-')).toBe(false)
      expect(isMarkerSlug(real)).toBe(false)
    }
    expect(isMarkerSlug('e2e-20261013154233-w0-ab12')).toBe(true)
  })

  it('generateRunId yields UTC YYYYMMDDHHMMSS', () => {
    expect(generateRunId(new Date('2026-10-13T15:42:33.123Z'))).toBe('20261013154233')
  })
})

describe('testDbUrl guard', () => {
  const OLD = process.env.DATABASE_URL_TEST
  afterEach(() => {
    if (OLD === undefined) delete process.env.DATABASE_URL_TEST
    else process.env.DATABASE_URL_TEST = OLD
  })

  it('accepts localhost/pundo_test and strips +psycopg', () => {
    process.env.DATABASE_URL_TEST = 'postgresql+psycopg://u:p@localhost:5432/pundo_test'
    expect(testDbUrl()).toBe('postgresql://u:p@localhost:5432/pundo_test')
  })

  it.each([
    'postgresql://u:p@localhost:5432/pundo',
    'postgresql://u:p@db.example.com:5432/pundo_test',
  ])('refuses %s', (url) => {
    process.env.DATABASE_URL_TEST = url
    expect(() => testDbUrl()).toThrow(/Abbruch/)
  })
})

describe('TestDataTracker.cleanup', () => {
  const calls: Array<{ method: string; url: string }> = []
  let responses: Record<string, { status: number; body?: unknown }>

  beforeEach(() => {
    calls.length = 0
    responses = {}
    process.env.E2E_RUN_ID = '20261013154233'
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ method, url: url.replace('http://localhost:8500/api/v1/admin', '') })
      const r = responses[`${method} ${url.replace('http://localhost:8500/api/v1/admin', '')}`] ?? { status: 204 }
      return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status })
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('deletes shops first, then items; resolves owners to their shop', async () => {
    responses['GET /shop-owners/7'] = { status: 200, body: { shop_id: 55 } }
    const t = new TestDataTracker()
    t.shop(10)
    t.owner(7)
    t.item(100, 'e2e-20261013154233-w0-item')
    const rep = await t.cleanup()
    expect(rep).toMatchObject({ shopsDeleted: 2, itemsDeleted: 1, itemConflicts: [], itemsKept: [] })
    const dels = calls.filter((c) => c.method === 'DELETE').map((c) => c.url)
    expect(dels).toEqual(['/shops/10', '/shops/55', '/items/100'])
  })

  it('never deletes a real item (slug without marker) and reports 409 conflicts', async () => {
    responses['DELETE /items/2'] = { status: 409 }
    const t = new TestDataTracker()
    t.item(1, 'avicentra-avicentra-classic-menu-budgie-1kg')
    t.item(2, 'e2e-20261013154233-x')
    const rep = await t.cleanup()
    expect(rep.itemsKept).toEqual([1])
    expect(rep.itemConflicts).toEqual([2])
    expect(calls.some((c) => c.url === '/items/1')).toBe(false)
  })

  it('throws on unexpected errors instead of swallowing them, tolerates 404', async () => {
    responses['DELETE /shops/1'] = { status: 404 }
    responses['DELETE /shops/2'] = { status: 500 }
    const t = new TestDataTracker()
    t.shop(1)
    t.shop(2)
    await expect(t.cleanup()).rejects.toThrow(/DELETE shop 2 -> 500/)
  })

  it('deletes an owner without shop directly', async () => {
    responses['GET /shop-owners/9'] = { status: 200, body: { shop_id: null } }
    const t = new TestDataTracker()
    t.owner(9)
    await t.cleanup()
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /shop-owners/9', 'DELETE /shop-owners/9'])
  })
})
