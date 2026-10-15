import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRecentlyViewed } from '@/lib/useRecentlyViewed'
import { addProduct, addShop } from '@/lib/recently-viewed'
import { useGeolocation } from '@/lib/useGeolocation'
import { useCamera } from '@/lib/useCamera'
import { resizeImageForUpload, DEFAULT_RESIZE_OPTIONS } from '@/lib/shop-admin-image-resize'
import {
  eventToColorToken, eventToColorClasses, eventVariant, eventToHref, assertNoPii, eventToTranslationKey,
} from '@/lib/activity-events'
import type { ActivityEvent, ActivityEventPayload } from '@/types/activity'

// ─── useRecentlyViewed ──────────────────────────────────────────────────────────

const entry = (id: number) => ({ id, slug: `p${id}`, name: `P${id}`, image_url: null, viewed_at: Date.now() + id })

describe('useRecentlyViewed', () => {
  beforeEach(() => localStorage.clear())

  it('starts with what is stored', () => {
    addProduct(entry(1))
    addShop(entry(2))
    const { result } = renderHook(() => useRecentlyViewed())
    expect(result.current.products.map((p) => p.id)).toEqual([1])
    expect(result.current.shops.map((p) => p.id)).toEqual([2])
  })

  it('reacts to same-tab updates (custom event)', async () => {
    const { result } = renderHook(() => useRecentlyViewed())
    expect(result.current.products).toEqual([])
    act(() => { addProduct(entry(5)) })
    await waitFor(() => expect(result.current.products.map((p) => p.id)).toEqual([5]))
  })

  it('reacts to cross-tab storage events for its own keys only', async () => {
    const { result } = renderHook(() => useRecentlyViewed())
    localStorage.setItem('pundo.recently_viewed.version', '1')
    localStorage.setItem('pundo.recently_viewed.products', JSON.stringify([entry(7)]))
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' })) })
    expect(result.current.products).toEqual([])
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'pundo.recently_viewed.products' })) })
    await waitFor(() => expect(result.current.products.map((p) => p.id)).toEqual([7]))
    // key === null means "storage was cleared": refresh as well
    localStorage.clear()
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: null })) })
    await waitFor(() => expect(result.current.products).toEqual([]))
  })

  it('clear() empties both lists and storage', () => {
    addProduct(entry(1)); addShop(entry(2))
    const { result } = renderHook(() => useRecentlyViewed())
    act(() => result.current.clear())
    expect(result.current.products).toEqual([])
    expect(result.current.shops).toEqual([])
    expect(localStorage.getItem('pundo.recently_viewed.products')).toBeNull()
  })

  it('stops listening after unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useRecentlyViewed())
    unmount()
    const names = remove.mock.calls.map((c) => c[0])
    expect(names).toContain('storage')
    expect(names).toContain('pundo:recently-viewed')
    remove.mockRestore()
  })
})

// ─── useGeolocation ─────────────────────────────────────────────────────────────

describe('useGeolocation', () => {
  const LARNACA = { lat: 34.9009, lng: 33.6230 }
  afterEach(() => { vi.unstubAllGlobals() })

  it('defaults to Larnaca when the browser has no geolocation', () => {
    const nav = navigator as unknown as { geolocation?: unknown }
    const original = Object.getOwnPropertyDescriptor(Navigator.prototype, 'geolocation')
    // jsdom has no geolocation; make sure of it
    expect(nav.geolocation).toBeUndefined()
    const { result } = renderHook(() => useGeolocation())
    expect(result.current).toEqual(LARNACA)
    void original
  })

  it('uses the device position when granted and keeps Larnaca when denied', async () => {
    const getCurrentPosition = vi.fn()
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
    getCurrentPosition.mockImplementationOnce((ok: (p: unknown) => void) => ok({ coords: { latitude: 52.5, longitude: 13.4 } }))
    const { result } = renderHook(() => useGeolocation())
    await waitFor(() => expect(result.current).toEqual({ lat: 52.5, lng: 13.4 }))
    expect(getCurrentPosition.mock.calls[0][2]).toMatchObject({ timeout: 5000 })

    getCurrentPosition.mockImplementationOnce((_ok: unknown, err: () => void) => err())
    const denied = renderHook(() => useGeolocation())
    expect(denied.result.current).toEqual(LARNACA)
    Reflect.deleteProperty(navigator, 'geolocation')
  })
})

