// CharityHomepageSection — F3800 Phase 2
// Server Component: loads approved charity shops + vote aggregates + charity guides,
// renders heading/intro/shop-carousel/guide-roll/CTA.
// Returns null when both shops and guides are empty (graceful, AC-06).

import Link from 'next/link'
import type { ShopListItem, ShopVotesResponse } from '@/types/api'
import { getShops } from '@/lib/api'
import { getCharityGuides } from '@/lib/guides'
import { tHome } from '@/lib/i18n/home'
import { tGuides } from '@/lib/i18n/guides'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import { CharityShopCarousel } from './CharityShopCarousel'
import { GuideCard } from '@/components/guides/GuideCard'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'

/** Fetch vote aggregates for a single shop with a 1-hour revalidate cache.
 *  Returns vote_count for attribute_type='charity', or 0 if not present / error. */
async function fetchCharityVoteCount(shopId: number, lang: string): Promise<number> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/shops/${shopId}/votes`, {
      headers: { 'Accept-Language': lang },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return 0
    const data = (await res.json()) as ShopVotesResponse
    const charityAggregate = data.aggregates.find((a) => a.attribute_type === 'charity')
    return charityAggregate?.vote_count ?? 0
  } catch {
    return 0
  }
}

interface ShopWithVotes {
  shop: ShopListItem
  charityVoteCount: number
}

type Props = { lang: string }

export async function CharityHomepageSection({ lang }: Props) {
  const trHome = tHome(lang)
  const trGuides = tGuides(lang)

  // Load approved charity shops (limit 50 for sorting)
  const shopsResult = await getShops({ is_charity_supporter: true, limit: 50, status: 'active' }, lang).catch(() => ({ items: [] }))
  const approvedShops = shopsResult.items

  // Load charity guides
  const charityGuides = getCharityGuides(lang)

  // Return null when both are empty (AC-06, E1)
  if (approvedShops.length === 0 && charityGuides.length === 0) return null

  // Fetch vote counts in parallel (revalidate:3600, not no-store — R1 mitigation)
  const shopsWithVotes: ShopWithVotes[] = await Promise.all(
    approvedShops.map(async (shop) => ({
      shop,
      charityVoteCount: await fetchCharityVoteCount(shop.id, lang),
    }))
  )

  // Sort: vote_count desc → recency (last_scraped desc) → id desc (R3)
  shopsWithVotes.sort((a, b) => {
    if (b.charityVoteCount !== a.charityVoteCount) return b.charityVoteCount - a.charityVoteCount
    const aDate = a.shop.last_scraped ?? ''
    const bDate = b.shop.last_scraped ?? ''
    if (bDate !== aDate) return bDate < aDate ? -1 : 1
    return b.shop.id - a.shop.id
  })

  // Top 10 for carousel (AC-07)
  const top10Shops = shopsWithVotes.slice(0, 10).map((s) => s.shop)

  const categoryLabels: Record<string, string> = {
    behörden: trGuides.category_behörden,
    mobilität: trGuides.category_mobilität,
    haustiere: trGuides.category_haustiere,
    gesundheit: trGuides.category_gesundheit,
    wohnen: trGuides.category_wohnen,
    finanzen: trGuides.category_finanzen,
    plattform: trGuides.category_plattform,
    gemeinschaft: trGuides.category_gemeinschaft,
  }

  return (
    <section className="py-10" aria-label={trHome.charity_section_heading}>
      <div className="max-w-6xl mx-auto px-6 space-y-6">
        {/* Heading + Intro */}
        <div>
          <h2 className="font-display text-xl font-bold text-text rtl:text-right">
            {trHome.charity_section_heading}
          </h2>
          <p className="text-sm text-text-muted mt-1 rtl:text-right">
            {trHome.charity_section_intro}
          </p>
        </div>

        {/* Shop Carousel */}
        {top10Shops.length > 0 && (
          <CharityShopCarousel shops={top10Shops} lang={lang} />
        )}

        {/* Guide Roll */}
        {charityGuides.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-display text-base font-semibold text-text rtl:text-right">
              {trHome.charity_section_guides_heading}
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {charityGuides.map((guide) => (
                <GuideCard
                  key={`${guide.slug}-${guide.lang}`}
                  guide={guide}
                  href={localePath(lang as Lang, `/guides/${guide.slug}`)}
                  variant="teaser"
                  categoryLabel={categoryLabels[guide.category] ?? guide.category}
                />
              ))}
            </div>
          </div>
        )}

        {/* CTA — links to ehrenamt-zypern guide (AC-09) */}
        <div>
          <Link
            href={localePath(lang as Lang, '/guides/ehrenamt-zypern')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:opacity-80 rtl:flex-row-reverse"
          >
            {trHome.charity_section_cta}
          </Link>
        </div>
      </div>
    </section>
  )
}
