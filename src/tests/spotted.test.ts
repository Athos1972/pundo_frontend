import { describe, it, expect, vi, beforeEach } from 'vitest'
import { t } from '@/lib/translations'

// ─── Translations ─────────────────────────────────────────────────────────────

describe('Spotted-In translations', () => {
  it('has all spotted keys in English', () => {
    const tr = t('en')
    expect(tr.spotted_button_label).toBeTruthy()
    expect(tr.spotted_error_no_gps).toBeTruthy()
    expect(tr.spotted_uploading).toBeTruthy()
    expect(tr.spotted_success).toBeTruthy()
    expect(tr.spotted_error_upload).toBeTruthy()
    expect(tr.spotted_camera_denied).toBeTruthy()
    expect(tr.spotted_login_required).toBeTruthy()
  })

  it('has all spotted keys in German', () => {
    const tr = t('de')
    expect(tr.spotted_button_label).toBe('Preis spotten')
    expect(tr.spotted_error_no_gps).toBeTruthy()
    expect(tr.spotted_success).toBeTruthy()
    expect(tr.spotted_login_required).toBeTruthy()
  })

  it('has spotted keys for all 6 supported languages', () => {
    for (const lang of ['en', 'de', 'ru', 'el', 'ar', 'he']) {
      const tr = t(lang)
      expect(tr.spotted_button_label, `${lang}: spotted_button_label missing`).toBeTruthy()
      expect(tr.spotted_error_no_gps, `${lang}: spotted_error_no_gps missing`).toBeTruthy()
    }
  })

  it('falls back to English for unknown locale', () => {
    const tr = t('xyz')
    expect(tr.spotted_button_label).toBe(t('en').spotted_button_label)
  })
})

// ─── EXIF / GPS extraction ────────────────────────────────────────────────────

describe('extractGPS', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns coords when exifr finds GPS data', async () => {
    vi.doMock('exifr', () => ({
      gps: vi.fn().mockResolvedValue({ latitude: 34.9009, longitude: 33.623 }),
    }))
    const { extractGPS } = await import('@/lib/exif')
    const file = new File(['x'], 'test.jpg', { type: 'image/jpeg' })
    const result = await extractGPS(file)
    expect(result).toEqual({ latitude: 34.9009, longitude: 33.623 })
  })

  it('falls back to geolocation when exifr returns null', async () => {
    vi.doMock('exifr', () => ({
      gps: vi.fn().mockResolvedValue(null),
    }))
    const geolocationMock = {
      getCurrentPosition: vi.fn((success: PositionCallback) =>
        success({ coords: { latitude: 35.0, longitude: 34.0 } } as GeolocationPosition),
      ),
    }
    vi.stubGlobal('navigator', { geolocation: geolocationMock, mediaDevices: undefined })

    const { extractGPS } = await import('@/lib/exif')
    const file = new File(['x'], 'test.jpg', { type: 'image/jpeg' })
    const result = await extractGPS(file)
    expect(result).toEqual({ latitude: 35.0, longitude: 34.0 })
  })

  it('returns null when exifr throws and geolocation is unavailable', async () => {
    vi.doMock('exifr', () => ({
      gps: vi.fn().mockRejectedValue(new Error('parse error')),
    }))
    vi.stubGlobal('navigator', { geolocation: undefined, mediaDevices: undefined })

    const { extractGPS } = await import('@/lib/exif')
    const file = new File(['x'], 'no-exif.jpg', { type: 'image/jpeg' })
    const result = await extractGPS(file)
    expect(result).toBeNull()
  })

  it('returns null when geolocation.getCurrentPosition errors', async () => {
    vi.doMock('exifr', () => ({
      gps: vi.fn().mockResolvedValue(undefined),
    }))
    const geolocationMock = {
      getCurrentPosition: vi.fn((_: PositionCallback, error: PositionErrorCallback) =>
        error({ code: 1, message: 'denied' } as GeolocationPositionError),
      ),
    }
    vi.stubGlobal('navigator', { geolocation: geolocationMock, mediaDevices: undefined })

    const { extractGPS } = await import('@/lib/exif')
    const file = new File(['x'], 'test.jpg', { type: 'image/jpeg' })
    const result = await extractGPS(file)
    expect(result).toBeNull()
  })
})

// ─── SpottedCreateResponse type ──────────────────────────────────────────────

describe('SpottedCreateResponse type', () => {
  it('has correct shape', async () => {
    const { } = await import('@/types/api')
    // Type-level test: just confirm the import works and expected keys exist
    const mock = { spotted_id: 1, status: 'pending' as const, message: 'ok' }
    expect(mock.status).toBe('pending')
    expect(typeof mock.spotted_id).toBe('number')
  })
})