// ─── useCamera ──────────────────────────────────────────────────────────────────

describe('useCamera', () => {
  const track = () => ({ stop: vi.fn() })
  let getUserMedia: ReturnType<typeof vi.fn>

  beforeEach(() => {
    getUserMedia = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  })
  afterEach(() => { Reflect.deleteProperty(navigator, 'mediaDevices'); vi.restoreAllMocks() })

  it('reports unsupported browsers', () => {
    Reflect.deleteProperty(navigator, 'mediaDevices')
    const { result } = renderHook(() => useCamera())
    expect(result.current.isSupported).toBe(false)
  })

  it('start requests the rear camera by default and marks the camera active', async () => {
    const t = track()
    getUserMedia.mockResolvedValue({ getTracks: () => [t] })
    const { result } = renderHook(() => useCamera())
    expect(result.current.isSupported).toBe(true)
    await act(async () => { await result.current.start() })
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: { ideal: 'environment' } } })
    expect(result.current.isActive).toBe(true)
    expect(result.current.facingMode).toBe('environment')
  })

  it('flip restarts with the opposite camera and stops the old stream', async () => {
    const t1 = track(); const t2 = track()
    getUserMedia.mockResolvedValueOnce({ getTracks: () => [t1] }).mockResolvedValueOnce({ getTracks: () => [t2] })
    const { result } = renderHook(() => useCamera())
    await act(async () => { await result.current.start() })
    await act(async () => { result.current.flip() })
    await waitFor(() => expect(result.current.facingMode).toBe('user'))
    expect(getUserMedia).toHaveBeenLastCalledWith({ video: { facingMode: { ideal: 'user' } } })
    expect(t1.stop).toHaveBeenCalled()
  })

  it.each([
    ['NotAllowedError: Permission denied', 'denied'],
    ['Permission dismissed', 'denied'],
    ['Requested device not found', 'unavailable'],
  ])('maps the error "%s" to "%s"', async (message, expected) => {
    getUserMedia.mockRejectedValue(new Error(message))
    const { result } = renderHook(() => useCamera())
    await act(async () => { await result.current.start() })
    expect(result.current.error).toBe(expected)
    expect(result.current.isActive).toBe(false)
  })

  it('non-Error rejections count as unavailable; a new start clears the previous error', async () => {
    getUserMedia.mockRejectedValueOnce('boom')
    const { result } = renderHook(() => useCamera())
    await act(async () => { await result.current.start() })
    expect(result.current.error).toBe('unavailable')
    getUserMedia.mockResolvedValueOnce({ getTracks: () => [track()] })
    await act(async () => { await result.current.start() })
    expect(result.current.error).toBeNull()
  })

  it('stop releases the tracks; unmount does too', async () => {
    const t = track()
    getUserMedia.mockResolvedValue({ getTracks: () => [t] })
    const { result, unmount } = renderHook(() => useCamera())
    await act(async () => { await result.current.start() })
    act(() => result.current.stop())
    expect(t.stop).toHaveBeenCalledTimes(1)
    expect(result.current.isActive).toBe(false)
    await act(async () => { await result.current.start() })
    unmount()
    expect(t.stop).toHaveBeenCalledTimes(2)
  })

  it('capture returns nothing while the camera is off', () => {
    const { result } = renderHook(() => useCamera())
    expect(result.current.capture()).toBeNull()
  })

  it('capture turns the video frame into a JPEG file', async () => {
    getUserMedia.mockResolvedValue({ getTracks: () => [track()] })
    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAECAw==')
    const video = document.createElement('video')
    Object.defineProperty(video, 'videoWidth', { value: 640 })
    Object.defineProperty(video, 'videoHeight', { value: 480 })
    video.play = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useCamera())
    ;(result.current.videoRef as { current: HTMLVideoElement | null }).current = video
    await act(async () => { await result.current.start() })
    let file: File | null = null
    act(() => { file = result.current.capture() })
    expect(file).toBeInstanceOf(File)
    expect(file!.type).toBe('image/jpeg')
    expect(file!.name).toMatch(/^spotted_\d+\.jpg$/)
    expect(file!.size).toBe(4)
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0)
  })
})

// ─── Image resize (shop-admin upload) ───────────────────────────────────────────

