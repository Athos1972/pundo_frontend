import { getLangServer } from '@/lib/lang'
import { getCategories } from '@/lib/api'
import { getBrandFromHeaders } from '@/config/brands'
import { t } from '@/lib/translations'
import { Hero } from '@/components/layout/Hero'
import { CommunityCard } from '@/components/community/CommunityCard'
import { GuidesTeaser } from '@/components/guides/GuidesTeaser'
import { NearbyShops } from '@/components/shop/NearbyShops'
import { HomesickTeaser } from '@/components/home/HomesickTeaser'
import { ActivityFeed } from '@/components/activity-feed/ActivityFeed'
import { RecentlyViewedList } from '@/components/recently-viewed/RecentlyViewedList'

export default async function HomePage() {
  const lang = await getLangServer()
  const brand = await getBrandFromHeaders()
  const tr = t(lang)
  const categoriesData = await getCategories(
    { taxonomy_type: 'google', only_with_products: true },
    lang
  ).catch(() => ({ items: [] }))

  return (
    <div className="min-h-screen bg-bg">
      <Hero brand={brand} categories={categoriesData.items} lang={lang} />

      {/* F4700: Activity Feed — directly after Hero, before CommunityCard (AC-B5) */}
      <ActivityFeed brand={brand} lang={lang} />

      {brand.features.communityCard && <CommunityCard brand={brand} />}

      {brand.features.homesickTeaser && <HomesickTeaser brand={brand} lang={lang} />}

      {/* F4700: Recently Viewed — home variant (naidivse only, hides when empty) */}
      {brand.features.recentlyViewed === 'home' && (
        <section className="px-4 sm:px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-sm font-bold text-text mb-3">
              {tr.recently_viewed_heading}
            </h2>
            <RecentlyViewedList variant="home" lang={lang} />
          </div>
        </section>
      )}

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-6">
          <GuidesTeaser lang={lang} />
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="font-display text-xl font-bold text-text mb-5">
          {tr.nearby_shops}
        </h2>
        <NearbyShops lang={lang} />
      </main>
    </div>
  )
}
