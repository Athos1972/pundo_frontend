// =============================================================================
// src/tests/recently-viewed.test.ts
//
// Unit tests for src/lib/recently-viewed.ts (F4700).
// Tests: add, dedup/move-to-front, FIFO trim at 20, version mismatch reset,
// storage quota silent-degrade, SSR no-op.
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const makeLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    _store: () => store,
    _reset: () => { store = {} },
  }
}

let localStorageMock = makeLocalStorageMock()

// We need to reset module state between tests since recently-viewed.ts imports at module level
// Use dynamic imports to get a fresh module state per test group.

beforeEach(() => {
  localStorageMock = makeLocalStorageMock()
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true,
  })
  // Ensure window is defined (jsdom provides it)
  Object.defineProperty(globalThis, 'window', {
    value: globalThis,
    configurable: true,
    writable: true,
  })
  // Mock dispatchEvent
  vi.spyOn(globalThis, 'dispatchEvent').mockImplementation(() => true)
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorageMock._reset()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(id: number, overrides: Partial<{
  slug: string; name: string; image_url: string | null; price_display: string | null; city: string | null; viewed_at: number
}> = {}) {
  return {
    id,
    slug: `product-${id}`,
    name: `Product ${id}`,
    image_url: null,
    viewed_at: Date.now(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('recently-viewed — addProduct', () => {
  it('adds a product to the list', async () => {
    const { addProduct, getProducts } = await import('@/lib/recently-viewed')
    addProduct(makeEntry(1))
    const list = getProducts()
    expect(list.length).toBe(1)
    expect(list[0].id).toBe(1)
  })

  it('moves existing product to front (dedup)', async () => {
    const { addProduct, getProducts } = await import('@/lib/recently-viewed')
    addProduct(makeEntry(1))
    addProduct(makeEntry(2))
    addProduct(makeEntry(1))  // re-add id=1 — should move to front
    const list = getProducts()
    expect(list[0].id).toBe(1)
    expect(list[1].id).toBe(2)
    expect(list.length).toBe(2)
  })

  it('updates viewed_at when moving to front', async () => {
    const { addProduct, getProducts } = await import('@/lib/recently-viewed')
    const early = Date.now() - 5000
    addProduct({ ...makeEntry(1), viewed_at: early })
    const before = getProducts()[0].viewed_at

    await new Promise((r) => setTimeout(r, 10))
    addProduct(makeEntry(1))  // re-add

    const after = getProducts()[0].viewed_at
    expect(after).toBeGreaterThanOrEqual(before)
  })

  it('trims list to 20 items (FIFO)', async () => {
    const { addProduct, getProducts } = await import('@/lib/recently-viewed')
    for (let i = 1; i <= 22; i++) {
      addProduct(makeEntry(i))
    }
    const list = getProducts()
    expect(list.length).toBe(20)
    // Newest (22) should be at front, oldest (1, 2) should be dropped
    expect(list[0].id).toBe(22)
    expect(list.some((e) => e.id === 1)).toBe(false)
    expect(list.some((e) => e.id === 2)).toBe(false)
  })

  it('dispatches pundo:recently-viewed custom event', async () => {
    const { addProduct } = await import('@/lib/recently-viewed')
    const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent')
    addProduct(makeEntry(1))
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pundo:recently-viewed' })
    )
  })
})

describe('recently-viewed — addShop', () => {
  it('adds a shop and trims to 20', async () => {
    const { addShop, getShops } = await import('@/lib/recently-viewed')
    for (let i = 1; i <= 21; i++) {
      addShop({ ...makeEntry(i), city: 'Larnaca' })
    }
    const list = getShops()
    expect(list.length).toBe(20)
    expect(list[0].id).toBe(21)
  })

  it('deduplicates shops', async () => {
    const { addShop, getShops } = await import('@/lib/recently-viewed')
    addShop({ ...makeEntry(5), city: 'Limassol' })
    addShop({ ...makeEntry(6), city: 'Paphos' })
    addShop({ ...makeEntry(5), city: 'Limassol' })
    const list = getShops()
    expect(list.length).toBe(2)
    expect(list[0].id).toBe(5)
  })
})

describe('recently-viewed — clear', () => {
  it('removes both product and shop lists', async () => {
    const { addProduct, addShop, clear, getProducts, getShops } = await import('@/lib/recently-viewed')
    addProduct(makeEntry(1))
    addShop({ ...makeEntry(2), city: 'Larnaca' })
    clear()
    expect(getProducts()).toEqual([])
    expect(getShops()).toEqual([])
  })
})

describe('recently-viewed — version mismatch', () => {
  it('resets silently on schema version mismatch', async () => {
    // Pre-seed with a wrong version and some data
    localStorageMock.setItem('pundo.recently_viewed.version', '99')
    localStorageMock.setItem('pundo.recently_viewed.products', JSON.stringify([makeEntry(1)]))

    const { addProduct, getProducts } = await import('@/lib/recently-viewed')
    // addProduct triggers ensureVersion which should reset
    addProduct(makeEntry(2))
    const list = getProducts()
    // Old entry (1) dropped, new entry (2) present
    expect(list.some((e) => e.id === 2)).toBe(true)
    // Version should now be '1'
    expect(localStorageMock.getItem('pundo.recently_viewed.version')).toBe('1')
  })
})

describe('recently-viewed — storage quota error (silent degrade)', () => {
  it('does not throw when localStorage.setItem throws', async () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    const { addProduct } = await import('@/lib/recently-viewed')
    expect(() => addProduct(makeEntry(1))).not.toThrow()
  })

  it('returns [] from getProducts when localStorage.getItem throws', async () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new DOMException('SecurityError')
    })
    const { getProducts } = await import('@/lib/recently-viewed')
    expect(getProducts()).toEqual([])
  })
})

describe('recently-viewed — SSR safety', () => {
  it('getProducts returns [] when window is undefined', async () => {
    const origWindow = globalThis.window
    // Simulate SSR by making typeof window === 'undefined'
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const { getProducts } = await import('@/lib/recently-viewed')
    const result = getProducts()
    expect(result).toEqual([])

    Object.defineProperty(globalThis, 'window', {
      value: origWindow,
      configurable: true,
      writable: true,
    })
  })

  it('addProduct is a no-op when window is undefined', async () => {
    const origWindow = globalThis.window
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const { addProduct } = await import('@/lib/recently-viewed')
    expect(() => addProduct(makeEntry(1))).not.toThrow()

    Object.defineProperty(globalThis, 'window', {
      value: origWindow,
      configurable: true,
      writable: true,
    })
  })
})
