import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getSitemapSlugs = vi.fn()
vi.mock('@/lib/api', () => ({ getSitemapSlugs: () => getSitemapSlugs() }))

const SLUGS = {
  products: [{ slug: 'p1' }],
  shops: [{ slug: 's1', last_scraped: '2026-10-01' }],
}

async function loadSeo() {
  vi.resetModules()
  return import('@/lib/seo')
}

describe('getSitemap — Prozess-Cache (Antwort > 2 MB, kein Data-Cache)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    getSitemapSlugs.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('lädt innerhalb der TTL nur einmal, auch bei parallelen Aufrufen', async () => {
    getSitemapSlugs.mockResolvedValue(SLUGS)
    const { getSitemap } = await loadSeo()

    const [a, b] = await Promise.all([getSitemap(), getSitemap()])
    await getSitemap()

    expect(getSitemapSlugs).toHaveBeenCalledTimes(1)
    expect(a).toEqual({
      products: [{ slug: 'p1', lastModified: null }],
      shops: [{ slug: 's1', lastModified: '2026-10-01' }],
    })
    expect(b).toBe(a)
  })

  it('lädt nach Ablauf der TTL (1 h) neu', async () => {
    getSitemapSlugs.mockResolvedValue(SLUGS)
    const { getSitemap } = await loadSeo()

    await getSitemap()
    vi.advanceTimersByTime(60 * 60 * 1000 + 1)
    await getSitemap()

    expect(getSitemapSlugs).toHaveBeenCalledTimes(2)
  })

  it('cacht fehlgeschlagene Loads nicht', async () => {
    getSitemapSlugs.mockRejectedValueOnce(new Error('backend down')).mockResolvedValue(SLUGS)
    const { getSitemap } = await loadSeo()

    await expect(getSitemap()).rejects.toThrow('backend down')
    const data = await getSitemap()

    expect(getSitemapSlugs).toHaveBeenCalledTimes(2)
    expect(data.products).toHaveLength(1)
  })
})