describe('resizeImageForUpload', () => {
  const MB = 1024 * 1024
  const makeFile = (size: number, type = 'image/jpeg', name = 'IMG_1.JPG') => {
    const f = new File(['x'], name, { type })
    Object.defineProperty(f, 'size', { value: size })
    return f
  }
  const opts = { maxEdge: 1000, maxBytes: 1 * MB, quality: 0.8 }
  let toBlob: Mock
  let drawImage: Mock

  function setup(bitmap: { width: number; height: number } | Error, blobs: Array<{ size: number; type: string } | null> = []) {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => {
      if (bitmap instanceof Error) throw bitmap
      return { ...bitmap, close }
    }))
    drawImage = vi.fn()
    toBlob = vi.fn()
    let i = 0
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb: BlobCallback, type?: string) {
      toBlob(this.width, this.height, type)
      const b = blobs[Math.min(i++, blobs.length - 1)]
      if (!b) return cb(null)
      const blob = new Blob(['y'], { type: b.type })
      Object.defineProperty(blob, 'size', { value: b.size })
      cb(blob)
    })
    return { close }
  }
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('returns small images untouched', async () => {
    const { close } = setup({ width: 800, height: 600 })
    const f = makeFile(100_000)
    expect(await resizeImageForUpload(f, opts)).toBe(f)
    expect(close).toHaveBeenCalled()
    expect(drawImage).not.toHaveBeenCalled()
  })

  it('without createImageBitmap: pass small files, reject oversized ones', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    const small = makeFile(100)
    expect(await resizeImageForUpload(small, opts)).toBe(small)
    expect(await resizeImageForUpload(makeFile(5 * MB), opts)).toBeNull()
  })

  it('undecodable file: small passes, oversized is rejected', async () => {
    setup(new Error('decode'))
    const small = makeFile(100)
    expect(await resizeImageForUpload(small, opts)).toBe(small)
    expect(await resizeImageForUpload(makeFile(5 * MB), opts)).toBeNull()
  })

  it('downsizes a too-long edge, keeps JPEG and renames the extension', async () => {
    setup({ width: 4000, height: 2000 }, [{ size: 500_000, type: 'image/jpeg' }])
    const out = await resizeImageForUpload(makeFile(3 * MB, 'image/jpeg', 'holiday.JPEG'), opts)
    expect(out).toBeInstanceOf(File)
    expect(out!.name).toBe('holiday.jpg')
    expect(out!.type).toBe('image/jpeg')
    expect(toBlob).toHaveBeenCalledWith(1000, 500, 'image/jpeg')
  })

  it('PNG becomes WebP (keeps transparency)', async () => {
    setup({ width: 3000, height: 3000 }, [{ size: 400_000, type: 'image/webp' }])
    const out = await resizeImageForUpload(makeFile(6 * MB, 'image/png', 'logo.png'), opts)
    expect(out!.type).toBe('image/webp')
    expect(out!.name).toBe('logo.webp')
  })

  it('shrinks further when the first attempt is still too big', async () => {
    setup({ width: 2000, height: 2000 }, [{ size: 3 * MB, type: 'image/jpeg' }, { size: 500_000, type: 'image/jpeg' }])
    const out = await resizeImageForUpload(makeFile(8 * MB), opts)
    expect(out).not.toBeNull()
    expect(toBlob).toHaveBeenCalledTimes(2)
    expect(toBlob.mock.calls[0].slice(0, 2)).toEqual([1000, 1000])
    expect(toBlob.mock.calls[1].slice(0, 2)).toEqual([750, 750])
  })

  it('gives up after three attempts', async () => {
    setup({ width: 2000, height: 2000 }, [{ size: 9 * MB, type: 'image/jpeg' }])
    expect(await resizeImageForUpload(makeFile(20 * MB), opts)).toBeNull()
    expect(toBlob).toHaveBeenCalledTimes(3)
  })

  it('encoder failure (no blob, wrong type): oversize -> null', async () => {
    setup({ width: 2000, height: 2000 }, [null])
    expect(await resizeImageForUpload(makeFile(20 * MB), opts)).toBeNull()
    vi.restoreAllMocks()
    setup({ width: 2000, height: 2000 }, [{ size: 10, type: 'image/png' }])   // browser ignored requested type
    expect(await resizeImageForUpload(makeFile(20 * MB), opts)).toBeNull()
  })

  it('oversize in bytes only (edge ok) is re-encoded at the original scale', async () => {
    setup({ width: 800, height: 600 }, [{ size: 200_000, type: 'image/jpeg' }])
    const out = await resizeImageForUpload(makeFile(4 * MB), opts)
    expect(out).not.toBeNull()
    expect(toBlob.mock.calls[0].slice(0, 2)).toEqual([800, 600])
  })

  it('exposes sane defaults (<= 2560 px, 5 MB)', () => {
    expect(DEFAULT_RESIZE_OPTIONS).toEqual({ maxEdge: 2560, maxBytes: 5 * MB, quality: 0.85 })
  })
})

