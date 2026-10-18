// @vitest-environment node
// F6998 — api.ts leitet den Besucher-UA nur opt-in und nur bei no-store weiter
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const state: { ua: string | null; throwErr: Error | null; prefetch: boolean | undefined; store: boolean } = {
  ua: 'Mozilla/5.0 Chrome/129',
  throwErr: null,
  prefetch: false,
  store: true,
}
vi.mock('next/headers', () => ({
  headers: async () => {
    if (state.throwErr) throw state.throwErr
    return new Headers(state.ua === null ? {} : { 'user-agent': state.ua })
  },
}))

// Next entfernt next-router-prefetch aus headers(); der Marker kommt aus dem Work-Store des Renders
vi.mock('next/dist/server/app-render/work-async-storage.external', () => ({
  workAsyncStorage: { getStore: () => (state.store ? { isPrefetchRequest: state.prefetch } : undefined) },
}))

import { getProduct, getShop, searchAll, searchProducts, getRelatedProducts } from '@/lib/api'

const mockFetch = vi.fn()
const call = (i = -1) => {
  const c = mockFetch.mock.calls.at(i)!
  return { url: c[0] as string, init: c[1] as RequestInit & { headers: Record<string, string> } }
}

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
  state.ua = 'Mozilla/5.0 Chrome/129'
  state.throwErr = null
  state.prefetch = false
  state.store = true
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

describe('api.ts X-Forwarded-User-Agent (F6998)', () => {
  it.each([
    ['getProduct', () => getProduct('p', 'de')],
    ['getShop', () => getShop('s', 'de')],
    ['searchAll', () => searchAll({ q: 'milk' }, 'de')],
    ['searchProducts q+noStore', () => searchProducts({ q: 'milk' }, 'de', { noStore: true })],
  ])('%s sends the header with no-store', async (_n, fn) => {
    await fn()
    const { init } = call()
    expect(init.headers['X-Forwarded-User-Agent']).toBe('Mozilla/5.0 Chrome/129')
    expect(init.headers['Accept-Language']).toBe('de')
    expect(init.cache).toBe('no-store')
  })

  it('searchProducts without noStore does not send it', async () => {
    await searchProducts({ q: 'milk' }, 'de')
    expect(call().init.headers['X-Forwarded-User-Agent']).toBeUndefined()
  })

  it('searchProducts with noStore but without q does not send it', async () => {
    await searchProducts({ category_id: 3 }, 'de', { noStore: true })
    expect(call().init.headers['X-Forwarded-User-Agent']).toBeUndefined()
  })

  it('getRelatedProducts (revalidate) does not send it', async () => {
    await getRelatedProducts('p', 'de')
    const { init } = call()
    expect(init.headers['X-Forwarded-User-Agent']).toBeUndefined()
    expect(init.cache).toBeUndefined()
  })

  it('two getProduct calls produce deep-equal requests (memoization, R1)', async () => {
    await getProduct('p', 'de')
    await getProduct('p', 'de')
    expect(mockFetch.mock.calls[0]).toEqual(mockFetch.mock.calls[1])
    expect(Object.keys(call(0).init.headers)).toEqual(Object.keys(call(1).init.headers))
  })

  it('sends an empty header for a missing UA', async () => {
    state.ua = null
    await getShop('s', 'de')
    expect(call().init.headers['X-Forwarded-User-Agent']).toBe('')
  })

  it('outside a request scope (headers() throws) sends no header and does not fail', async () => {
    state.throwErr = new Error('headers was called outside a request scope')
    await expect(getProduct('p', 'de')).resolves.toEqual({})
    expect(call().init.headers['X-Forwarded-User-Agent']).toBeUndefined()
  })

  it('Next-internal bailout errors are rethrown, not swallowed', async () => {
    const err = Object.assign(new Error('Dynamic server usage'), { digest: 'DYNAMIC_SERVER_USAGE' })
    state.throwErr = err
    await expect(getProduct('p', 'de')).rejects.toBe(err)
  })

  // B6998-001: Link-Prefetch wird ans Backend gemeldet (Unterdrueckung des Activity-Events)
  it.each([
    ['getProduct', () => getProduct('p', 'de')],
    ['getShop', () => getShop('s', 'de')],
    ['searchAll', () => searchAll({ q: 'milk' }, 'de')],
  ])('%s sends X-Forwarded-Prefetch on a Next prefetch render', async (_n, fn) => {
    state.prefetch = true
    await fn()
    const h = call().init.headers
    expect(h['X-Forwarded-Prefetch']).toBe('1')
    expect(h['X-Forwarded-User-Agent']).toBe('Mozilla/5.0 Chrome/129')
  })

  it('sends no X-Forwarded-Prefetch on a normal render or without a work store', async () => {
    await getProduct('p', 'de')
    expect(call().init.headers['X-Forwarded-Prefetch']).toBeUndefined()
    state.store = false
    await getProduct('p', 'de')
    expect(call().init.headers['X-Forwarded-Prefetch']).toBeUndefined()
  })

  it('metadata and page requests stay identical for prefetch (memoization)', async () => {
    state.prefetch = true
    await getShop('s', 'de')
    await getShop('s', 'de')
    expect(mockFetch.mock.calls[0]).toEqual(mockFetch.mock.calls[1])
  })
})
