import { searchProducts, getShops } from '@/lib/api'

export function getSiteUrl(): string {
  return process.env.SITE_URL ?? 'https://pundo.cy'
}

export interface SlugEntry {
  slug: string
  lastModified?: string | null
}

export async function getAllProductSlugs(): Promise<SlugEntry[]> {
  const slugs: SlugEntry[] = []
  const limit = 1000
  let offset = 0

  while (true) {
    const result = await searchProducts({ limit, offset }, 'en')
    for (const item of result.items) {
      slugs.push({ slug: item.slug, lastModified: null })
    }
    if (result.items.length < limit) break
    offset += limit
  }

  return slugs
}

export async function getAllShopSlugs(): Promise<SlugEntry[]> {
  const slugs: SlugEntry[] = []
  const limit = 1000
  let offset = 0

  while (true) {
    const result = await getShops({ limit, offset }, 'en')
    for (const item of result.items) {
      slugs.push({ slug: item.slug, lastModified: item.last_scraped ?? null })
    }
    if (result.items.length < limit) break
    offset += limit
  }

  return slugs
}