// ─── activity-events ────────────────────────────────────────────────────────────

describe('activity-events', () => {
  const ev = (event_type: ActivityEvent['event_type'], payload: ActivityEventPayload = {}, id = 'e1'): ActivityEvent =>
    ({ id, event_type, payload, created_at: '2026-01-01T00:00:00Z' })

  it('color tokens per type; unknown types fall back to gray', () => {
    expect(eventToColorToken(ev('product_spotted'))).toBe('green')
    expect(eventToColorToken(ev('homesick_activated'))).toBe('terracotta')
    expect(eventToColorToken(ev('shop_language_noted'))).toBe('gray')
    expect(eventToColorToken(ev('mystery' as never))).toBe('gray')
    expect(eventToColorClasses(ev('search_performed'))).toMatchObject({ border: 'border-blue-200' })
  })

  it('variant is stable per id and always 0..2', () => {
    expect(eventVariant('abc')).toBe(eventVariant('abc'))
    for (const id of ['', 'a', 'event-123', 'ü-ß-€', 'x'.repeat(500)]) {
      expect([0, 1, 2]).toContain(eventVariant(id))
    }
    const seen = new Set(Array.from({ length: 60 }, (_, i) => eventVariant(`id-${i}`)))
    expect(seen.size).toBe(3)
  })

  it.each([
    ['search_performed', { term: 'dog food & more' }, '/search?q=dog%20food%20%26%20more'],
    ['search_performed', {}, '/search'],
    ['price_comparison_viewed', { product_slug: 'kibble' }, '/products/kibble'],
    ['price_comparison_viewed', {}, null],
    ['product_spotted', { product_slug: 'kibble', shop_slug: 'sol' }, '/products/kibble'],
    ['product_spotted', { shop_slug: 'sol' }, '/shops/sol'],
    ['product_spotted', {}, null],
    ['homesick_activated', {}, '/nostalgia'],
    ['category_browsed', { category_slug: 'pet/food' }, '/search?category_slug=pet%2Ffood'],
    ['category_browsed', {}, '/search'],
    ['shop_language_noted', { shop_slug: 'sol' }, '/shops/sol'],
    ['shop_language_noted', {}, null],
    ['price_alert_set', { product_slug: 'kibble' }, '/products/kibble'],
    ['price_alert_set', {}, null],
    ['shop_discovered', { shop_slug: 'sol' }, '/shops/sol'],
    ['shop_discovered', {}, null],
    ['unknown_type', { shop_slug: 'x' }, null],
  ])('href for %s %j', (type, payload, expected) => {
    expect(eventToHref(ev(type as never, payload as ActivityEventPayload))).toBe(expected)
  })

  it('assertNoPii strips everything that is not whitelisted (e.g. email, user id, ip)', () => {
    const cleaned = assertNoPii({ term: 'x', city: 'Larnaca', email: 'a@b.io', user_id: 7, ip: '1.2.3.4' } as never)
    expect(cleaned).toEqual({ term: 'x', city: 'Larnaca' })
  })

  it('assertNoPii warns about stripped fields in development only', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'development')
    assertNoPii({ email: 'a@b.io' } as never)
    expect(warn).toHaveBeenCalledTimes(1)
    vi.stubEnv('NODE_ENV', 'production')
    assertNoPii({ email: 'a@b.io' } as never)
    expect(warn).toHaveBeenCalledTimes(1)
    vi.unstubAllEnvs()
    warn.mockRestore()
  })

  it('translation key follows the event type', () => {
    expect(eventToTranslationKey(ev('price_alert_set'))).toBe('activity_event_price_alert_set')
  })
})
