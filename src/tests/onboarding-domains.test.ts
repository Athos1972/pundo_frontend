import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getDomains, sortDomains, clearDomainsCache } from '@/lib/onboarding/domains'
import type { OnboardingDomain } from '@/types/shop-admin'

describe('domains.ts', () => {
  beforeEach(() => {
    clearDomainsCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    clearDomainsCache()
  })

  it('falls back to static list when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const domains = await getDomains('de', 'handwerker')
    expect(Array.isArray(domains)).toBe(true)
    expect(domains.length).toBeGreaterThan(0)
    expect(domains[0]).toHaveProperty('slug')
    expect(domains[0]).toHaveProperty('label')
    expect(domains[0]).toHaveProperty('specialties')
  })

  it('falls back to static list when fetch returns non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    const domains = await getDomains('en', 'gastro')
    expect(domains.length).toBeGreaterThan(0)
    // gastro domains should not have electrician domains
    const slugs = domains.map(d => d.slug)
    expect(slugs).not.toContain('elektriker')
  })

  it('uses backend data when fetch succeeds', async () => {
    const mockData: OnboardingDomain[] = [
      { slug: 'custom', label: 'Custom Domain', specialties: [] },
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ domains: mockData }),
    }))
    const domains = await getDomains('en', 'dienstleister')
    expect(domains).toEqual(mockData)
  })

  it('orders backend domains alphabetically in the registration language (F2970 AC11)', async () => {
    const apiOrder: OnboardingDomain[] = [
      { slug: 'photo', label: 'Φωτογράφος', specialties: [] },
      { slug: 'acc', label: 'Λογιστής', specialties: [] },
      { slug: 'hair', label: 'Κομμωτήριο', specialties: [] },
      { slug: 'alpha', label: 'Αρχιτέκτονας', specialties: [] },
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ domains: apiOrder }) }))
    const domains = await getDomains('el', 'dienstleister')
    expect(domains.map(d => d.label)).toEqual(['Αρχιτέκτονας', 'Κομμωτήριο', 'Λογιστής', 'Φωτογράφος'])
    // the cached result is sorted as well
    expect((await getDomains('el', 'dienstleister')).map(d => d.slug)).toEqual(['alpha', 'hair', 'acc', 'photo'])
  })

  it('sorts per language: same domains, different order in de and ru', async () => {
    const api: OnboardingDomain[] = [
      { slug: 'x', label: 'Ärzte', specialties: [] },
      { slug: 'y', label: 'Zahnarzt', specialties: [] },
      { slug: 'z', label: 'Bäcker', specialties: [] },
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ domains: api }) }))
    expect((await getDomains('de', 'gastro')).map(d => d.slug)).toEqual(['x', 'z', 'y'])
  })

  it('caches results across calls with the same lang+type', async () => {
    const mockData: OnboardingDomain[] = [
      { slug: 'cached', label: 'Cached', specialties: [] },
    ]
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ domains: mockData }) })
    vi.stubGlobal('fetch', mockFetch)
    await getDomains('de', 'haendler')
    await getDomains('de', 'haendler')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does not cache across different providerTypes', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ domains: [] as OnboardingDomain[] }),
    })
    vi.stubGlobal('fetch', mockFetch)
    await getDomains('de', 'handwerker')
    await getDomains('de', 'gastro')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('sortDomains sorts alphabetically by locale', () => {
    const unsorted: OnboardingDomain[] = [
      { slug: 'z', label: 'Zimmerer', specialties: [] },
      { slug: 'a', label: 'Architekt', specialties: [] },
      { slug: 'm', label: 'Maler', specialties: [] },
    ]
    const sorted = sortDomains(unsorted, 'de')
    expect(sorted[0].slug).toBe('a')
    expect(sorted[1].slug).toBe('m')
    expect(sorted[2].slug).toBe('z')
  })

  it('sortDomains does not mutate the original array', () => {
    const original: OnboardingDomain[] = [
      { slug: 'z', label: 'Z', specialties: [] },
      { slug: 'a', label: 'A', specialties: [] },
    ]
    sortDomains(original, 'en')
    expect(original[0].slug).toBe('z') // unchanged
  })

  it('fallback covers all 4 provider types', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const types = ['handwerker', 'dienstleister', 'haendler', 'gastro'] as const
    for (const type of types) {
      clearDomainsCache()
      const domains = await getDomains('en', type)
      expect(domains.length, `${type} should have fallback domains`).toBeGreaterThan(0)
    }
  })
})
