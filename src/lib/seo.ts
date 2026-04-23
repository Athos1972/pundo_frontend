import { searchProducts, getShops } from '@/lib/api'

export function getSiteUrl(): string {
  return process.env.SITE_URL ?? 'https://pundo.cy'
}

export interface SlugEntry {
  slug: string
  lastModified?: string | null
}

const PAGE_LIMIT = 100  // backend max per request
// Backend SQLAlchemy-Pool: pool_size=5 + max_overflow=5 = 10 connections.
// Sitemap-Regen feuert bei ~12k Produkten ~125 Page-Requests; ohne Limit
// bombardieren die den Pool und alle anderen Requests sehen 500 (Incident
// 2026-04-22 21:21, ausgeloest durch ClaudeBot auf /sitemap.xml).
// 4 parallel laesst der App-Hauptverkehr noch genug Headroom.
const SITEMAP_CONCURRENCY = 4

async function chunkedAllSettled<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = []
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency).map(t => t())
    results.push(...(await Promise.allSettled(batch)))
  }
  return results
}

export async function getAllProductSlugs(): Promise<SlugEntry[]> {
  const first = await searchProducts({ limit: PAGE_LIMIT, offset: 0 }, 'en')
  const total = first.total
  const firstSlugs: SlugEntry[] = first.items.map(item => ({ slug: item.slug, lastModified: null }))

  if (total <= PAGE_LIMIT) return firstSlugs

  const pageCount = Math.ceil(total / PAGE_LIMIT)
  const offsets = Array.from({ length: pageCount - 1 }, (_, i) => (i + 1) * PAGE_LIMIT)

  const results = await chunkedAllSettled(
    offsets.map(offset => () => searchProducts({ limit: PAGE_LIMIT, offset }, 'en')),
    SITEMAP_CONCURRENCY,
  )

  const moreSlugs = results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof searchProducts>>> => r.status === 'fulfilled')
    .flatMap(r => r.value.items.map(item => ({ slug: item.slug, lastModified: null })))

  return [...firstSlugs, ...moreSlugs]
}

export async function getAllShopSlugs(): Promise<SlugEntry[]> {
  const first = await getShops({ limit: PAGE_LIMIT, offset: 0 }, 'en')
  const firstSlugs: SlugEntry[] = first.items.map(item => ({ slug: item.slug, lastModified: item.last_scraped ?? null }))

  // ShopListResponse has no `total` — paginate until a page comes back shorter than limit
  if (first.items.length < PAGE_LIMIT) return firstSlugs

  const moreSlugs: SlugEntry[] = []
  let offset = PAGE_LIMIT
  while (true) {
    const result = await getShops({ limit: PAGE_LIMIT, offset }, 'en')
    moreSlugs.push(...result.items.map(item => ({ slug: item.slug, lastModified: item.last_scraped ?? null })))
    if (result.items.length < PAGE_LIMIT) break
    offset += PAGE_LIMIT
  }

  return [...firstSlugs, ...moreSlugs]
}
