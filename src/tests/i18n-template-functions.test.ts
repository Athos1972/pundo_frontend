import { describe, it, expect } from 'vitest'
import { t } from '@/lib/translations'
import { LANGS, isRTL } from '@/lib/lang'

// Function-valued translations (plurals, interpolation, activity-feed sentences) are not
// covered by the key-parity lint. They must work in every language, include every
// interpolated value and never leak "undefined"/"NaN"/"[object Object]" into the UI.

type Fn = (...args: unknown[]) => unknown
const fn = (lang: string, key: string): Fn => (t(lang) as unknown as Record<string, Fn>)[key]
const LEAKS = ['undefined', 'NaN', '[object', 'null']

const NUMERIC_ONE_ARG = [
  'days_ago', 'subcategories', 'distance_km', 'result_service_providers_in_view', 'result_service_providers_total',
  'time_minutes_ago', 'time_hours_ago', 'search_result_count', 'search_shops_outside_radius', 'shop_reviews_count',
  'shops_city_shop_count', 'shop_delivers_radius', 'tier_from', 'tier_show_all', 'guides_teaser_link', 'guide_readtime',
  'reviews_max_photos', 'reviews_based_on', 'trust_credits_earned', 'trust_level_label', 'trust_points',
  'community_vote_n_votes', 'community_vote_submit_success', 'charity_vote_count',
]
const STRING_ONE_ARG = [
  'search_shops_show_all', 'dropdown_all_results', 'shops_city_h1', 'shops_city_breadcrumb', 'price_trend_since',
  'oauth_consent_requesting', 'auth_otp_sent',
]

describe.each(LANGS as readonly string[])('template translations (%s)', (lang) => {
  it.each(NUMERIC_ONE_ARG)('%s renders the number for counts 0, 1, 2, 5 and 21', (key) => {
    for (const n of [0, 1, 2, 5, 21]) {
      const out = fn(lang, key)(n)
      expect(typeof out).toBe('string')
      expect(out as string).toContain(String(n))
      for (const bad of LEAKS) expect(out as string).not.toContain(bad)
    }
  })

  it.each(STRING_ONE_ARG)('%s includes the interpolated value', (key) => {
    const out = fn(lang, key)('Larnaca & Co') as string
    expect(out).toContain('Larnaca & Co')
    for (const bad of LEAKS) expect(out).not.toContain(bad)
  })

  it('footer copyright shows the year', () => {
    expect(fn(lang, 'footer_copyright')(2031)).toContain('2031')
  })

  it('multi-argument sentences include all values', () => {
    expect(fn(lang, 'search_similar_quota')(3, 10) as string).toMatch(/3[\s\S]*10|10[\s\S]*3/)
    const range = fn(lang, 'tier_range')(5, 9) as string
    expect(range).toContain('5')
    expect(range).toContain('9')
    const meta = fn(lang, 'shop_meta_description')('Cafe Sol', 'Larnaca', 'Cafe') as string
    for (const part of ['Cafe Sol', 'Larnaca']) expect(meta).toContain(part)
    const fallback = fn(lang, 'product_desc_fallback')('Kibble', 'Acme') as string
    expect(fallback).toContain('Kibble')
    const title = fn(lang, 'shops_city_title')('Larnaca', 7) as string
    expect(title).toContain('Larnaca')
    expect(title).toContain('7')
    const metaDesc = fn(lang, 'shops_city_meta_description')('Larnaca', 7) as string
    expect(metaDesc).toContain('Larnaca')
    const wp = fn(lang, 'whatsapp_message_product')('Kibble', 'pundo.cy') as string
    expect(wp).toContain('Kibble')
    expect(wp).toContain('pundo.cy')
    const ws = fn(lang, 'whatsapp_message_shop')('Cafe Sol', 'pundo.cy') as string
    expect(ws).toContain('Cafe Sol')
    expect(ws).toContain('pundo.cy')
  })

  const ACTIVITY: Array<[string, Record<string, string>]> = [
    ['activity_event_search_performed', { term: 'dog food', city: 'Larnaca' }],
    ['activity_event_price_comparison_viewed', { product_name: 'Kibble', city: 'Larnaca' }],
    ['activity_event_product_spotted', { product_name: 'Kibble', shop_name: 'Cafe Sol' }],  // sentence deliberately omits the city
    ['activity_event_homesick_activated', { city: 'Larnaca' }],
    ['activity_event_category_browsed', { category_name: 'Pets', city: 'Larnaca' }],
    ['activity_event_shop_language_noted', { shop_name: 'Cafe Sol' }],
    ['activity_event_price_alert_set', { product_name: 'Kibble' }],
    ['activity_event_shop_discovered', { shop_name: 'Cafe Sol', city: 'Larnaca' }],
  ]

  it.each(ACTIVITY)('%s mentions every provided value', (key, args) => {
    const out = fn(lang, key)(args) as string
    expect(typeof out).toBe('string')
    for (const v of Object.values(args)) expect(out).toContain(v)
  })

  it.each(ACTIVITY)('%s has three phrasing variants (_v 0/1/2) that all name the subject', (key, args) => {
    const subject = Object.values(args)[0]
    const outs = [0, 1, 2].map((_v) => fn(lang, key)({ ...args, _v }) as string)
    for (const out of outs) {
      expect(out.length).toBeGreaterThan(0)
      for (const bad of LEAKS) expect(out).not.toContain(bad)
    }
    // Homesick has no subject value besides the city, which every variant mentions
    for (const out of outs) expect(out).toContain(subject)
  })

  it.each(ACTIVITY)('%s survives missing values without leaking "undefined"', (key) => {
    const out = fn(lang, key)({}) as string
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
    for (const bad of LEAKS) expect(out).not.toContain(bad)
  })
})

describe('language metadata', () => {
  it('exactly ar and he are right-to-left', () => {
    expect((LANGS as readonly string[]).filter((l) => isRTL(l as never))).toEqual(['ar', 'he'])
  })
})
