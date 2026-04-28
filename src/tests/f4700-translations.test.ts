// =============================================================================
// src/tests/f4700-translations.test.ts
//
// Verifies all F4700 translation keys are present and non-empty in all 6 langs.
// =============================================================================

import { describe, it, expect } from 'vitest'
import { t } from '@/lib/translations'

const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he']

const STRING_KEYS = [
  'recently_viewed_heading',
  'recently_viewed_tab_products',
  'recently_viewed_tab_shops',
  'recently_viewed_empty',
  'recently_viewed_clear',
  'recently_viewed_clear_confirm',
  'activity_feed_heading_naidivse',
  'activity_feed_empty_soon',
  'activity_feed_expand',
  'activity_feed_collapse',
  'time_just_now',
  'live_dot_aria',
] as const

const FUNCTION_KEYS = [
  'activity_event_search_performed',
  'activity_event_price_comparison_viewed',
  'activity_event_product_spotted',
  'activity_event_homesick_activated',
  'activity_event_category_browsed',
  'activity_event_shop_language_noted',
  'activity_event_price_alert_set',
  'activity_event_shop_discovered',
  'time_minutes_ago',
  'time_hours_ago',
] as const

describe('F4700 translation keys — all 6 languages', () => {
  for (const lang of LANGS) {
    describe(`${lang}`, () => {
      it('has all string keys present and non-empty', () => {
        const tr = t(lang)
        for (const key of STRING_KEYS) {
          const val = tr[key]
          expect(val, `${lang}: missing key "${key}"`).toBeTruthy()
          expect(typeof val, `${lang}: key "${key}" should be string`).toBe('string')
          expect((val as string).length, `${lang}: key "${key}" is empty`).toBeGreaterThan(0)
        }
      })

      it('has all function keys present and callable', () => {
        const tr = t(lang)
        for (const key of FUNCTION_KEYS) {
          const fn = tr[key]
          expect(fn, `${lang}: missing function key "${key}"`).toBeTruthy()
          expect(typeof fn, `${lang}: "${key}" should be a function`).toBe('function')
        }
      })

      it('activity_event_search_performed produces a non-empty string', () => {
        const tr = t(lang)
        const fn = tr.activity_event_search_performed
        const result = fn({ term: 'Pelmeni', city: 'Paphos' })
        expect(result).toBeTruthy()
        expect(result.length).toBeGreaterThan(0)
        // Privacy check: no user IDs or emails in output
        expect(result).not.toMatch(/user_id|email/i)
      })

      it('time_minutes_ago(5) produces a non-empty string', () => {
        const tr = t(lang)
        const result = tr.time_minutes_ago(5)
        expect(result).toBeTruthy()
        expect(result.length).toBeGreaterThan(0)
      })
    })
  }
})

describe('F4700 activity-events.ts', () => {
  it('eventToColorToken returns expected tokens', async () => {
    const { eventToColorToken } = await import('@/lib/activity-events')
    expect(eventToColorToken({ id: '1', event_type: 'search_performed', payload: {}, created_at: '' })).toBe('blue')
    expect(eventToColorToken({ id: '2', event_type: 'product_spotted', payload: {}, created_at: '' })).toBe('green')
    expect(eventToColorToken({ id: '3', event_type: 'homesick_activated', payload: {}, created_at: '' })).toBe('terracotta')
  })

  it('eventToHref produces correct URLs', async () => {
    const { eventToHref } = await import('@/lib/activity-events')
    expect(eventToHref({
      id: '1', event_type: 'search_performed', payload: { search_term: 'Nutella' }, created_at: ''
    })).toBe('/search?q=Nutella')

    expect(eventToHref({
      id: '2', event_type: 'product_spotted', payload: { product_slug: 'nutella-400g' }, created_at: ''
    })).toBe('/products/nutella-400g')

    expect(eventToHref({
      id: '3', event_type: 'homesick_activated', payload: {}, created_at: ''
    })).toBe('/nostalgia')

    expect(eventToHref({
      id: '4', event_type: 'shop_discovered', payload: { shop_slug: 'russkiy-magazin' }, created_at: ''
    })).toBe('/shops/russkiy-magazin')
  })

  it('assertNoPii strips unknown fields', async () => {
    const { assertNoPii } = await import('@/lib/activity-events')
    const payload = {
      product_name: 'Nutella',
      user_id: 'secret-123',     // NOT in whitelist
      city: 'Limassol',
      email: 'user@example.com', // NOT in whitelist
    }
    const cleaned = assertNoPii(payload as Parameters<typeof assertNoPii>[0])
    expect(cleaned).toHaveProperty('product_name')
    expect(cleaned).toHaveProperty('city')
    expect(cleaned).not.toHaveProperty('user_id')
    expect(cleaned).not.toHaveProperty('email')
  })
})
