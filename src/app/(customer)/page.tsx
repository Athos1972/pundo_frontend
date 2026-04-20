import { getLangServer } from '@/lib/lang'
import { getCategories } from '@/lib/api'
import { getBrandFromHeaders } from '@/config/brands'
import { t } from '@/lib/translations'
import { Hero } from '@/components/layout/Hero'
import { CommunityCard } from '@/components/community/CommunityCard'
import { GuidesTeaser } from '@/components/guides/GuidesTeaser'
import { NearbyShops } from '@/components/shop/NearbyShops'

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

      {brand.features.communityCard && <CommunityCard brand={brand} />}

      <section className="px-6 py-10">
        <div className="max-w-6xl mx-auto">
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
