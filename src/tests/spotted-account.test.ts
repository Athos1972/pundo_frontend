import { describe, it, expect } from 'vitest'
import { t } from '@/lib/translations'
import type { SpottedUpload, SpottedListResponse } from '@/types/api'

// ─── Translation keys ─────────────────────────────────────────────────────────

describe('Spotted-In account view translations', () => {
  it('has all spotted_account keys in English', () => {
    const tr = t('en')
    expect(tr.spotted_account_title).toBeTruthy()
    expect(tr.spotted_account_status_pending).toBeTruthy()
    expect(tr.spotted_account_status_successful).toBeTruthy()
    expect(tr.spotted_account_status_rejected).toBeTruthy()
    expect(tr.spotted_account_empty).toBeTruthy()
    expect(tr.spotted_account_error_no_shop).toBeTruthy()
    expect(tr.spotted_account_error_vision_failed).toBeTruthy()
  })

  it('has all spotted_account keys in German', () => {
    const tr = t('de')
    expect(tr.spotted_account_title).toBeTruthy()
    expect(tr.spotted_account_status_pending).toBeTruthy()
    expect(tr.spotted_account_status_successful).toBeTruthy()
    expect(tr.spotted_account_status_rejected).toBeTruthy()
    expect(tr.spotted_account_empty).toBeTruthy()
    expect(tr.spotted_account_error_no_shop).toBeTruthy()
    expect(tr.spotted_account_error_vision_failed).toBeTruthy()
  })

  it('has spotted_account keys for all 6 supported languages', () => {
    for (const lang of ['en', 'de', 'ru', 'el', 'ar', 'he']) {
      const tr = t(lang)
      expect(tr.spotted_account_title, `${lang}: spotted_account_title missing`).toBeTruthy()
      expect(tr.spotted_account_status_pending, `${lang}: spotted_account_status_pending missing`).toBeTruthy()
      expect(tr.spotted_account_status_rejected, `${lang}: spotted_account_status_rejected missing`).toBeTruthy()
    }
  })
})

// ─── SpottedUpload type shape ─────────────────────────────────────────────────

describe('SpottedUpload type', () => {
  it('accepts pending status with no shop/product', () => {
    const upload: SpottedUpload = {
      spotted_id: 1,
      status: 'pending',
      created_at: '2026-04-19T10:00:00Z',
    }
    expect(upload.status).toBe('pending')
    expect(upload.shop).toBeUndefined()
  })

  it('accepts successful status with full details', () => {
    const upload: SpottedUpload = {
      spotted_id: 2,
      status: 'successful',
      created_at: '2026-04-19T10:00:00Z',
      shop: { shop_id: 10, shop_name: 'Alpha Mega' },
      product: { product_id: 5, product_name: 'Whiskas' },
      detected_price: 2.99,
      detected_currency: 'EUR',
    }
    expect(upload.shop?.shop_name).toBe('Alpha Mega')
    expect(upload.detected_price).toBe(2.99)
  })

  it('accepts rejected status with error_reason', () => {
    const upload: SpottedUpload = {
      spotted_id: 3,
      status: 'rejected',
      created_at: '2026-04-19T10:00:00Z',
      error_reason: 'no_shop',
    }
    expect(upload.status).toBe('rejected')
    expect(upload.error_reason).toBe('no_shop')
  })
})

// ─── SpottedListResponse type shape ──────────────────────────────────────────

describe('SpottedListResponse type', () => {
  it('has correct shape', () => {
    const response: SpottedListResponse = {
      spotted: [
        { spotted_id: 1, status: 'pending', created_at: '2026-04-19T10:00:00Z' },
      ],
      total: 1,
    }
    expect(response.spotted).toHaveLength(1)
    expect(response.total).toBe(1)
  })

  it('accepts empty list', () => {
    const response: SpottedListResponse = { spotted: [], total: 0 }
    expect(response.spotted).toHaveLength(0)
  })
})
